import { getToken, forceRefreshToken } from './auth'

const DEFAULT_TIMEOUT = 15000

const buildUrlWithQuery = (url, query = {}) => {
  const searchParams = new URLSearchParams()

  Object.entries(query || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return
    }

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null && item !== '') {
          searchParams.append(key, String(item))
        }
      })
      return
    }

    searchParams.append(key, String(value))
  })

  const queryString = searchParams.toString()
  if (!queryString) {
    return url
  }

  return `${url}${url.includes('?') ? '&' : '?'}${queryString}`
}

const createTimeoutSignal = (timeout) => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timer),
  }
}

const doFetch = async (url, payload = {}, options = {}) => {
  const { timeout = DEFAULT_TIMEOUT, headers = {}, method = 'POST' } = options
  const upperMethod = String(method || 'POST').toUpperCase()
  const isGet = upperMethod === 'GET'
  const requestUrl = isGet ? buildUrlWithQuery(url, payload) : url
  const { signal, clear } = createTimeoutSignal(timeout)

  const fetchWithToken = async (token) => {
    const requestInit = {
      method: upperMethod,
      headers: {
        'Authorization': token,
        ...headers,
      },
      signal,
    }

    if (!isGet) {
      requestInit.headers['Content-Type'] = 'application/json'
      requestInit.body = JSON.stringify(payload || {})
    }

    return fetch(requestUrl, requestInit)
  }

  try {
    const token = await getToken()
    const response = await fetchWithToken(token)

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        const retryToken = await forceRefreshToken()
        const retryResponse = await fetchWithToken(retryToken)
        if (!retryResponse.ok) {
          throw new Error(`HTTP ${retryResponse.status}`)
        }
        return await retryResponse.json()
      }

      let detail = ''
      const contentType = response.headers.get('content-type') || ''

      if (contentType.includes('application/json')) {
        try {
          const errorJson = await response.json()
          detail =
            errorJson?.message ||
            errorJson?.errors ||
            errorJson?.error ||
            errorJson?.msg ||
            ''
        } catch {
          detail = ''
        }
      } else {
        try {
          detail = (await response.text()).trim()
        } catch {
          detail = ''
        }
      }

      throw new Error(detail ? `HTTP ${response.status}: ${detail}` : `HTTP ${response.status}`)
    }

    const data = await response.json()

    if ((data?.code !== undefined && Number(data.code) !== 0) || data?.success === false) {
      throw new Error(data?.message || '接口返回失败')
    }

    if (data?.status && data.status !== '000000') {
      throw new Error(data?.message || '接口返回失败')
    }

    return data
  } finally {
    clear()
  }
}

export const postJson = (url, payload = {}, options = {}) =>
  doFetch(url, payload, { ...options, method: 'POST' })

export const getJson = (url, query = {}, options = {}) =>
  doFetch(url, query, { ...options, method: 'GET' })
