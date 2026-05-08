import 'dotenv/config'
import { createClient } from 'redis'

const tokenCacheKey = process.env.TOKEN_CACHE_KEY || 'base_center:access_token'
const testKey = `${tokenCacheKey}:connectivity_test`

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

const displayRedisTarget = () => {
  if (process.env.REDIS_URL) {
    const safeUrl = process.env.REDIS_URL.replace(/:\/\/(.*)@/, '://***@')
    return `REDIS_URL=${safeUrl}`
  }

  return `host=${process.env.REDIS_HOST || '127.0.0.1'} port=${Number(
    process.env.REDIS_PORT || 6379,
  )} db=${Number(process.env.REDIS_DB || 0)}`
}

const main = async () => {
  redisClient.on('error', (error) => {
    console.error('[redis-test] client error:', error?.message || error)
  })

  try {
    console.log(`[redis-test] target: ${displayRedisTarget()}`)
    console.log(`[redis-test] token cache key: ${tokenCacheKey}`)

    await redisClient.connect()
    console.log('[redis-test] connect: ok')

    const pong = await redisClient.ping()
    console.log(`[redis-test] ping: ${pong}`)

    const value = `ok_${Date.now()}`
    await redisClient.set(testKey, value, { EX: 60 })
    console.log(`[redis-test] set: ${testKey}`)

    const readBack = await redisClient.get(testKey)
    const ttl = await redisClient.ttl(testKey)
    console.log(`[redis-test] get: ${readBack}`)
    console.log(`[redis-test] ttl: ${ttl}`)

    if (readBack !== value) {
      throw new Error('set/get mismatch')
    }
    if (!(ttl > 0)) {
      throw new Error('ttl is not positive after set EX')
    }

    const tokenExists = (await redisClient.exists(tokenCacheKey)) === 1
    const tokenTtl = tokenExists ? await redisClient.ttl(tokenCacheKey) : -2
    console.log(`[redis-test] token exists: ${tokenExists}`)
    console.log(`[redis-test] token ttl: ${tokenTtl}`)

    await redisClient.del(testKey)
    console.log('[redis-test] cleanup: ok')
    console.log('[redis-test] result: PASS')
  } catch (error) {
    console.error('[redis-test] result: FAIL')
    console.error('[redis-test] reason:', error?.message || error)
    process.exitCode = 1
  } finally {
    if (redisClient.isOpen) {
      await redisClient.quit()
    }
  }
}

main()
