# Day 12 — Prisma + PostgreSQL

> Stack: Node.js, Express, Prisma v5, PostgreSQL | Type: Practice

---

## The Core Idea

In-memory arrays reset on every server restart — they're not a database. PostgreSQL persists data to disk. Prisma sits between Express and PostgreSQL — you write JavaScript, Prisma translates it to SQL.

Three pieces:
- **Schema** — defines your models in `prisma/schema.prisma`
- **Migration** — turns schema changes into real SQL that creates tables
- **Client** — generated JS client you import and query in your routes

---

## Setup

```bash
npm install prisma@5 --save-dev
npm install @prisma/client@5
npx prisma init
```

> **Node version matters** — Prisma v5 requires Node v20 LTS. v24 breaks it. Use nvm to manage versions.

---

## The Three Daily Commands

```bash
npx prisma migrate dev --name init   # create tables + generate client
npx prisma generate                  # regenerate client without migration
npx prisma db seed                   # run seed file to populate DB
npx prisma studio                    # visual browser UI for your database
```

---

## Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        Int      @id @default(autoincrement())
  name      String
  email     String   @unique
  password  String
  role      String   @default("user")
  createdAt DateTime @default(now())
}

model Author {
  id          Int      @id @default(autoincrement())
  name        String
  nationality String
  bio         String?
  createdAt   DateTime @default(now())
  books       Book[]
}

model Book {
  id        Int      @id @default(autoincrement())
  title     String
  price     Float
  stock     Int      @default(0)
  createdAt DateTime @default(now())
  author    Author   @relation(fields: [authorId], references: [id])
  authorId  Int
}
```

### Schema decorators

| Decorator | What it does |
|-----------|-------------|
| `@id` | Primary key |
| `@default(autoincrement())` | Auto increment 1, 2, 3... |
| `@default(now())` | Auto set to current timestamp |
| `@unique` | No duplicate values allowed |
| `@relation(...)` | Foreign key relationship |
| `Book[]` | Reverse relation — author has many books |
| `String?` | Optional field (nullable) |

---

## Prisma Client

Create once, import everywhere:

```javascript
// src/prisma.js
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
module.exports = prisma
```

---

## Prisma Queries vs Array Operations

| Array | Prisma |
|-------|--------|
| `books.filter()` | `prisma.book.findMany()` |
| `books.find(b => b.id === id)` | `prisma.book.findUnique({ where: { id } })` |
| `books.push()` | `prisma.book.create({ data })` |
| `Object.assign(book, body)` | `prisma.book.update({ where, data })` |
| `books.splice(index, 1)` | `prisma.book.delete({ where: { id } })` |

---

## include vs select

```javascript
// include — adds full relation on top of all fields
prisma.book.findUnique({
  where: { id },
  include: { author: true }
})

// select inside include — only specific fields from relation
prisma.book.findUnique({
  where: { id },
  include: {
    author: { select: { id: true, name: true } }
  }
})
```

---

## Critical Rules

**1. Every Prisma route must be async**
```javascript
// ❌ wrong
router.get('/:id', (req, res, next) => {
  const book = await prisma.book.findUnique(...)
})

// ✅ correct
router.get('/:id', async (req, res, next) => {
  const book = await prisma.book.findUnique(...)
})
```

**2. Never pass `req.body` directly to Prisma**
```javascript
// ❌ wrong — client could send { id: 999 } and overwrite protected fields
prisma.book.update({ where: { id }, data: req.body })

// ✅ correct — destructure only what you allow
const { title, price, stock } = req.body
prisma.book.update({
  where: { id },
  data: {
    ...(title !== undefined && { title }),
    ...(price !== undefined && { price }),
    ...(stock !== undefined && { stock }),
  }
})
```

---

## Bug Fixed — Foreign Key Constraint on Author Delete

Deleting an author who has books throws a PostgreSQL error `23001` — the DB refuses to delete because books still reference that author.

**Fix — check before deleting:**
```javascript
const bookCount = await prisma.book.count({ where: { authorId: id } })

if (bookCount > 0) {
  return next(new AppError(409, ErrorCodes.CONFLICT,
    `Cannot delete author — they have ${bookCount} book(s). Delete or reassign the books first.`
  ))
}
```

Alternative is `onDelete: Cascade` in the schema — automatically deletes all books when the author is deleted. Not used here because losing books accidentally is too destructive.

---

## Seeding

```bash
npx prisma db seed
```

- Authors seeded first — books need their `authorId`
- `createMany()` doesn't return created records in PostgreSQL — seed authors one by one to get their ids back
- Users seeded with plain text passwords for now — bcrypt comes with the register route

---

## Open Questions for Later

- How to handle Prisma errors globally in the error handler instead of per-route?
- How to invalidate a JWT on logout?
- Should `authorId` be updatable via `PATCH /v1/books/:id`?

---

## Commit

```
feat: replace in-memory arrays with Prisma + PostgreSQL
```
