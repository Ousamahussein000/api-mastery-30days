
const express = require('express')
const router = express.Router()
const { z } = require('zod')
const prisma = require('../prisma')
const { AppError, ErrorCodes } = require('../errors')
const authenticate = require('../middleware/authenticate')
const authorize = require('../middleware/authorize')
const { validateParams, validate } = require('../middleware/validate')
const asyncHandler = require('../middleware/asyncHandler')
const redis = require('../cache')
const bookSchema = z.object({
    title: z.string().min(2),
    authorId: z.number().int().positive(),
    categoryId: z.number().int().positive(),
    price: z.number().positive(),
    stock: z.number().int().nonnegative().optional()
})
const updateBookSchema = bookSchema.partial()
const IdSchema = z.object({
    id: z.coerce.number().int().positive()
})







router.post('/', authenticate, authorize('admin'), validate(bookSchema), asyncHandler(async (req, res, next) => {
    const { title, authorId, categoryId, price, stock } = req.body
    const book = await prisma.book.create({
        data: { title, authorId, categoryId, price, stock }
    })
    const keys = await redis.keys('books:*')
    if (keys.length) await redis.del(...keys)
    res.status(201).json(book)
}))
router.get('/', asyncHandler(async (req, res) => {

    const cacheKey = `books:${JSON.stringify(req.query)}`

    const cached = await redis.get(cacheKey)
    if (cached) {
        return res.json({ data: JSON.parse(cached), source: 'cache' })
    }

    const page = parseInt(req.query.page) || 1
    const limit = Math.min(parseInt(req.query.limit) || 10, 100)
    const skip = (page - 1) * limit

    // build where clause dynamically
    const where = {}
    if (req.query.category) where.categoryId = parseInt(req.query.category)
    if (req.query.author) where.authorId = parseInt(req.query.author)
    if (req.query.search) where.title = { contains: req.query.search, mode: 'insensitive' }

    // build orderBy
    const orderBy = {}
    if (req.query.sort) {
        const desc = req.query.sort.startsWith('-')
        const field = req.query.sort.replace('-', '')
        orderBy[field] = desc ? 'desc' : 'asc'
    }

    const [books, total] = await Promise.all([
        prisma.book.findMany({
            where,
            orderBy,
            skip,
            take: limit,
            include: { author: true, category: true }
        }),
        prisma.book.count({ where })
    ])
    const result = {
        data: books,
        pagination: {
            page, limit, total,
            total_pages: Math.ceil(total / limit),
            has_next: page * limit < total,
            has_prev: page > 1
        }
    }
    await redis.set(cacheKey, JSON.stringify(result), 'EX', 60)
    res.json({ ...result, source: 'database' })
}))
router.get('/:id', validateParams(IdSchema), asyncHandler(async (req, res) => {
    const { id } = req.params
    const cacheKey = `book:${id}`
    const cached = await redis.get(cacheKey)
    if (cached) return res.json({ data: JSON.parse(cached), source: 'cache' })
    const book = await prisma.book.findUnique({
        where: { id },
        include: { author: true, category: true }
    })
    if (!book) {
        throw new AppError(404, ErrorCodes.NOT_FOUND, 'Book not found')
    }
    await redis.set(cacheKey, JSON.stringify(book), 'EX', 120)
    res.json(book)

}))
router.patch('/:id', authenticate, authorize('admin'), validateParams(IdSchema), validate(updateBookSchema), asyncHandler(async (req, res) => {
    const { id } = req.params
    if (!await prisma.book.findUnique({ where: { id } })) {
        throw new AppError(404, ErrorCodes.NOT_FOUND, 'Book not found')
    }
    const { title, authorId, categoryId, price, stock } = req.body
    const book = await prisma.book.update({
        where: { id },
        data: { title, authorId, categoryId, price, stock }
    })
    const keys = await redis.keys('books:*')
    if (keys.length) await redis.del(...keys)
    await redis.del(`book:${id}`)
    res.json(book)

}))
router.delete('/:id', authenticate, authorize('admin'), validateParams(IdSchema), asyncHandler(async (req, res) => {
    const { id } = req.params
    if (!await prisma.book.findUnique({ where: { id } })) {
        throw new AppError(404, ErrorCodes.NOT_FOUND, 'Book not found')
    }
    await prisma.book.delete({ where: { id } })
    const keys = await redis.keys('books:*')
    if (keys.length) await redis.del(...keys)
    await redis.del(`book:${id}`)
    res.status(204).send()

}))
module.exports = router