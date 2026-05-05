const ErrorCodes = {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    CONFLICT: 'CONFLICT',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
}

class AppError extends Error {
    constructor(status, code, message, details = null) {
        super(message)
        this.status = status
        this.code = code
        this.details = details
    }
}

module.exports = { ErrorCodes, AppError }