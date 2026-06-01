const Redis = require('ioredis')

const redis = new Redis({
    host: 'localhost',
    port: 6379
})

redis.on('connect', () => console.log('Redis cache connected'))
redis.on('error', (err) => console.error('Redis cache error:', err))

const getVersion = async (namespace) => {
    const version = await redis.get(`version:${namespace}`)
    return version || '1'
}

// increment version — makes all old keys unreachable
// old keys expire naturally via TTL — no deletion needed
const invalidate = async (namespace) => {
    await redis.incr(`version:${namespace}`)
}

module.exports = { redis, getVersion, invalidate }