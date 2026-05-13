# Day 11 — RBAC & Route Guards

> Stack: Node.js, Express, jsonwebtoken | Type: Practice

---

## The Core Idea

Day 10 answered **who are you**. Day 11 answers **what are you allowed to do**.

**RBAC — Role Based Access Control.** Assign users a role, and guard routes based on that role. Every user gets `'user'` by default. Admins get `'admin'`. Your middleware checks the role — not the individual user.

```
authenticate    → who are you?       → sets req.user
authorize(role) → are you allowed?   → checks req.user.role
```

Two separate middlewares. Always used together. Always in this order.

---

## The authorize Middleware

```javascript
// middleware/authorize.js
const { AppError, ErrorCodes } = require('../errors')

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(new AppError(403, ErrorCodes.FORBIDDEN,
      'You do not have permission to perform this action'))
  }
  next()
}

module.exports = authorize
```

- `...roles` — accepts one or more roles: `authorize('admin')` or `authorize('admin', 'editor')`
- Reads `req.user.role` — set by `authenticate` in the previous middleware
- Returns **403** not 401 — you know who they are, they just can't do this

---

## 401 vs 403 — the distinction

| Code | Meaning |
|------|---------|
| 401 | I don't know who you are — please log in |
| 403 | I know exactly who you are — you cannot do this |

---

## Correct Middleware Order

```
authenticate → authorize → validateParams → validate → handler
```

No point validating a request from someone who isn't logged in. Auth first, always.

```javascript
// ✅ correct order
router.post('/',
  authenticate,
  authorize('admin'),
  validate(CreateBookSchema),
  (req, res) => { }
)

// ❌ wrong — validating before checking who they are
router.post('/',
  validate(CreateBookSchema),
  authenticate,
  authorize('admin'),
  (req, res) => { }
)
```

---

## Route Protection Pattern

```javascript
// public — anyone
router.get('/',      (req, res) => { })
router.get('/:id',   (req, res) => { })

// admin only
router.post('/',     authenticate, authorize('admin'), (req, res) => { })
router.patch('/:id', authenticate, authorize('admin'), (req, res) => { })
router.delete('/:id',authenticate, authorize('admin'), (req, res) => { })
```

---

## Role Must Be in the JWT Payload

```javascript
// register — assign role to user
const user = { id: users.length + 1, name, email, password, role: 'admin' }

// sign — include role in token
const token = jwt.sign(
  { userId: user.id, role: user.role },  // ← role must be here
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
)
```

If `role` is missing from `jwt.sign()`, `req.user.role` is `undefined` and every request gets 403.

---

## Bugs Fixed Today

| Bug | Fix |
|-----|-----|
| `order` was a string `'-1'` | → must be number `-1` for multiplication to work |
| `sort` callback had `{}` with no return | → remove `{}` so arrow function returns the expression |
| `field` extracted only inside `if` block | → extract it outside, always strip the `-` prefix |

Correct sorting:
```javascript
const order = req.query.sort.startsWith('-') ? -1 : 1
const field = req.query.sort.replace('-', '')
result.sort((a, b) => (a[field] > b[field] ? 1 : a[field] < b[field] ? -1 : 0) * order)
```

---

## Key Rules

- `authorize` must always come after `authenticate` — it reads `req.user` which authenticate sets
- Role must be in the JWT payload — not just in the database
- 403 for wrong role, 401 for missing/invalid token
- Auth middleware order: `authenticate → authorize → validate → handler`

---

## Quiz Score: 4/4 ✅

---

## Commit

```
feat: add RBAC authorization middleware to books router
```