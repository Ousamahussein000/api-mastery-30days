
const express = require('express')
const router = express.Router()
const { z } = require('zod')
const prisma = require('../prisma')
const { AppError, ErrorCodes } = require('../errors')
const authenticate = require('../middleware/authenticate')
const authorize = require('../middleware/authorize')
const { validateParams, validate } = require('../middleware/validate')
const asyncHandler = require('../middleware/asyncHandler')
const categorySchema = z.object({
    name: z.string().min(2),
    section: z.string().min(1).max(100)

})
const updateCategorySchema = categorySchema.partial()
const IdSchema = z.object({
    id: z.coerce.number().int().positive()

})
router.get('/', asyncHandler(async (req, res) => {
    const where = {}
    if (req.query.section) {
        where.section = { equals: req.query.section, mode: 'insensitive' }
    }

    const categories = await prisma.category.findMany({
        where,
        include: { _count: { select: { books: true } } }  // how many books per category
    })

    res.json({ data: categories })
}))
router.post('/', authenticate, authorize('admin'), validate(categorySchema), asyncHandler(async (req, res, next) => {
    const { name, section } = req.body
    const category = await prisma.category.create({ data: { name, section } })
    res.status(201).json(category)
}))
router.get('/:id', validateParams(IdSchema), asyncHandler(async (req, res, next) => {
    const { id } = req.params
    const category = await prisma.category.findUnique({
        where: { id },
        include: { books: true }
    })
    if (!category) {
        throw new AppError(404, ErrorCodes.NOT_FOUND, 'Category not found')
    }
    res.json({ data: category })
}))
router.delete('/:id', authenticate, authorize('admin'), validateParams(IdSchema), asyncHandler(async (req, res, next) => {
    const { id } = req.params
    const category = await prisma.category.findUnique({ where: { id } })
    if (!category) {
        throw new AppError(404, ErrorCodes.NOT_FOUND, 'Category not found')
    }
    const bookCount = await prisma.book.count({ where: { categoryId: id } })
    if (bookCount > 0) {
        throw new AppError(409, ErrorCodes.CONFLICT,
            `Cannot delete category — it has ${bookCount} book(s) linked to it`)
    }
    await prisma.category.delete({ where: { id } })
    res.status(204).send()
}))
router.patch('/:id', authenticate, authorize('admin'), validateParams(IdSchema), validate(updateCategorySchema), asyncHandler(async (req, res, next) => {
    const { id } = req.params
    const { name, section } = req.body
    const category = await prisma.category.findUnique({ where: { id } })
    if (!category) {
        throw new AppError(404, ErrorCodes.NOT_FOUND, 'Category not found')
    }
    const updated = await prisma.category.update({
        where: { id },
        data: { name, section }
    })
    res.json(updated)
}))

module.exports = router
