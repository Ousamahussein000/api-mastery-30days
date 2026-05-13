# Day 10 — JWT Auth From Scratch

> Stack: Node.js, Express, jsonwebtoken, dotenv | Type: Concept

---

## The Core Idea

The server is stateless — it remembers nothing between requests. Instead of sessions, you give the client a **signed token** after login. They send it with every request. You verify the signature, extract the user, done.

---

## Token Structure

A JWT is three base64-encoded parts separated by dots:

```
eyJhbGciOiJIUzI1NiJ9  .  eyJ1c2VySWQiOjV9  .  abc123xyz
        header                  payload            signature
```

### Header
Contains the algorithm used to sign the token:
```json
{ "alg": "HS256", "typ": "JWT" }
```

### Payload
The data you stored. Readable by **anyone** — base64 is encoding, not encryption:
```json
{ "userId": 5, "role": "admin", "iat": 1716300000, "exp": 1716904800 }
```
- `iat` — issued at (Unix timestamp, added automatically)
- `exp` — expiry (added automatically from `expiresIn`)

**Never store passwords, sensitive PII, or secrets in the payload.**

### Signature
```
HMAC_SHA256(base64(header) + "." + base64(payload), JWT_SECRET)
```
Only your server can produce this — because only your server knows `JWT_SECRET`. When a token arrives, you re-compute the signature. If it matches, the token is genuine and untampered.

---

## jwt.sign() — in detail

```javascript
const token = jwt.sign(
  { userId: user.id, role: user.role },  // payload — what you want to store
  process.env.JWT_SECRET,                // secret — never hardcode this
  { expiresIn: '7d' }                    // options
)
```

- First argument — the payload object. Keep it small — it travels with every request.
- Second argument — the secret. Must stay on the server. If leaked, anyone can forge tokens.
- Third argument — options. `expiresIn` accepts `'7d'`, `'1h'`, `'15m'`, or seconds as a number.
- Returns a string — the signed token. Send this to the client.

---

## jwt.verify() — in detail

```javascript
try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET)
  // decoded = { userId: 5, role: 'admin', iat: ..., exp: ... }
} catch (err) {
  // throws JsonWebTokenError — invalid signature or malformed
  // throws TokenExpiredError — valid but expired
}
```

- First argument — the token string extracted from the Authorization header.
- Second argument — the same secret used to sign it.
- **Throws on failure** — unlike Zod's safeParse. Always wrap in try/catch.
- On success returns the decoded payload — attach to `req.user` for downstream handlers.

Two error types to know:
| Error | Cause |
|-------|-------|
| `JsonWebTokenError` | Tampered, malformed, or wrong secret |
| `TokenExpiredError` | Valid token but past its expiry |

---

## The authenticate Middleware

```javascript
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError(401, ErrorCodes.UNAUTHORIZED, 'No token provided'))
  }

  const token = authHeader.split(' ')[1]  // "Bearer abc123" → "abc123"

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded
    next()
  } catch (err) {
    return next(new AppError(401, ErrorCodes.UNAUTHORIZED, 'Invalid or expired token'))
  }
}
```

---

## Auth Routes

```javascript
// register — create user, return token
router.post('/register', validate(RegisterSchema), (req, res, next) => {
  if (users.find(u => u.email === email))
    return next(new AppError(409, ErrorCodes.CONFLICT, 'Email already in use'))
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' })
  res.status(201).json({ token })
})

// login — verify credentials, return token
router.post('/login', validate(LoginSchema), (req, res, next) => {
  const user = users.find(u => u.email === email && u.password === password)
  if (!user) return next(new AppError(401, ErrorCodes.UNAUTHORIZED, 'Invalid credentials'))
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' })
  res.json({ token })
})

// protected route
router.get('/me', authenticate, (req, res) => {
  const user = users.find(u => u.id === req.user.userId)
  res.json({ id: user.id, name: user.name, email: user.email })
})
```

---

## Environment Variables

```
# .env
JWT_SECRET=some_long_random_string_here
```

```javascript
// index.js — must be first line
require('dotenv').config()
```

- Never hardcode the secret — if committed to git, anyone can forge tokens
- Always add `.env` to `.gitignore`

---

## What to put in the payload

| ✅ Safe | ❌ Never |
|--------|---------|
| userId | password |
| role | sensitive PII |
| email (optional) | any secret |

---

## Key Rules

- Payload is base64 — readable by anyone, not encrypted
- `jwt.verify()` throws — always wrap in try/catch
- Extract token with `authHeader.split(' ')[1]`
- Attach decoded payload to `req.user` — available in all downstream handlers
- Secret in `.env` — never in source code

---

## Quiz Score: 4/4 ✅

---

## Commit

```
feat: add JWT auth — register, login, authenticate middleware
```