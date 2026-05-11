# Day 9 — Input Validation

> Stack: Node.js, Express, Zod | Type: Practice

---

## Core Idea

Validate at the boundary — trust nothing from outside. Bad input must be caught before it touches business logic or the database. Without validation, a wrong type reaches Prisma, crashes, and leaks a raw 500. It should be a 422, caught at the door.

---

## Zod — Key Methods

| Method | Behavior |
|--------|----------|
| `safeParse()` | Never throws — returns `{ success, data }` or `{ success, error }` |
| `parse()` | Throws on failure — avoid in Express routes |
| `.partial()` | Makes all fields optional — use for PATCH schemas |
| `z.coerce.number()` | Converts `"5"` → `5` — use for params and query strings |

---

## The validate Middleware

```javascript
// middleware/validate.js
const { AppError, ErrorCodes } = require('../errors')

const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body)
  if (!result.success) {
    const errors = result.error.issues.map(e => ({  // ← .issues not .errors
      field:   e.path[0] || 'unknown',
      message: e.message
    }))
    return next(new AppError(422, ErrorCodes.VALIDATION_ERROR,
      'Request validation failed', errors))
  }
  req.body = result.data  // ← replace raw body with Zod's clean output
  next()
}

module.exports = { validate, validateParams }
```

---

## Schemas

```javascript
const CreateBookSchema = z.object({
  title:     z.string().min(1, 'title is required'),
  price:     z.number().positive('price must be positive'),
  author_id: z.number().int().positive(),
  stock:     z.number().int().min(0).optional().default(0)
})

const UpdateBookSchema = CreateBookSchema.partial()
// every field optional but still validated if present
```

---

## Param Validation

Params are always strings — `req.params.id` is `"5"` not `5`. Use `z.coerce.number()`:

```javascript
const IdSchema = z.object({
  id: z.coerce.number().int().positive()
})

const validateParams = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.params)
  if (!result.success) return next(new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Invalid parameters'))
  req.params = result.data
  next()
}
```

---

## Wiring to Routes

```javascript
router.post('/',    validate(CreateBookSchema),           (req, res) => { })
router.patch('/:id', validate(UpdateBookSchema),          (req, res) => { })
router.get('/:id',  validateParams(IdSchema),             (req, res) => { })
```

---

## Bugs Fixed Today

| Bug | Fix |
|-----|-----|
| `result.error.errors` | → `result.error.issues` (Zod's actual property) |
| `'details'` string literal | → `errors` variable |
| Named vs default export mismatch | → `module.exports = { validate, validateParams }` |

---

## Key Rules

- Always use `safeParse()` in Express — never `parse()`
- Always do `req.body = result.data` after successful parse
- Use `.partial()` for PATCH — don't rewrite the schema
- Validate `req.params` and `req.query` separately from `req.body`
- `req.params` values are always strings — use `z.coerce.number()`

---

## Quiz Score: 3/4

Missed: **Q3** — `req.body = result.data` replaces raw input with Zod's coerced, stripped version. `req.body` is not read-only.

---

## Commit

```
refactor: use zod for input validation in books router
```
