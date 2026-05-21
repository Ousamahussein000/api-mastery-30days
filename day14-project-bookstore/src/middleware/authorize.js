// middleware/authorize.js
const { AppError, ErrorCodes } = require('../errors')

const authorize = (...roles) => (req, res, next) => {
    if (!roles.includes(req.user.role)) {
        return next(new AppError(403, ErrorCodes.FORBIDDEN,
            'You do not have permission to perform this action'))
    }
    next()
}

module.exports = authorize