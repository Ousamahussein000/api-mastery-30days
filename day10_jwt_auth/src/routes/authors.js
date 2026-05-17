const express = require('express')
const router = express.Router()
const { AppError, ErrorCodes } = require('../errors')
const { validate, validateParams } = require('../middleware/validation')
const authenticate = require('../middleware/authmiddleware')
const authorize = require('../middleware/authorizationMiddleware')
const { z } = require('zod')
const prisma = require('../prisma')


const CreateAuthorSchema = z.object({
    name: z.string().min(1, 'name is required').max(55, 'name must be less than 55 characters'),
    nationality: z.string().min(1, 'nationality is required').max(100, 'nationality must be less than 100 characters'),
    bio: z.string().max(255, 'bio must be less than 255 characters').optional()
})
const UpdateAuthorSchema = CreateAuthorSchema.partial()

const IdSchema = z.object({
    id: z.coerce.number().int().positive()
})


router.get('/', authenticate, (req, res) => {
    let result = [...authors]
    if (req.query.search) {
        const searchedAuthor = req.query.search.toLocaleLowerCase()
        result = result.filter(author => author.name.toLocaleLowerCase().includes(searchedAuthor))
    }
    if (req.query.sort) {
        const order = req.query.sort.startsWith('-') ? -1 : 1
        const authorName = req.query.sort.replace('-', '')
        result = result.sort((author1, author2) => (author1[authorName] > author2[authorName] ? 1 : author1[authorName] < author2[authorName] ? -1 : 0) * order)
    }
    const page = parseInt(req.query.page) || 1
    const limit = Math.min(parseInt(req.query.limit) || 10, 100)
    const skip = (page - 1) * limit
    const total = result.length
    result = result.slice(skip, skip + limit)
    res.json({
        data: result,
        pagination: {
            page,
            limit,
            total,
            total_pages: Math.ceil(total / limit),
            has_next: page * limit < total,
            has_prev: page > 1
        }

    })
})
router.get("/:id", authenticate, validateParams(IdSchema), async (req, res, next) => {
    const author = await prisma.author.findUnique({
        where: { id: req.params.id }
    })
    if (!author) {
        return next(new AppError(404, ErrorCodes.NOT_FOUND, "no author with this id"))
    }
    res.status(200).json({ data: author })
})
router.post("/", authenticate, authorize('admin'), validate(CreateAuthorSchema), async (req, res, next) => {
    const { id, name, nationality, bio } = req.body

    const author = await prisma.author.create({
        data: {
            name,
            nationality,
            bio
        }
    })
    res.status(201).json({ data: author })
})
router.patch("/:id", authenticate, authorize('admin'), validateParams(IdSchema), validate(UpdateAuthorSchema), async (req, res, next) => {
    const author = await prisma.author.findUnique({
        where: { id: req.params.id }
    })
    if (!author) {
        return next(new AppError(404, ErrorCodes.NOT_FOUND, "no author with this id"))
    }
    const updatedAuthor = await prisma.author.update({
        where: { id: req.params.id },
        data: req.body
    })
    res.status(200).json({ data: updatedAuthor })
})
router.delete("/:id", authenticate, authorize('admin'), validateParams(IdSchema), async (req, res, next) => {
    const author = await prisma.author.findUnique({
        where: { id: req.params.id }
    })
    if (!author) {
        return next(new AppError(404, ErrorCodes.NOT_FOUND, "no author with this id"))
    }
    const bookCount = await prisma.book.count({
        where: { authorId: req.params.id }
    })

    if (bookCount > 0) {
        return next(new AppError(409, ErrorCodes.CONFLICT,
            `Cannot delete author — they have ${bookCount} book(s) in the library. Delete or reassign the books first.`
        ))
    }
    await prisma.author.delete({
        where: { id: req.params.id }
    })
    res.status(204).send()
})


module.exports = router



