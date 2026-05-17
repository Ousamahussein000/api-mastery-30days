const express = require('express')
const router = express.Router()
const { AppError, ErrorCodes } = require('../errors')
const { validate, validateParams } = require('../middleware/validation')
const { z } = require('zod')
const authenticate = require('../middleware/authmiddleware')
const authorize = require('../middleware/authorizationMiddleware')
const prisma = require('../prisma')



const CreateBookSchema = z.object({
    title: z.string().min(1, 'title is required').max(255, 'title must be less than 255 characters'),
    price: z.number().min(0, 'price must be a positive number'),
    stock: z.number().min(0, 'stock must be a non-negative number').optional(),
    authorId: z.number().int().positive('authorId must be a positive integer')

})
const UpdateBookSchema = CreateBookSchema.partial()

const IdSchema = z.object({
    id: z.coerce.number().int().positive()
})

router.get('/', async (req, res, next) => {
    try {
        const books = await prisma.Book.findMany()
        res.json({ data: books })
    } catch (err) {
        next(err)
    }
})
// GET /v1/books/:id
router.get('/:id', authenticate, validateParams(IdSchema), async (req, res, next) => {
    const book = await prisma.book.findUnique({
        where: { id: req.params.id },
        include: {
            Author: true
        }
    })
    if (!book) {
        return next(new AppError(404, ErrorCodes.NOT_FOUND,
            `Book with id ${req.params.id} not found`))
    }
    res.json({ data: book })
})

// POST /v1/books
router.post('/', authenticate, authorize('admin'), validate(CreateBookSchema), async (req, res, next) => {
    console.log(typeof req.body.title, req.body)
    console.log('req.user:', req.user)
    const { title, price, stock, authorId } = req.body
    const author = await prisma.author.findUnique({
        where: { id: authorId }
    })

    if (!author) {
        return next(new AppError(404, ErrorCodes.NOT_FOUND,
            `Author with id ${authorId} not found`))
    }

    const book = await prisma.book.create({
        data: {
            title,
            price,
            stock,
            authorId
        }
    })
    res.status(201).json({ data: book })
})
router.patch('/:id', authenticate, authorize('admin'), validateParams(IdSchema), validate(UpdateBookSchema),
    async (req, res, next) => {

        const book = await prisma.book.findUnique({
            where: { id: req.params.id }
        })

        if (!book) {
            return next(
                new AppError(
                    404,
                    ErrorCodes.NOT_FOUND,
                    `Book with id ${req.params.id} not found`
                )
            )
        }
        const updatedBook = await prisma.book.update({
            where: { id: req.params.id },
            data: req.body
        })


        res.json({
            data: updatedBook
        })
    })

// DELETE /v1/books/:id
router.delete('/:id', authenticate, authorize('admin'), validateParams(IdSchema), async (req, res, next) => {
    const book = await prisma.book.findUnique({
        where: { id: req.params.id }
    })

    if (!book) {
        return next(new AppError(404, ErrorCodes.NOT_FOUND,
            `Book with id ${req.params.id} not found`))
    }

    const deletedBook = await prisma.book.delete({
        where: { id: req.params.id }
    })
    res.status(204).send()
})

module.exports = router