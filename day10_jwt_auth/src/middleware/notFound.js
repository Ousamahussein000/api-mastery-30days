const { AppError, ErrorCodes } = require('../errors')
function notFound(req, res, next) {
    next(new AppError(404, ErrorCodes.NOT_FOUND,
        `Route ${req.method} ${req.path} not found`))
}
module.exports = notFound