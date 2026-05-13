const express = require('express')
const router = express.Router()
const { AppError, ErrorCodes } = require('../errors')
const { validate, validateParams } = require('../middleware/validation')
const authenticate = require('../middleware/authmiddleware')
const authorize = require('../middleware/authorizationMiddleware')
const { z } = require('zod')

let authors = [
    { id: 1, name: 'David Thomas', nationality: 'British', bio: 'Co-author of The Pragmatic Programmer' },
    { id: 2, name: 'Robert Martin', nationality: 'American', bio: 'Author of Clean Code and Clean Architecture' },
    { id: 3, name: 'Kyle Simpson', nationality: 'American', bio: 'Author of the You Don\'t Know JS series' },
]
let nextId = 4
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
router.get("/:id", authenticate, validateParams(IdSchema), (req, res, next) => {
    const author = authors.find(author => author.id === (req.params.id))
    if (!author) {
        return next(new AppError(404, ErrorCodes.NOT_FOUND, "no author with this id"))
    }
    res.status(200).json({ data: author })
})
router.post("/", authenticate, authorize('admin'), validate(CreateAuthorSchema), (req, res, next) => {
    const { id, name, nationality, bio } = req.body

    const author = { id: nextId++, name, nationality, bio }
    authors.push(author)
    res.status(201).json({ data: author })
})
router.patch("/:id", authenticate, authorize('admin'), validateParams(IdSchema), validate(UpdateAuthorSchema), (req, res, next) => {
    const author = authors.find(author => author.id === (req.params.id))
    if (!author) {
        return next(new AppError(404, ErrorCodes.NOT_FOUND, "no author with this id"))
    }
    Object.assign(author, req.body)
    res.status(200).json({ data: author })
})
router.delete("/:id", authenticate, authorize('admin'), validateParams(IdSchema), (req, res, next) => {
    const authorIndex = authors.findIndex(author => author.id === (req.params.id))
    if (authorIndex === -1) {
        return next(new AppError(404, ErrorCodes.NOT_FOUND, "no author with this id"))
    }
    authors.splice(authorIndex, 1)
    res.status(204).send()
})

module.exports = router



