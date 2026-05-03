const express = require('express');
const { AppError, ErrorCodes } = require('./errors')

const app = express()
app.use(express.json())
app.get('/v1/users/:id', (req, res, next) => {
    const user = null;
    if (!user) {
        return next(new AppError(404, ErrorCodes.NOT_FOUND, `User with id ${req.params.id} not found`))

    }
    res.json(user);
})
app.post('/v1/users', (req, res, next) => {
    const errors = [];
    if (!req.body.email) {
        errors.push({ field: 'email', message: 'email is required' })
    }
    if (!req.body.name) {
        errors.push({ field: 'name', message: 'name is required' })
    }
    if (errors.length > 0) {
        return next(new AppError(422, ErrorCodes.VALIDATION_ERROR,
            'Request validation failed', errors))
    }
    res.status(201).json({ id: 1, ...req.body })

})
app.use((err, req, res, next) => {
    // If it's not our AppError it's an unhandled crash
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

    // Only add details if they exist (validation errors)
    if (err.details) response.details = err.details

    // Never expose stack traces in production
    if (process.env.NODE_ENV === 'development' && !err.status) {
        response.stack = err.stack
    }

    res.status(status).json(response)
})

app.listen(3000, () => console.log('Running on http://localhost:3000'))
