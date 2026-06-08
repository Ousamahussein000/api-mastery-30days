require('dotenv').config()
const express = require('express')
const { ErrorCodes } = require('./errors')
const { PrismaClientKnownRequestError } = require('@prisma/client/runtime/library')
const { globalLimiter } = require('./middleware/rateLimiter')

const app = express()

// --- Global middleware ---
app.use(express.json())
app.use(require('./middleware/logger'))
app.use((req, res, next) => {
    if (req.path.startsWith('/v1/auth')) return next()
    globalLimiter(req, res, next)
})
console.log('NODE_ENV:', process.env.NODE_ENV)

// --- Health check ---
app.get('/', (req, res) => {
    res.json({ name: 'Bookstore API', version: 'v1', status: 'running' })
})
// only apply rate limiting outside of test environment
if (process.env.NODE_ENV !== 'test') {
    app.use((req, res, next) => {
        if (req.path.startsWith('/v1/auth')) return next()
        globalLimiter(req, res, next)
    })
}

// --- Routes ---
app.use('/v1/auth', require('./routes/auth'))
app.use('/v1/books', require('./routes/books'))
app.use('/v1/authors', require('./routes/authors'))
app.use('/v1/categories', require('./routes/categories'))
app.use('/v1/orders', require('./routes/orders'))

// --- 404 handler ---
app.use(require('./middleware/notFound'))

// --- Global error handler ---
app.use((err, req, res, next) => {
    if (err instanceof PrismaClientKnownRequestError) {
        if (err.code === 'P2025') {
            return res.status(404).json({
                status: 404, code: 'NOT_FOUND',
                message: 'Record not found',
                timestamp: new Date().toISOString(), path: req.path
            })
        }
        if (err.code === 'P2002') {
            return res.status(409).json({
                status: 409, code: 'CONFLICT',
                message: 'A record with this value already exists',
                timestamp: new Date().toISOString(), path: req.path
            })
        }
        if (err.code === 'P2003') {
            return res.status(409).json({
                status: 409, code: 'CONFLICT',
                message: 'Related record not found',
                timestamp: new Date().toISOString(), path: req.path
            })
        }
    }

    const status = err.status || 500
    const code = err.code || ErrorCodes.INTERNAL_ERROR
    const message = err.status ? err.message : 'An unexpected error occurred'

    const response = {
        status, code, message,
        timestamp: new Date().toISOString(),
        path: req.path
    }

    if (err.details) response.details = err.details
    if (process.env.NODE_ENV === 'development' && !err.status) {
        response.stack = err.stack
    }

    res.status(status).json(response)
})

module.exports = app  // ← exported for tests