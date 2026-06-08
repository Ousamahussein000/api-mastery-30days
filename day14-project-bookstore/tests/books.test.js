import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import app from '../src/app.js'
import prisma from '../src/prisma.js'

let adminToken
let clientToken
let authorId
let categoryId

beforeAll(async () => {
    const bcrypt = await import('bcrypt')
    const hashed = await bcrypt.hash('Admin@1234', 10)

    await prisma.user.create({
        data: { name: 'Admin', email: 'admin@test.com', password: hashed, role: 'admin' }
    })
    await prisma.user.create({
        data: { name: 'Client', email: 'client@test.com', password: hashed, role: 'client' }
    })

    const adminRes = await request(app)
        .post('/v1/auth/login')
        .send({ email: 'admin@test.com', password: 'Admin@1234' })
    adminToken = adminRes.body.token

    const clientRes = await request(app)
        .post('/v1/auth/login')
        .send({ email: 'client@test.com', password: 'Admin@1234' })
    clientToken = clientRes.body.token

    const author = await prisma.author.create({ data: { name: 'Test Author', nationality: 'Test' } })
    const category = await prisma.category.create({ data: { name: 'Test Category', section: 'Test' } })
    authorId = author.id
    categoryId = category.id
})

describe('GET /v1/books', () => {
    it('should return books list publicly', async () => {
        const res = await request(app).get('/v1/books')
        expect(res.status).toBe(200)
        expect(res.body.data).toBeInstanceOf(Array)
        expect(res.body.pagination).toBeDefined()
    })
})

describe('POST /v1/books', () => {
    it('should create a book as admin', async () => {
        const res = await request(app)
            .post('/v1/books')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ title: 'Test Book', price: 19.99, authorId, categoryId })

        expect(res.status).toBe(201)
        expect(res.body.data.title).toBe('Test Book')
    })

    it('should return 403 for client', async () => {
        const res = await request(app)
            .post('/v1/books')
            .set('Authorization', `Bearer ${clientToken}`)
            .send({ title: 'Test Book', price: 19.99, authorId, categoryId })

        expect(res.status).toBe(403)
    })

    it('should return 401 with no token', async () => {
        const res = await request(app)
            .post('/v1/books')
            .send({ title: 'Test Book', price: 19.99, authorId, categoryId })

        expect(res.status).toBe(401)
    })
})

describe('GET /v1/books/:id', () => {
    it('should return 404 for non-existent book', async () => {
        const res = await request(app).get('/v1/books/99999')
        expect(res.status).toBe(404)
    })
})