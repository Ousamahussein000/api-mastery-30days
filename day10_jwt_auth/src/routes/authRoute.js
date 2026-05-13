const express = require("express");
const router = express.Router();
const { z } = require("zod");
const { AppError, ErrorCodes } = require("../errors");
const { validate, validateParams } = require("../middleware/validation");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv")
dotenv.config()
const authenticate = require("../middleware/authmiddleware")
const authorize = require("../middleware/authorizationMiddleware")
const users = [
    { id: 1, username: "issaelkabisa", password: "1234567", role: "admin" },
    { id: 2, username: "rafic", password: "password", role: "user" },
    { id: 3, username: "oussama", password: "123456", role: "user" }
];

const usersSchema = z.object({
    username: z.string().min(1, 'username is required').max(55, 'username must be less than 55 characters'),
    password: z.string().min(6, 'password is required'),
    role: z.enum(['admin', 'user']).default('user')
})
const IdSchema = z.object({
    id: z.coerce.number().int().positive()
})

router.post('/', validate(usersSchema), (req, res, next) => {

    const { username, password, role } = req.body
    const user = users.find(u => u.username === username && u.password === password)
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

router.get('/me', authenticate, (req, res) => {
    const user = users.find(u => u.id === req.user.id)
    res.json({ id: user.id, username: user.username, role: user.role })
})

module.exports = router