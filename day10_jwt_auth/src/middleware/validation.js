const { z } = require('zod')
const { AppError, ErrorCodes } = require('../errors')

const validate = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
        const errors = result.error.issues.map(e => ({
            field: e.path[0] || 'unknown',
            message: e.message
        }))
        return next(new AppError(422, ErrorCodes.VALIDATION_ERROR,
            'Request validation failed', errors))
    }
    req.body = result.data
    next()
}
const validateParams = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.params)
    if (!result.success) {
        const errors = result.error.issues.map(e => ({
            field: e.path[0] || 'unknown',
            message: e.message
        }))
        return next(new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Invalid parameters', errors))
    }
    req.params = result.data
    next()
}
module.exports = { validate, validateParams }
