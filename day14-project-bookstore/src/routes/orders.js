
const express = require('express')
const router = express.Router()
const { z } = require('zod')
const prisma = require('../prisma')
const { AppError, ErrorCodes } = require('../errors')
const authenticate = require('../middleware/authenticate')
const authorize = require('../middleware/authorize')
const { validateParams, validate } = require('../middleware/validate')
const asyncHandler = require('../middleware/asyncHandler')

const OrderSchema = z.object({
    items: z.array(z.object({
        bookId: z.number().int().positive(),
        quantity: z.number().int().positive()
    })).min(1, 'order must have at least one item')
})
const updateOrderSchema = OrderSchema.partial()
const IdSchema = z.object({
    id: z.coerce.number().int().positive()
})
router.post('/', authenticate, validate(OrderSchema), asyncHandler(async (req, res) => {
    const { items } = req.body

    const order = await prisma.$transaction(async (tx) => {
        // 1. verify stock and calculate total
        let totalPrice = 0
        const bookMap = {}
        for (const item of items) {
            const book = await tx.book.findUnique({ where: { id: item.bookId } })
            if (!book) throw new AppError(404, ErrorCodes.NOT_FOUND, `Book ${item.bookId} not found`)
            if (book.stock < item.quantity) throw new AppError(409, ErrorCodes.CONFLICT, `Not enough stock for ${book.title}`)
            totalPrice += book.price * item.quantity
            bookMap[item.bookId] = book
        }

        // 2. create order + items together
        const order = await tx.order.create({
            data: {
                userId: req.user.id,
                totalPrice,

                items: {
                    create: items.map(item => ({
                        bookId: item.bookId,
                        quantity: item.quantity,
                        price: bookMap[item.bookId].price

                    }))
                }
            },
            include: { items: true }
        })

        // 3. reduce stock
        for (const item of items) {
            await tx.book.update({
                where: { id: item.bookId },
                data: { stock: { decrement: item.quantity } }
            })
        }

        return order
    })

    res.status(201).json({ data: order })  // ← route handler sends response
}))

router.get('/me', authenticate, asyncHandler(async (req, res) => {
    const orders = await prisma.order.findMany({
        where: { userId: req.user.userId },
        include: { items: { include: { book: true } } }
    })
    res.json({ data: orders })
}))
router.get('/:id', authenticate, authorize('admin'), validateParams(IdSchema), asyncHandler(async (req, res, next) => {
    const { id } = req.params
    const order = await prisma.order.findUnique({
        where: { id },
        include: { items: { include: { book: true } } }
    })
    if (!order) {
        throw new AppError(404, ErrorCodes.NOT_FOUND, 'Order not found')
    }
    res.json({ data: order })
}))
router.get('/', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10
    const skip = (page - 1) * limit

    const orders = await prisma.order.findMany({
        skip,
        take: limit,
        include: { items: { include: { book: true } } }
    })
    res.json({ data: orders })
}))
router.delete('/:id', authenticate, authorize('admin'), validateParams(IdSchema), asyncHandler(async (req, res) => {
    const { id } = req.params

    await prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({
            where: { id },
            include: { items: true }
        })

        if (!order) throw new AppError(404, ErrorCodes.NOT_FOUND, 'Order not found')

        // restore stock for each item
        for (const item of order.items) {
            await tx.book.update({
                where: { id: item.bookId },
                data: { stock: { increment: item.quantity } }
            })
        }

        // delete order items first, then order
        await tx.orderItem.deleteMany({ where: { orderId: id } })
        await tx.order.delete({ where: { id } })
    })

    res.status(204).send()
}))

module.exports = router
