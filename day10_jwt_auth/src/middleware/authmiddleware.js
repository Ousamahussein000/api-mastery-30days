const jwt = require('jsonwebtoken')
const { AppError, ErrorCodes } = require('../errors')

const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(new AppError(401, ErrorCodes.UNAUTHORIZED, 'No token provided'))
    }
    const token = authHeader.split(" ")[1]

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        req.user = { id: decoded.userID }
        next()
    }
    catch (err) {
        return next(new AppError(401, ErrorCodes.UNAUTHORIZED, 'Invalid token'))
    }
}

module.exports = authenticate

