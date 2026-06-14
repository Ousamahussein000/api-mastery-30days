import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import app from '../src/app.js'
import prisma from '../src/prisma.js'

let adminToken
let clientToken
let authorId
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
})

describe('GET /v1/books', () => {
    it('should return books list publicly', async () => {
        const res = await request(app).get('/v1/books')
        expect(res.status).toBe(200)
        expect(res.body.data).toBeInstanceOf(Array)
        expect(res.body.pagination).toBeDefined()
    })
})

describe('POST /v1/authors', () => {
    it('should create an author as admin', async () => {
        const res = await request(app)
            .post('/v1/authors')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ name: 'Test Author', nationality: 'Test' })

        expect(res.status).toBe(201)
        expect(res.body.data.name).toBe('Test Author')
        authorId = res.body.data.id
    })

    it('should return 403 for client', async () => {
        const res = await request(app)
            .post('/v1/authors')
            .set('Authorization', `Bearer ${clientToken}`)
            .send({ name: 'Test Author', nationality: 'Test' })

        expect(res.status).toBe(403)
    })

    it('should return 422 on validation error', async () => {
        const res = await request(app)
            .post('/v1/authors')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ name: '' }) // missing nationality

        expect(res.status).toBe(422)
        expect(res.body.code).toBe('VALIDATION_ERROR')
    })


})

describe('GET /v1/authors/:id', () => {

    it('should return author details publicly', async () => {
        const res = await request(app).get(`/v1/authors/${authorId}`)
        expect(res.status).toBe(200)
        expect(res.body.data.name).toBe('Test Author')
    })

    it('should return 404 for non-existing author', async () => {
        const res = await request(app).get(`/v1/authors/99999`)
        expect(res.status).toBe(404)
    })
})

describe('PATCH /v1/authors/:id', () => {
    it('should update an author as admin', async () => {
        const res = await request(app)
            .patch(`/v1/authors/${authorId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ name: 'Updated Author', nationality: 'Updated Nationality' })

        expect(res.status).toBe(200)
        expect(res.body.data.name).toBe('Updated Author')
    })

    it('should return 403 for client', async () => {
        const res = await request(app)
            .patch(`/v1/authors/${authorId}`)
            .set('Authorization', `Bearer ${clientToken}`)
            .send({ name: 'Updated Author', nationality: 'Updated Nationality' })
        expect(res.status).toBe(403)
    })

    it('should return 404 for non-existing author', async () => {
        const res = await request(app)
            .patch(`/v1/authors/99999`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ name: 'Updated Author', nationality: 'Updated Nationality' })
        expect(res.status).toBe(404)
    })

})
describe('GET /v1/authors/:id/books', () => {
    it('should return books by author', async () => {
        const res = await request(app).get(`/v1/authors/${authorId}/books`)
        expect(res.status).toBe(200)
        expect(res.body.data).toBeInstanceOf(Array)
    })
})
describe('DELETE /v1/authors/:id', () => {
    it('should delete an author as admin', async () => {
        const res = await request(app)
            .delete(`/v1/authors/${authorId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send()
        expect(res.status).toBe(200)
    })
    it('should return 403 for client', async () => {
        const res = await request(app)
            .delete(`/v1/authors/${authorId}`)
            .set('Authorization', `Bearer ${clientToken}`)
            .send()
        expect(res.status).toBe(403)
    })
    it('should return 404 for non-existing author', async () => {
        const res = await request(app)
            .delete(`/v1/authors/99999`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send()
        expect(res.status).toBe(404)
    })

})
