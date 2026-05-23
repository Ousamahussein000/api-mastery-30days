# Day 14 — Project: Authenticated Bookstore API

> Stack: Node.js, Express, Prisma v5, PostgreSQL, JWT, Zod, bcrypt | Type: Project

---

## What Was Built

A fully authenticated, production-shaped bookstore API with real database persistence, role-based access control, input validation, and transactional order processing.

---

## Architecture

```
prisma/
  schema.prisma
  seed.js
src/
  middleware/
    authenticate.js
    authorize.js
    validate.js
    asyncHandler.js
    logger.js
    notFound.js
  routes/
    auth.js
    books.js
    authors.js
    categories.js
    orders.js
  errors.js
  prisma.js
index.js
.env
.gitignore
```

---

## Database Schema

```
User        → has many Orders
Author      → has many Books
Category    → has many Books
Book        → belongs to Author, belongs to Category, has many OrderItems
Order       → belongs to User, has many OrderItems
OrderItem   → belongs to Order, belongs to Book
```

Key design decisions:
- `OrderItem` exists because one order can have many books and one book can appear in many orders
- `price` is stored on `OrderItem` — snapshot of price at time of purchase, not current price
- `role` is assigned server-side on register — never from client input
- `password` is hashed with bcrypt before saving — never stored plain text

---

## Routes

```
POST /v1/auth/register        public
POST /v1/auth/login           public
GET  /v1/auth/me              authenticated

GET    /v1/books              public — search, filter by category, sort, paginate
GET    /v1/books/:id          public — includes author and category
POST   /v1/books              admin only
PATCH  /v1/books/:id          admin only
DELETE /v1/books/:id          admin only

GET    /v1/authors            public — search by name
GET    /v1/authors/:id        public — includes books
POST   /v1/authors            admin only
PATCH  /v1/authors/:id        admin only
DELETE /v1/authors/:id        admin only — blocked if author has books

GET    /v1/categories         public — filter by section
GET    /v1/categories/:id     public — includes books count
POST   /v1/categories         admin only
PATCH  /v1/categories/:id     admin only
DELETE /v1/categories/:id     admin only — blocked if category has books

POST   /v1/orders             authenticated client
GET    /v1/orders/me          authenticated client — own orders only
GET    /v1/orders             admin only — all orders, paginated
GET    /v1/orders/:id         admin only
DELETE /v1/orders/:id         admin only — restores stock
```

---

## Prisma Transaction — Order Flow

```javascript
await prisma.$transaction(async (tx) => {
  // 1. verify stock + calculate total using bookMap
  // 2. create Order + OrderItems in one operation
  // 3. decrement stock for each book
  return order
})
```

`tx` = Prisma inside a safety bubble. All steps succeed together or none do. If stock check fails, no order is created. If order creation fails, no stock is reduced.

**Delete order transaction — reverse flow:**
```javascript
await prisma.$transaction(async (tx) => {
  // 1. fetch order with items
  // 2. restore stock for each item
  // 3. deleteMany OrderItems first (foreign key)
  // 4. delete Order
})
```

---

## Password Validation + Hashing

```javascript
// Zod — validate format before touching DB
password: z.string()
  .min(8)
  .regex(/[A-Z]/, 'must contain uppercase')
  .regex(/[0-9]/, 'must contain a number')
  .regex(/[^a-zA-Z0-9]/, 'must contain a special character')

// bcrypt — hash before saving
const hashed = await bcrypt.hash(password, 10)

// bcrypt — compare on login
const valid = await bcrypt.compare(plainText, hashedFromDB)
```

---

## Middleware Order

```
authenticate → authorize → validateParams → validate → asyncHandler(handler)
```

---

## Key Lessons

- `Promise.all([findMany, count])` — runs both queries simultaneously, faster than sequential
- `where` built dynamically — only applied filters get sent to Prisma
- `bookMap` pattern — fetch all books once in a loop, reuse for price and stock check
- `module.exports = router` must be at the bottom of every route file
- JWT payload key must match everywhere — `req.user.id` vs `req.user.userId`
- `GET /me` must be defined before `GET /:id` — Express matches top to bottom

---

## Tested Flows

- Register → login → get token → access protected route ✓
- Admin creates book, client cannot ✓
- Client places order → stock decreases ✓
- Admin deletes order → stock restored ✓
- Order with quantity > stock → 409 ✓
- Client hits admin-only route → 403 ✓
- Invalid token → 401 ✓

---

## Commit

```
feat: build full authenticated bookstore API — Day 14 project
```