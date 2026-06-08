import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../src/app.js'

const testUser = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'Test@1234'
}

describe('POST /v1/auth/register', () => {
    it('should register a new user and return a token', async () => {
        const res = await request(app)
            .post('/v1/auth/register')
            .send(testUser)

        expect(res.status).toBe(201)
        expect(res.body.token).toBeDefined()
    })

    it('should return 409 if email already exists', async () => {
        const res = await request(app)
            .post('/v1/auth/register')
            .send(testUser) // same email again

        expect(res.status).toBe(409)
        expect(res.body.code).toBe('CONFLICT')
    })

    it('should return 422 if email is invalid', async () => {
        const res = await request(app)
            .post('/v1/auth/register')
            .send({ ...testUser, email: 'notanemail' })

        expect(res.status).toBe(422)
        expect(res.body.code).toBe('VALIDATION_ERROR')
    })
})

describe('POST /v1/auth/login', () => {
    it('should login and return a token', async () => {
        const res = await request(app)
            .post('/v1/auth/login')
            .send({ email: testUser.email, password: testUser.password })

        expect(res.status).toBe(200)
        expect(res.body.token).toBeDefined()
    })

    it('should return 401 on wrong password', async () => {
        const res = await request(app)
            .post('/v1/auth/login')
            .send({ email: testUser.email, password: 'wrongpassword' })

        expect(res.status).toBe(401)
        expect(res.body.code).toBe('UNAUTHORIZED')
    })
})