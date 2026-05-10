const express = require('express')
const router = express.Router()
const { AppError, ErrorCodes } = require('../errors')
const { validate, validateParams } = require('../middleware/validation')
const { z } = require('zod')

let books = [
    { id: 1, title: 'The Pragmatic Programmer', author: 'David Thomas', price: 39.99, stock: 10 },
    { id: 2, title: 'Clean Code', author: 'Robert Martin', price: 29.99, stock: 5 },
    { id: 3, title: 'You Don\'t Know JS', author: 'Kyle Simpson', price: 24.99, stock: 8 },
]
let nextId = 4;

const CreateBookSchema = z.object({
    title: z.string().min(1, 'title is required').max(255, 'title must be less than 255 characters'),
    author: z.string().min(1, 'author is required').max(55, 'author must be less than 55 characters'),
    price: z.number().min(0, 'price must be a positive number'),
    stock: z.number().min(0, 'stock must be a non-negative number').optional()
})
const UpdateBookSchema = CreateBookSchema.partial()

const IdSchema = z.object({
    id: z.coerce.number().int().positive()
})

router.get('/', (req, res) => {
    let result = [...books]

    if (req.query.search) {
        const searchTerm = req.query.search.toLowerCase()
        result = result.filter(book => book.title.toLocaleLowerCase().includes(searchTerm)
            || book.author.toLocaleLowerCase().includes(searchTerm))
    }

    if (req.query.sort) {
        const order = req.query.sort.startsWith('-') ? '-1' : '1'
        if (req.query.sort.startsWith('-')) {
            const field = req.query.sort.replace('-', '')
        }
        const field = req.query.sort
        result.sort((a, b) => { (a[field] > b[field] ? 1 : a[field] < b[field] ? -1 : 0) * order })


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
}

)
// GET /v1/books/:id
router.get('/:id', validateParams(IdSchema), (req, res, next) => {
    const book = books.find(b => b.id === req.params.id)
    if (!book) {
        return next(new AppError(404, ErrorCodes.NOT_FOUND,
            `Book with id ${req.params.id} not found`))
    }
    res.json({ data: book })
})

// POST /v1/books
router.post('/', validate(CreateBookSchema), (req, res, next) => {
    console.log(typeof req.body.title, req.body)
    const { title, author, price, stock } = req.body

    const book = {
        id: nextId++,
        ...req.body
    }

    books.push(book)
    res.status(201).json({ data: book })
})
router.patch(
    '/:id',

    validateParams(IdSchema),

    validate(UpdateBookSchema),

    (req, res, next) => {

        const book = books.find(
            b => b.id === req.params.id
        )

        if (!book) {
            return next(
                new AppError(
                    404,
                    ErrorCodes.NOT_FOUND,
                    `Book with id ${req.params.id} not found`
                )
            )
        }

        Object.assign(book, req.body)

        res.json({
            data: book
        })
    })

// DELETE /v1/books/:id
router.delete('/:id', validateParams(IdSchema), (req, res, next) => {
    const index = books.findIndex(b => b.id === req.params.id)
    if (index === -1) {
        return next(new AppError(404, ErrorCodes.NOT_FOUND,
            `Book with id ${req.params.id} not found`))
    }

    books.splice(index, 1)
    res.status(204).send()
})

module.exports = router