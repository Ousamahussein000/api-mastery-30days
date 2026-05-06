const express = require('express')
const router = express.Router()
const { AppError, ErrorCodes } = require('../errors')

let books = [
    { id: 1, title: 'The Pragmatic Programmer', author: 'David Thomas', price: 39.99, stock: 10 },
    { id: 2, title: 'Clean Code', author: 'Robert Martin', price: 29.99, stock: 5 },
    { id: 3, title: 'You Don\'t Know JS', author: 'Kyle Simpson', price: 24.99, stock: 8 },
]
let nextId = 4;

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
router.get('/:id', (req, res, next) => {
    const book = books.find(b => b.id === parseInt(req.params.id))
    if (!book) {
        return next(new AppError(404, ErrorCodes.NOT_FOUND,
            `Book with id ${req.params.id} not found`))
    }
    res.json({ data: book })
})

// POST /v1/books
router.post('/', (req, res, next) => {
    const { title, author, price, stock } = req.body
    const errors = []

    if (!title) errors.push({ field: 'title', message: 'title is required' })
    if (!author) errors.push({ field: 'author', message: 'author is required' })
    if (price === undefined) errors.push({ field: 'price', message: 'price is required' })
    if (price < 0) errors.push({ field: 'price', message: 'price must be positive' })

    if (errors.length > 0) {
        return next(new AppError(422, ErrorCodes.VALIDATION_ERROR,
            'Request validation failed', errors))
    }

    const book = { id: nextId++, title, author, price, stock: stock || 0 }
    books.push(book)
    res.status(201).json({ data: book })
})
router.patch('/:id', (req, res, next) => {
    const book = books.find(b => b.id === parseInt(req.params.id))
    if (!book) {
        return next(new AppError(404, ErrorCodes.NOT_FOUND,
            `Book with id ${req.params.id} not found`))
    }

    const { title, author, price, stock } = req.body

    if (price !== undefined && price < 0) {
        return next(new AppError(422, ErrorCodes.VALIDATION_ERROR,
            'Request validation failed',
            [{ field: 'price', message: 'price must be positive' }]))
    }

    // only update fields that were sent
    if (title !== undefined) book.title = title
    if (author !== undefined) book.author = author
    if (price !== undefined) book.price = price
    if (stock !== undefined) book.stock = stock

    res.json({ data: book })
})

// DELETE /v1/books/:id
router.delete('/:id', (req, res, next) => {
    const index = books.findIndex(b => b.id === parseInt(req.params.id))
    if (index === -1) {
        return next(new AppError(404, ErrorCodes.NOT_FOUND,
            `Book with id ${req.params.id} not found`))
    }

    books.splice(index, 1)
    res.status(204).send()
})

module.exports = router