import 'dotenv/config'
import express from 'express'
import { createClient } from 'redis'

const PORT = Number(process.env.PROXY_SERVER_PORT || 32002)
const API_BASE_URL = process.env.PROXY_UPSTREAM_BASE_URL || 'http://25.42.182.119:32001'
const TOKEN_URL =
  process.env.OAUTH_TOKEN_URL ||
  'http://25.42.182.119:32001/baseCenter/oauth2/accessToken'
const TOKEN_CACHE_KEY = process.env.TOKEN_CACHE_KEY || 'base_center:access_token'
const TOKEN_HEADER_NAME = process.env.TOKEN_HEADER_NAME || 'x-token'
const TOKEN_HEADER_PREFIX = String(process.env.TOKEN_HEADER_PREFIX || '').trim()
const TOKEN_HEADER_PREFIX_FALLBACKS = String(process.env.TOKEN_HEADER_PREFIX_FALLBACKS || 'Bearer')
  .split(',')
  .map((item) => item.trim())
  .filter((item, index, list) => item !== TOKEN_HEADER_PREFIX && list.indexOf(item) === index)
const TOKEN_EARLY_EXPIRE_SECONDS = Number(process.env.TOKEN_EARLY_EXPIRE_SECONDS || 120)
const REQUEST_TIMEOUT_MS = Number(process.env.PROXY_REQUEST_TIMEOUT_MS || 30000)
const AUTH_RETRY_STATUS_CODES = new Set(
  String(process.env.AUTH_RETRY_STATUS_CODES || '401,403,420')
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item)),
)

const tokenRequestPayload = {
  grant_type: process.env.OAUTH_GRANT_TYPE || 'client_credentials',
  client_secret:
    process.env.OAUTH_CLIENT_SECRET ||
    'fkUguk7Yks40HvxNMJbVioHNtusgthzRNZlyr+NublwWSadcX0we2wffjyTUYGsK',
  client_id: process.env.OAUTH_CLIENT_ID || 'JBbfcd7502b4ea43ad9a2ba821148c39',
}

const redisClient = (() => {
  if (process.env.REDIS_URL) {
    return createClient({ url: process.env.REDIS_URL })
  }

  return createClient({
    socket: {
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: Number(process.env.REDIS_PORT || 6379),
    },
    password: process.env.REDIS_PASSWORD || undefined,
    database: Number(process.env.REDIS_DB || 0),
  })
})()

redisClient.on('error', (error) => {
  console.error('[redis] error:', error?.message || error)
})

let redisConnectPromise = null
let tokenRefreshPromise = null

const maskToken = (token = '') => {
  if (!token) {
    return ''
  }
  if (token.length <= 16) {
    return `${token.slice(0, 4)}***${token.slice(-2)}`
  }
  return `${token.slice(0, 8)}...${token.slice(-6)}`
}

const ensureRedisConnected = async () => {
  if (redisClient.isOpen) {
    return
  }

  if (!redisConnectPromise) {
    redisConnectPromise = redisClient.connect().finally(() => {
      redisConnectPromise = null
    })
  }

  await redisConnectPromise
}

const buildTargetUrl = (originalUrl) => {
  return new URL(originalUrl, API_BASE_URL).toString()
}

const buildTokenHeader = (token, tokenPrefix = TOKEN_HEADER_PREFIX) => {
  if (!TOKEN_HEADER_NAME) {
    return {}
  }

  const prefix = String(tokenPrefix || '').trim()
  return {
    [TOKEN_HEADER_NAME]: prefix ? `${prefix} ${token}` : token,
  }
}

const buildForwardHeaders = (incomingHeaders, token, tokenPrefix = TOKEN_HEADER_PREFIX) => {
  const blocked = new Set([
    'host',
    'connection',
    'content-length',
    'transfer-encoding',
    'accept-encoding',
    TOKEN_HEADER_NAME.toLowerCase(),
  ])
  const headers = {}

  for (const [name, value] of Object.entries(incomingHeaders)) {
    const lowerName = name.toLowerCase()
    if (blocked.has(lowerName) || value === undefined) {
      continue
    }
    headers[name] = Array.isArray(value) ? value.join(',') : String(value)
  }

  return {
    ...headers,
    ...buildTokenHeader(token, tokenPrefix),
  }
}

const normalizeExpiresIn = (value) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 7200
  }
  return parsed
}

const fetchAccessToken = async () => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    console.log('[token] requesting new access token from oauth api')
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tokenRequestPayload),
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`token api http ${response.status}`)
    }

    const data = await response.json()
    if (data?.status && data.status !== '000000') {
      throw new Error(data?.errors || data?.message || 'token api returned failed status')
    }
    if (!data?.access_token) {
      throw new Error('token api missing access_token')
    }

    const expiresIn = normalizeExpiresIn(data.expires_in)
    const ttl = Math.max(30, expiresIn - TOKEN_EARLY_EXPIRE_SECONDS)

    await ensureRedisConnected()
    await redisClient.set(TOKEN_CACHE_KEY, data.access_token, {
      EX: ttl,
    })
    console.log(
      `[token] refreshed and cached, key=${TOKEN_CACHE_KEY}, ttl=${ttl}s, token=${maskToken(data.access_token)}`,
    )

    return data.access_token
  } finally {
    clearTimeout(timer)
  }
}

