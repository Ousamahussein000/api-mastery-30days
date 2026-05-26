const jwt = require('jsonwebtoken');
const express = require('express');
const router = express.Router();
const z = require('zod');
const prisma = require('../prisma');
const { AppError, ErrorCodes } = require('../errors');
const { validate } = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const asyncHandler = require('../middleware/asyncHandler');
const bcrypt = require('bcrypt');
const { authLimiter } = require('../middleware/rateLimiter')
const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6)
})
const registerSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string()
        .min(8, 'password must be at least 8 characters')
        .regex(/[A-Z]/, 'password must contain at least one uppercase letter')
        .regex(/[0-9]/, 'password must contain at least one number')
        .regex(/[^a-zA-Z0-9]/, 'password must contain at least one special character')
})
const UpdateProfileSchema = z.object({
    name: z.string().min(2).optional(),
    email: z.string().email().optional(),
    password: z.string()
        .min(8, 'password must be at least 8 characters')
        .regex(/[A-Z]/, 'password must contain at least one uppercase letter')
        .regex(/[0-9]/, 'password must contain at least one number')
        .regex(/[^a-zA-Z0-9]/, 'password must contain at least one special character').optional()
})


router.post('/register', authLimiter, validate(registerSchema), asyncHandler(async (req, res, next) => {
    const { name, email, password } = req.body
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
        return next(new AppError(409, ErrorCodes.CONFLICT, 'Email already in use'))
    }
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)
    const user = await prisma.user.create({
        data: { name, email, password: hashedPassword, role: 'USER' }
    })
    res.status(201).json({ message: 'User registered successfully' })
}))


router.post('/login', authLimiter, validate(loginSchema), asyncHandler(async (req, res, next) => {
    const { email, password } = req.body
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
        return next(new AppError(404, ErrorCodes.NOT_FOUND, 'User not found'))
    }
    const isMatch = await bcrypt.compare(password, user.password)
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' })
    res.json({ token })
}))

router.get('/profile', authenticate, asyncHandler(async (req, res, next) => {
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { id: true, name: true, email: true, role: true } })
    res.json({ user })
}))

router.patch('/profile', authenticate, validate(UpdateProfileSchema), asyncHandler(async (req, res, next) => {
    const { name, email, password } = req.body
    const updateData = {}
    if (name) updateData.name = name
    if (email) {
        const existingUser = await prisma.user.findUnique({ where: { email } })
        if (existingUser && existingUser.id !== req.user.id) {
            return next(new AppError(409, ErrorCodes.CONFLICT, 'Email already in use'))
        }
        updateData.email = email
    }
    if (password) {
        const salt = await bcrypt.genSalt(10)
        updateData.password = await bcrypt.hash(password, salt)
    }
    const user = await prisma.user.update({
        where: { id: req.user.id },
        data: updateData
    })
    res.json({ message: 'Profile updated successfully' })
}))


router.patch('/profile', authenticate, validate(UpdateProfileSchema), asyncHandler(async (req, res, next) => {
    const { name, email, password } = req.body
    const updateData = {}
    if (name) updateData.name = name
    if (email) {
        const existingUser = await prisma.user.findUnique({ where: { email } })
        if (existingUser && existingUser.id !== req.user.id) {
            return next(new AppError(409, ErrorCodes.CONFLICT, 'Email already in use'))
        }
        updateData.email = email
    }
    if (password) {
        const salt = await bcrypt.genSalt(10)
        updateData.password = await bcrypt.hash(password, salt)
    }
    const user = await prisma.user.update({
        where: { id: req.user.id },
        data: updateData
    })
    res.json({ message: 'Profile updated successfully' })
}))

router.delete('/profile', authenticate, asyncHandler(async (req, res, next) => {
    await prisma.user.delete({ where: { id: req.user.id } })
    res.json({ message: 'Profile deleted successfully' })
}))


module.exports = router
