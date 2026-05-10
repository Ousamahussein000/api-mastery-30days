const express = require('express')
const logger = require('./src/middleware/logger')
const notFound = require('./src/middleware/notFound')
const booksRouter = require('./src/routes/books')
const authorsRouter = require('./src/routes/authors')
const { ErrorCodes, AppError } = require('./src/errors')

const app = express()

// --- Global middleware ---
app.use(express.json())   // parse JSON bodies
app.use(logger)           // log every request

// --- Routes ---
app.use('/v1/books', booksRouter)
app.use('/v1/authors', authorsRouter)

// --- 404 handler — must be after all routes ---
app.get('/', (req, res) => {
    res.json({
        name: 'Bookstore API',
        version: 'v1',
        status: 'running'
    })
})
app.use(notFound)

// --- Global error handler — must be last ---
app.use((err, req, res, next) => {
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

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
    console.log(`Bookstore API running on http://localhost:${PORT}`)
})