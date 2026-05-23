require('dotenv').config()
const express = require('express')
const { ErrorCodes } = require('./src/errors')
const { PrismaClientKnownRequestError } = require('@prisma/client/runtime/library')

const app = express()

// --- Process safety nets ---
process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason)
})
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err)
    process.exit(1)
})

// --- Global middleware ---
app.use(express.json())
app.use(require('./src/middleware/logger'))

// --- Health check ---
app.get('/', (req, res) => {
    res.json({ name: 'Bookstore API', version: 'v1', status: 'running' })
})

// --- Routes ---
app.use('/v1/auth', require('./src/routes/auth'))
app.use('/v1/books', require('./src/routes/books'))
app.use('/v1/authors', require('./src/routes/authors'))
app.use('/v1/categories', require('./src/routes/categories'))
app.use('/v1/orders', require('./src/routes/orders'))

// --- 404 handler ---
app.use(require('./src/middleware/notFound'))

// --- Global error handler ---
app.use((err, req, res, next) => {
    console.log('ERROR:', err)
    // Prisma known errors
    if (err instanceof PrismaClientKnownRequestError) {
        if (err.code === 'P2025') {
            return res.status(404).json({
                status: 404,
                code: 'NOT_FOUND',
                message: 'Record not found',
                timestamp: new Date().toISOString(),
                path: req.path
            })
        }
        if (err.code === 'P2002') {
            return res.status(409).json({
                status: 409,
                code: 'CONFLICT',
                message: 'A record with this value already exists',
                timestamp: new Date().toISOString(),
                path: req.path
            })
        }
        if (err.code === 'P2003') {
            return res.status(409).json({
                status: 409,
                code: 'CONFLICT',
                message: 'Related record not found',
                timestamp: new Date().toISOString(),
                path: req.path
            })
        }
    }

    const status = err.status || 500
    const code = err.code || ErrorCodes.INTERNAL_ERROR
    const message = err.status ? err.message : 'An unexpected error occurred'

    const response = {
        status,
        code,
        message,
        timestamp: new Date().toISOString(),
        path: req.path
    }

    if (err.details) response.details = err.details
    if (process.env.NODE_ENV === 'development' && !err.status) {
        response.stack = err.stack
    }

    res.status(status).json(response)
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
    console.log(`Bookstore API running on http://localhost:${PORT}`)
})
