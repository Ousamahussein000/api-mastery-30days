
const express = require('express')
const router = express.Router()
const { z } = require('zod')
const prisma = require('../prisma')
const { AppError, ErrorCodes } = require('../errors')
const authenticate = require('../middleware/authenticate')
const authorize = require('../middleware/authorize')
const { validateParams, validate } = require('../middleware/validate')
const asyncHandler = require('../middleware/asyncHandler')
const { redis, getVersion, invalidate } = require('../cache')
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
    await invalidate('author')  // bumps version — all author:v* keys unreachable
    res.status(201).json(author)
}))


router.get('/', asyncHandler(async (req, res) => {

    const version = await getVersion('authors')
    const cashkey = `author:${version}:${JSON.stringify(req.query)}`

    const cached = await redis.get(cashkey)
    if (cached) {
        return res.json({ data: JSON.parse(cached), source: 'cache' })
    }

    const page = parseInt(req.query.page) || 1
    const limit = Math.min(parseInt(req.query.limit) || 10, 100)
    const skip = (page - 1) * limit

    const where = {}
    if (req.query.search) {
        where.name = { contains: req.query.search, mode: 'insensitive' }
    }

    const [authors, total] = await Promise.all([
        prisma.author.findMany({
            where,
            skip,
            take: limit,
            include: { books: true }
        }),
        prisma.author.count({ where })
    ])

    const result = {
        data: authors,
        pagination: {
            page,
            limit,
            total,
            total_pages: Math.ceil(total / limit),
            has_next: page * limit < total,
            has_prev: page > 1
        }
    }
    await redis.set(cashkey, JSON.stringify(result), 'EX', 60)
    res.json({ ...result, source: 'database' })
}))

router.get('/:id', validateParams(IdSchema), asyncHandler(async (req, res, next) => {
    const { id } = req.params
    const version = await getVersion(`author`)
    const cacheKey = `author:${version}:${id}`
    const cached = await redis.get(cacheKey)
    if (cached) return res.json({ data: JSON.parse(cached), source: 'cache' })
    const author = await prisma.author.findUnique({ where: { id } })
    if (!author) {
        throw new AppError(404, ErrorCodes.NOT_FOUND, 'Author not found')
    }
    await redis.set(cacheKey, JSON.stringify(author), 'EX', 120)
    res.json(author)

}))
router.get('/:id/books', validateParams(IdSchema), asyncHandler(async (req, res, next) => {
    const { id } = req.params
    const version = await getVersion(`author:${id}:books`)
    const cacheKey = `author:${version}:${id}:books`
    const cached = await redis.get(cacheKey)
    if (cached) return res.json({ data: JSON.parse(cached), source: 'cache' })
    if (!await prisma.author.findUnique({ where: { id } })) {
        throw new AppError(404, ErrorCodes.NOT_FOUND, 'Author not found')
    }
    const books = await prisma.book.findMany({ where: { authorId: id } })
    await redis.set(cacheKey, JSON.stringify(books), 'EX', 60)
    res.json(books)
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
    const keys = await redis.keys(`author:*`)
    if (keys.length) await redis.del(...keys)
    await invalidate(`author`)  // bumps version — all author:v* and author:v* keys unreachable
    res.json(author)

}))
router.delete('/:id', authenticate, authorize('admin'), validateParams(IdSchema), asyncHandler(async (req, res, next) => {
    const { id } = req.params
    if (!await prisma.author.findUnique({ where: { id } })) {
        throw new AppError(404, ErrorCodes.NOT_FOUND, 'Author not found')
    }
    await prisma.author.delete({ where: { id } })
    const keys = await redis.keys(`author:*`)
    if (keys.length) await redis.del(...keys)
    await invalidate(`author`)  // bumps version — all author:v* and author:v* keys unreachable
    res.status(204).send()

}))
module.exports = router
