import 'dotenv/config'

const TOKEN_URL =
  process.env.OAUTH_TOKEN_URL ||
  'http://25.42.182.119:32001/baseCenter/oauth2/accessToken'
const REQUEST_TIMEOUT_MS = Number(process.env.PROXY_REQUEST_TIMEOUT_MS || 30000)

const tokenRequestPayload = {
  grant_type: process.env.OAUTH_GRANT_TYPE || 'client_credentials',
  client_secret:
    process.env.OAUTH_CLIENT_SECRET ||
    'fkUguk7Yks40HvxNMJbVioHNtusgthzRNZlyr+NublwWSadcX0we2wffjyTUYGsK',
  client_id: process.env.OAUTH_CLIENT_ID || 'JBbfcd7502b4ea43ad9a2ba821148c39',
}

const maskToken = (token = '') => {
  if (!token) {
    return ''
  }
  if (token.length <= 16) {
    return `${token.slice(0, 4)}***${token.slice(-2)}`
  }
  return `${token.slice(0, 8)}...${token.slice(-6)}`
}

const main = async () => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    console.log(`[token-test] request url: ${TOKEN_URL}`)
    console.log(`[token-test] payload.client_id: ${tokenRequestPayload.client_id}`)
    console.log(`[token-test] payload.grant_type: ${tokenRequestPayload.grant_type}`)

    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tokenRequestPayload),
      signal: controller.signal,
    })

    console.log(`[token-test] http status: ${response.status}`)

    const rawBody = await response.text()
    let data = null

    try {
      data = rawBody ? JSON.parse(rawBody) : null
    } catch {
      data = null
    }

    if (!response.ok) {
      console.error('[token-test] request failed (non-2xx).')
      console.error('[token-test] raw response:', rawBody)
      process.exit(1)
    }

    if (!data) {
      console.error('[token-test] response is not valid JSON.')
      console.error('[token-test] raw response:', rawBody)
      process.exit(1)
    }

    console.log('[token-test] response.status field:', data.status ?? '<undefined>')
    console.log('[token-test] response.message/errors:', data.message || data.errors || '<empty>')

    if (data.status && data.status !== '000000') {
      console.error('[token-test] token api status is not 000000.')
      console.error('[token-test] full response:', JSON.stringify(data, null, 2))
      process.exit(1)
    }

    if (!data.access_token) {
      console.error('[token-test] access_token is missing.')
      console.error('[token-test] full response:', JSON.stringify(data, null, 2))
      process.exit(1)
    }

    console.log('[token-test] success: access_token acquired.')
    console.log(`[token-test] token(masked): ${maskToken(data.access_token)}`)
    console.log(`[token-test] expires_in: ${data.expires_in}`)
    console.log(`[token-test] refresh_token(masked): ${maskToken(data.refresh_token || '')}`)
  } catch (error) {
    console.error('[token-test] request error:', error?.message || error)
    process.exit(1)
  } finally {
    clearTimeout(timer)
  }
}

main()
