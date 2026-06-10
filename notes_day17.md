# Day 17 — Testing APIs

> Stack: Node.js, Express, Vitest, Supertest | Type: Practice

---

## The Core Idea

Manual testing with Postman doesn't scale. Automated tests run in seconds, catch regressions instantly, and serve as living documentation of what your API does.

```
Manual testing:  change a route → manually retest 20 endpoints → miss edge cases
Automated tests: change a route → run npm test → know instantly what broke
```

---

## The Three Test Types

### Unit Tests
Test one function in isolation. No DB, no HTTP, pure input/output.
```javascript
expect(calculateTotal([{ price: 10, quantity: 2 }])).toBe(20)
```
Use when: utility functions, business logic that doesn't touch DB or HTTP.

### Integration Tests
Multiple layers, real DB, no HTTP.
```javascript
const user = await userService.create({ email: 'test@test.com' })
expect(user.id).toBeDefined()
```
Use when: DB queries, Prisma interactions, service functions.

### End-to-End (E2E) Tests
Full HTTP request/response cycle — closest to real usage. What you built today.
```javascript
const res = await request(app).post('/v1/auth/login').send({ email, password })
expect(res.status).toBe(200)
expect(res.body.token).toBeDefined()
```
Use when: testing complete route behavior including middleware, validation, and error handling.

---

## Setup

```bash
npm install -D vitest supertest cross-env
```

```json
// package.json scripts
"test":     "vitest",
"test:run": "cross-env NODE_ENV=test vitest run"
```

```javascript
// vitest.config.js
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.js']
  }
})
```

---

## Why Split app.js from index.js

Supertest needs the Express app without starting the server. If `app.listen()` runs during tests you get port conflicts.

```javascript
// src/app.js — builds app, exports it, never calls listen()
const app = express()
app.use(...)
module.exports = app  // ← Supertest imports this

// index.js — only starts the server
const app = require('./src/app')
app.listen(3000)  // ← only runs when you do node index.js
```

---

## How Supertest Works

```javascript
const res = await request(app)
  .post('/v1/auth/login')                          // method + path
  .send({ email, password })                       // request body
  .set('Authorization', `Bearer ${token}`)         // headers
```

Fires a real HTTP request directly into Express in memory — no port, no network, ultra fast.

---

## How describe, it, and expect Work

```javascript
describe('POST /v1/auth/login', () => {
  // group of related tests

  it('should return 200 with token', async () => {
    // one individual test

    const res = await request(app)
      .post('/v1/auth/login')
      .send({ email, password })

    expect(res.status).toBe(200)
    // if status is not 200 → test FAILS → shown in red
    // if status is 200     → test PASSES → shown in green
  })
})
```

---

## How beforeAll Works

```javascript
let adminToken  // shared across all tests in this file

beforeAll(async () => {
  // runs ONCE before any test starts
  // create admin directly in DB — /register always creates 'client' role
  const admin = await prisma.user.create({
    data: { name: 'Admin', email: 'admin@test.com', password: hashed, role: 'admin' }
  })

  // login to get token once — reused across all tests
  const res  = await request(app).post('/v1/auth/login').send({...})
  adminToken = res.body.token
})
```

Fetches token once, shares it. Without `beforeAll` you'd call `/login` inside every test — slow and repetitive.

---

## Why setup.js Cleans the DB

```javascript
// tests/setup.js
beforeAll(async () => {
  // wipe DB before suite runs — order matters, children before parents
  await prisma.orderItem.deleteMany()
  await prisma.order.deleteMany()
  await prisma.book.deleteMany()
  await prisma.author.deleteMany()
  await prisma.category.deleteMany()
  await prisma.user.deleteMany()
})
```

Tests must be **deterministic** — same result every run. Leftover data from previous runs causes flaky tests (sometimes pass, sometimes fail). Clean slate = reliable tests.

---

## Handling Environment in Tests

Rate limiters, Redis connections must be disabled during tests:

```javascript
// rateLimiter.js
const passThrough = (req, res, next) => next()

if (process.env.NODE_ENV === 'test') {
  module.exports = { globalLimiter: passThrough, authLimiter: passThrough, publicLimiter: passThrough }
} else {
  // real limiters with Redis
}
```

```javascript
// cache.js
if (process.env.NODE_ENV === 'test') {
  redis = {
    get:  async () => null,  // always cache miss
    set:  async () => null,
    del:  async () => null,
    incr: async () => null,
  }
} else {
  redis = new Redis({ host: 'localhost', port: 6379 })
}
```

`NODE_ENV` must never be set in `.env` — set it per command:
```bash
cross-env NODE_ENV=test vitest run
```

---

## The Full Test Flow

```
npm run test:run
  ↓
Vitest starts
  ↓
setup.js → wipes DB
  ↓
auth.test.js
  → register → 201 ✓
  → duplicate email → 409 ✓
  → invalid email → 422 ✓
  → login → 200 ✓
  → wrong password → 401 ✓
  ↓
books.test.js
  → beforeAll → creates admin + client in DB → gets tokens
  → GET /books → 200 ✓
  → POST as admin → 201 ✓
  → POST as client → 403 ✓
  → POST no token → 401 ✓
  → GET /books/99999 → 404 ✓
```

---

## Key Rules

- Split `app.js` from `index.js` — Supertest needs the app without the server
- Always clean DB in `setup.js` — deterministic tests
- Use `beforeAll` for setup shared across tests — not inside each test
- Never set `NODE_ENV` in `.env` — set it per command with `cross-env`
- Disable Redis and rate limiters in test environment
- Test happy path + most important error cases — not everything

---

## Final Score: 10/10 ✅

---

## Commit

```
feat: add automated tests for auth and books routes
```