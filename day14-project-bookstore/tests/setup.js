import prisma from '../src/prisma.js'
import { beforeAll, afterAll } from 'vitest'

beforeAll(async () => {
    // clean DB before tests run — order matters, children before parents
    await prisma.orderItem.deleteMany()
    await prisma.order.deleteMany()
    await prisma.book.deleteMany()
    await prisma.author.deleteMany()
    await prisma.category.deleteMany()
    await prisma.user.deleteMany()
})

afterAll(async () => {
    await prisma.$disconnect()
})