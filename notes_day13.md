# Day 13 — Async Patterns & Error Flow

> Stack: Node.js, Express, Prisma | Type: Concept

---

## The Core Idea

JavaScript is single-threaded. Async patterns let it handle waiting (DB calls, HTTP requests, file reads) without freezing the server. Three patterns exist, each building on the last:

| Pattern | Syntax | Status |
|---------|--------|--------|
| Callbacks | `fs.readFile('f', (err, data) => {})` | Legacy |
| Promises | `.then().catch()` | Still used |
| async/await | `const data = await fs.promises.readFile('f')` | Standard |

async/await won — it's readable, debuggable, and works naturally with try/catch. Under the hood it's still Promises.

---

## The Express Async Problem

Express was built before async/await. It relies on `next(err)` being called synchronously. When an async route throws, Express never sees it — the rejection floats unhandled and the request hangs.

```javascript
// ❌ unhandled — Express never catches this
router.get('/', async (req, res) => {
  const books = await prisma.book.findMany() // throws → nobody catches it
  res.json(books)
})

// ✅ handled — but repetitive across every route
router.get('/', async (req, res, next) => {
  try {
    const books = await prisma.book.findMany()
    res.json({ data: books })
  } catch (err) {
    next(err)
  }
})
```

---

## The Fix — asyncHandler Wrapper

```javascript
// src/middleware/asyncHandler.js
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next)

module.exports = asyncHandler
```

Wraps any async route, catches any rejection, forwards it to the global error handler automatically. One line replaces every try/catch.

```javascript
// before — try/catch on every route
router.get('/', async (req, res, next) => {
  try {
    const books = await prisma.book.findMany()
    res.json({ data: books })
  } catch (err) {
    next(err)
  }
})

// after — clean
router.get('/', asyncHandler(async (req, res) => {
  const books = await prisma.book.findMany()
  res.json({ data: books })
}))
```

---

## How the Full Error Flow Works

```
async route throws
  → asyncHandler catches it via .catch(next)
    → next(err) called
      → global error handler receives err
        → checks type (Prisma? AppError? unknown?)
          → sends clean JSON response
```

Prisma errors are just one type of error that lands in the global handler. Without asyncHandler they'd never reach it.

---

## Global Prisma Error Handling

Added to the top of the existing global error handler — not a second handler:

```javascript
app.use((err, req, res, next) => {
  // Prisma known errors — handle first
  if (err instanceof PrismaClientKnownRequestError) {
    if (err.code === 'P2025') {
      return res.status(404).json({
        status: 404,
        code: 'NOT_FOUND',
        message: 'Record not found',
        timestamp: new Date().toISOString(),
        path: req.path
      })
    }
    if (err.code === 'P2002') {
      return res.status(409).json({
        status: 409,
        code: 'CONFLICT',
        message: 'A record with this value already exists',
        timestamp: new Date().toISOString(),
        path: req.path
      })
    }
  }

  // existing AppError + unknown error handling below
  const status  = err.status || 500
  // ...
})
```

### Prisma error codes to know

| Code | Meaning | HTTP status |
|------|---------|-------------|
| `P2025` | Record not found | 404 |
| `P2002` | Unique constraint violated | 409 |
| `P2003` | Foreign key constraint failed | 409 |
| `P2000` | Value too long for column | 422 |

---

## Prisma include — how it works

`include` is not a JavaScript variable — it's a field name from your Prisma schema. Prisma reads the relation defined in the schema and translates it to a SQL JOIN:

```javascript
prisma.book.findUnique({
  where: { id },
  include: { author: true }  // ← 'author' comes from schema, not JS scope
})
```

Prisma translates this to:
```sql
SELECT books.*, authors.*
FROM books
JOIN authors ON books.authorId = authors.id
WHERE books.id = ?
```

Result:
```json
{
  "id": 1,
  "title": "Clean Code",
  "author": { "id": 1, "name": "Robert Martin" }
}
```

**Casing matters** — `Author` throws, `author` works. Must match the field name in your schema exactly.

---

## Process Safety Nets

Add at the bottom of `index.js`, just before `app.listen`:

```javascript
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason)
  // in production: log to monitoring service, then gracefully shut down
})

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err)
  process.exit(1) // process is in unknown state — always exit
})
```

- `unhandledRejection` — Promise rejected with no `.catch()` anywhere
- `uncaughtException` — synchronous throw with no try/catch anywhere — always exit, process state is unknown

---

## Key Rules

- Always wrap async routes with `asyncHandler` — never rely on try/catch per route
- Prisma errors go in the global error handler — not handled per route
- `include` field names come from schema, not JS — casing must match exactly
- `process.exit(1)` on uncaught exception — continuing is dangerous
- asyncHandler is what *delivers* errors to the handler — Prisma blocks handle *what to do* with them

---

## Quiz Score: 4/4 ✅

---

## Commit

```
feat: add asyncHandler, global Prisma error handling, process safety nets
```