const getAccessToken = async (forceRefresh = false) => {
  await ensureRedisConnected()

  if (!forceRefresh) {
    const cachedToken = await redisClient.get(TOKEN_CACHE_KEY)
    if (cachedToken) {
      console.log(`[token] cache hit, key=${TOKEN_CACHE_KEY}, token=${maskToken(cachedToken)}`)
      return cachedToken
    }
    console.log(`[token] cache miss, key=${TOKEN_CACHE_KEY}`)
  }

  if (!tokenRefreshPromise) {
    tokenRefreshPromise = fetchAccessToken().finally(() => {
      tokenRefreshPromise = null
    })
  }

  return tokenRefreshPromise
}

const forwardOnce = async (req, token, tokenPrefix = TOKEN_HEADER_PREFIX) => {
  const method = String(req.method || 'GET').toUpperCase()
  const hasBody = method !== 'GET' && method !== 'HEAD'
  const targetUrl = buildTargetUrl(req.originalUrl)
  const headers = buildForwardHeaders(req.headers, token, tokenPrefix)
  const body =
    hasBody && (Buffer.isBuffer(req.body) || typeof req.body === 'string') ? req.body : undefined

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    return await fetch(targetUrl, {
      method,
      headers,
      body,
      signal: controller.signal,
      redirect: 'manual',
    })
  } finally {
    clearTimeout(timer)
  }
}

const sendUpstreamResponse = async (res, upstreamResponse) => {
  const blocked = new Set(['connection', 'transfer-encoding', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer', 'upgrade'])
  upstreamResponse.headers.forEach((value, key) => {
    if (!blocked.has(key.toLowerCase())) {
      res.setHeader(key, value)
    }
  })

  const payload = Buffer.from(await upstreamResponse.arrayBuffer())
  res.status(upstreamResponse.status).send(payload)
}

const app = express()
app.use(express.raw({ type: '*/*', limit: '10mb' }))

app.get('/health', async (_req, res) => {
  try {
    await ensureRedisConnected()
    await redisClient.ping()
    const tokenExists = (await redisClient.exists(TOKEN_CACHE_KEY)) === 1
    const tokenTtlSeconds = tokenExists ? await redisClient.ttl(TOKEN_CACHE_KEY) : -2
    res.json({
      status: 'ok',
      tokenCacheKey: TOKEN_CACHE_KEY,
      tokenExists,
      tokenTtlSeconds,
    })
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error?.message || 'health check failed',
    })
  }
})

app.use('/realMeasCenter', async (req, res) => {
  try {
    let token = await getAccessToken(false)
    if (!token) {
      throw new Error('empty access token, skip forwarding request')
    }
    let upstreamResponse = await forwardOnce(req, token)
    console.log(
      `[proxy] ${req.method} ${req.originalUrl} -> ${upstreamResponse.status}, prefix=${
        TOKEN_HEADER_PREFIX || '<empty>'
      }`,
    )

    if (AUTH_RETRY_STATUS_CODES.has(upstreamResponse.status)) {
      console.warn(
        `[proxy] upstream returned ${upstreamResponse.status}, force refresh token and retry once`,
      )
      token = await getAccessToken(true)
      upstreamResponse = await forwardOnce(req, token)
      console.log(
        `[proxy] retry ${req.method} ${req.originalUrl} -> ${upstreamResponse.status}, prefix=${
          TOKEN_HEADER_PREFIX || '<empty>'
        }`,
      )
    }

    if (AUTH_RETRY_STATUS_CODES.has(upstreamResponse.status) && TOKEN_HEADER_PREFIX_FALLBACKS.length > 0) {
      for (const fallbackPrefix of TOKEN_HEADER_PREFIX_FALLBACKS) {
        console.warn(
          `[proxy] auth status still ${upstreamResponse.status}, retry with fallback prefix=${
            fallbackPrefix || '<empty>'
          }`,
        )
        upstreamResponse = await forwardOnce(req, token, fallbackPrefix)
        console.log(
          `[proxy] fallback retry ${req.method} ${req.originalUrl} -> ${upstreamResponse.status}, prefix=${
            fallbackPrefix || '<empty>'
          }`,
        )
        if (!AUTH_RETRY_STATUS_CODES.has(upstreamResponse.status)) {
          break
        }
      }
    }

    await sendUpstreamResponse(res, upstreamResponse)
  } catch (error) {
    res.status(500).json({
      status: 'PROXY_ERROR',
      message: error?.message || 'proxy request failed',
    })
  }
})

const start = async () => {
  await ensureRedisConnected()
  app.listen(PORT, () => {
    console.log(`[proxy] listening on http://0.0.0.0:${PORT}`)
    console.log(`[proxy] upstream: ${API_BASE_URL}`)
    console.log(`[proxy] token url: ${TOKEN_URL}`)
    console.log(`[proxy] redis key: ${TOKEN_CACHE_KEY}`)
    console.log(`[proxy] token header: ${TOKEN_HEADER_NAME}`)
    console.log(`[proxy] token prefix: ${TOKEN_HEADER_PREFIX || '<empty>'}`)
    console.log(
      `[proxy] token fallback prefixes: ${
        TOKEN_HEADER_PREFIX_FALLBACKS.length ? TOKEN_HEADER_PREFIX_FALLBACKS.join(', ') : '<none>'
      }`,
    )
  })
}

start().catch((error) => {
  console.error('[proxy] startup failed:', error?.message || error)
  process.exit(1)
})
