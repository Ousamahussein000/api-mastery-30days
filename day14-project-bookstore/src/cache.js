const Redis = require('ioredis')

const redis = new Redis({
    host: 'localhost',
    port: 6379
})

redis.on('connect', () => console.log('Redis cache connected'))
redis.on('error', (err) => console.error('Redis cache error:', err))

module.exports = redis