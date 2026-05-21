const jwt = require('jsonwebtoken')
const express = require('express')
const router = express.Router()
const { z } = require('zod')
const prisma = require('../prisma')
const { AppError, ErrorCodes } = require('../errors')
const authenticate = require('../middleware/authenticate')
const authorize = require('../middleware/authorize')
const { validateParams, validate } = require('../middleware/validate')
const asyncHandler = require('../middleware/asyncHandler')
const createAuthorSchema = z.object({
    name: z.string().min(2),
    bio: z.string().optional()
})
const updateAuthorSchema = createAuthorSchema.partial()
const IdSchema = z.object({
    id: z.coerce.number().int().positive()
})

router.post('/', authenticate, authorize('admin'), asyncHandler(async (req, res, next) => {
    const { name, bio } = createAuthorSchema.parse(req.body)
    const author = await prisma.author.create({ data: { name, bio } })
    res.status(201).json(author)
}))


router.get('/', asyncHandler(async (req, res, next) => {
    const authors = await prisma.author.findMany()
    res.json(authors)
}))

router.get('/:id', validateParams(IdSchema), asyncHandler(async (req, res, next) => {
    const { id } = req.params
    const author = await prisma.author.findUnique({ where: { id } })
    if (!author) {
        throw new AppError(404, ErrorCodes.NOT_FOUND, 'Author not found')
    }
    res.json(author)

}))
router.patch('/:id', authenticate, authorize('admin'), validateParams(IdSchema), validate(updateAuthorSchema), asyncHandler(async (req, res, next) => {
    const { id } = req.params
    if (!await prisma.author.findUnique({ where: { id } })) {
        throw new AppError(404, ErrorCodes.NOT_FOUND, 'Author not found')
    }
    const { name, bio } = req.body
    const author = await prisma.author.update({
        where: { id },
        data: { name, bio }
    })
    res.json(author)

}))
router.delete('/:id', authenticate, authorize('admin'), validateParams(IdSchema), asyncHandler(async (req, res, next) => {
    const { id } = req.params
    if (!await prisma.author.findUnique({ where: { id } })) {
        throw new AppError(404, ErrorCodes.NOT_FOUND, 'Author not found')
    }
    await prisma.author.delete({ where: { id } })
    res.status(204).send()

}))
module.exports = router
