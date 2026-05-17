const express = require("express");
const router = express.Router();
const { z, email } = require("zod");
const { AppError, ErrorCodes } = require("../errors");
const { validate, validateParams } = require("../middleware/validation");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv")
dotenv.config()
const authenticate = require("../middleware/authmiddleware")
const authorize = require("../middleware/authorizationMiddleware")
const prisma = require("../prisma")

const usersSchema = z.object({
    fullname: z.string().min(1, 'fullname is required').max(70, 'fullname must be less than 70 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'password is required'),
    role: z.enum(['admin', 'user']).default('user')
})
const IdSchema = z.object({
    id: z.coerce.number().int().positive()
})

router.post('/', validate(usersSchema), async (req, res, next) => {

    const { fullname, email, password, role } = req.body
    const user = await prisma.user.findUnique({
        where: { email }
    })
    if (!user) {
        return next(new AppError(401, ErrorCodes.UNAUTHORIZED, "Invalid credentials"))
    }
    const token = jwt.sign(
        { userID: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    )
    res.json({ token })
})

router.get('/me', authenticate, async (req, res) => {
    const user = await prisma.user.findUnique({
        where: { id: req.user.userID }
    })
    res.json({ id: user.id, fullname: user.fullname, email: user.email, role: user.role })
})

module.exports = router