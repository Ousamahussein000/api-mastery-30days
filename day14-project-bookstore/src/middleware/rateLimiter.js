const { rateLimit } = require('express-rate-limit')
const { RedisStore } = require('rate-limit-redis')
const Redis = require('ioredis')

// connect to Redis running in Docker on port 6379
const redis = new Redis({
    host: 'localhost',
    port: 6379
})

redis.on('connect', () => console.log('Redis connected'))
redis.on('error', (err) => {
    console.error('Redis error:', err)
    // in production: alert monitoring, fallback to memory store
})

// global limiter — applies to all routes as a safety net
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,                  // 100 requests per window
    standardHeaders: true,     // sends RateLimit-* headers to client
    legacyHeaders: false,      // disables old X-RateLimit-* headers
    store: new RedisStore({
        sendCommand: (...args) => redis.call(...args) // tells rate-limit-redis to use ioredis
    }),
    message: {
        status: 429,
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later'
    }
})

// auth limiter — strict, protects against brute force on login/register
const authLimiter = rateLimit({
    windowMs: 3 * 60 * 1000,
    max: 5,                    // only 5 attempts per 15 minutes
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
        sendCommand: (...args) => redis.call(...args)
    }),
    message: {
        status: 429,
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many login attempts, please try again in 15 minutes'
    }
})

// public limiter — lenient, for public read routes
const publicLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,                  // more generous for public browsing
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
        sendCommand: (...args) => redis.call(...args)
    }),
    message: {
        status: 429,
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests'
    }
})

module.exports = { globalLimiter, authLimiter, publicLimiter }