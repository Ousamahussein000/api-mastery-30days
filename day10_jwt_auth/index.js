const express = require('express')
const logger = require('./src/middleware/logger')
const notFound = require('./src/middleware/notFound')
const authRouter = require('./src/routes/authRoute')
const dotenv = require('dotenv')
dotenv.config()
const { ErrorCodes, AppError } = require('./src/errors')
const { PrismaClientKnownRequestError } = require('@prisma/client/runtime/library')
const app = express()

// --- Global middleware ---
app.use(express.json())   // parse JSON bodies
app.use(logger)           // log every request

// --- Routes ---

app.use('/v1/auth', authRouter)
app.use('/v1/books', require('./src/routes/books'))
app.use('/v1/authors', require('./src/routes/authors'))

// --- 404 handler — must be after all routes ---
app.get('/', (req, res) => {
    res.json({
        name: 'JWT Auth API',
        version: 'v1',
        status: 'running'
    })
})
app.use(notFound)

// --- Global error handler — must be last ---
app.use((err, req, res, next) => {
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
    }
    console.log('ERROR HANDLER HIT:', err)
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
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection:', reason)
    // in production: log to monitoring service, then gracefully shut down
})

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err)
    process.exit(1) // always exit on uncaught exception — process is in unknown state
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
    console.log(`JWT Auth API running on http://localhost:${PORT}`)
})