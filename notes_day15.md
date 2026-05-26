# Day 15 — Rate Limiting

> Stack: Node.js, Express, express-rate-limit, rate-limit-redis, ioredis, Docker | Type: Advanced

---

## The Core Idea

Without rate limiting anyone can send unlimited requests and crash your server. Rate limiting tracks requests per IP in a time window and returns `429 Too Many Requests` when the limit is hit.

Protects against:
- **Brute force** — password guessing on login
- **DDoS** — flooding the server to make it unavailable
- **Abuse** — one client degrading the API for everyone else

---

## The Four Algorithms

### Fixed Window
Divides time into fixed buckets. Counter resets at the start of each window.

**Problem — boundary burst:** a client can send 100 requests at 00:59 and 100 more at 01:01 — 200 requests in 2 seconds, both windows allow it.

Best for: internal tools, admin panels where precision doesn't matter.

### Sliding Window
Window rolls with time — always looks back from now. No boundary burst problem.

Best for: general API endpoints, public routes. **Default in express-rate-limit v6+.**

### Token Bucket
Bucket fills with tokens at a fixed rate. Each request consumes one token. Allows controlled bursting — useful when clients legitimately need to send multiple requests at once.

Best for: developer-facing APIs, SDKs, mobile apps.

### Leaky Bucket
Requests queue and process at a fixed rate. No bursting — smooth consistent throughput.

Best for: payment processing, email sending — anywhere consistency matters more than speed.

### Algorithm Summary

| Algorithm | Burst | Precision | Best for |
|-----------|-------|-----------|---------|
| Fixed Window | Yes (boundary) | Low | Internal tools |
| Sliding Window | No | High | General APIs |
| Token Bucket | Yes (controlled) | High | Developer APIs |
| Leaky Bucket | No | High | Payment, email |

**Rule: sliding window for everything unless you have a specific reason.**

---

## Decision Framework

### By endpoint type

| Endpoint | Risk | Limit |
|----------|------|-------|
| `POST /auth/login` | Brute force | 5 req / 15 min |
| `POST /auth/register` | Spam | 10 req / hour |
| `POST/PATCH/DELETE` | Data abuse | 30 req / 15 min |
| `GET` public routes | Overload | 200 req / 15 min |
| Global fallback | Everything | 100 req / 15 min |

### By caller type

| Caller | Algorithm |
|--------|-----------|
| End users | Sliding Window |
| Developers/SDKs | Token Bucket |
| Payment/email systems | Leaky Bucket |
| Internal tools | Fixed Window or none |

---

## Why Redis Store

```
In-memory store (default)
  → resets on server restart
  → not shared across multiple instances
  → useless in production at scale

Redis store
  → persists across restarts
  → shared across all server instances
  → sub-millisecond reads
  → industry standard
```

Production stack: `express-rate-limit` + `rate-limit-redis` + `ioredis`

---

## The Code

```javascript
const { rateLimit } = require('express-rate-limit')
const { RedisStore } = require('rate-limit-redis')
const Redis = require('ioredis')

// one Redis connection, shared across all limiters
const redis = new Redis({ host: 'localhost', port: 6379 })

redis.on('connect', () => console.log('Redis connected'))
redis.on('error',   (err) => console.error('Redis error:', err))

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,
  standardHeaders: true,      // sends RateLimit-* headers
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args) => redis.call(...args)
  }),
  message: { status: 429, code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests' }
})

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,                     // strictest — brute force protection
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ sendCommand: (...args) => redis.call(...args) }),
  message: { status: 429, code: 'RATE_LIMIT_EXCEEDED', message: 'Too many login attempts' }
})

const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,                   // lenient — public read routes
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ sendCommand: (...args) => redis.call(...args) }),
  message: { status: 429, code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests' }
})

module.exports = { globalLimiter, authLimiter, publicLimiter }
```

---

## Wiring

```javascript
// index.js — global limiter, skip auth routes to avoid stacking
app.use((req, res, next) => {
  if (req.path.startsWith('/v1/auth')) return next()
  globalLimiter(req, res, next)
})

// auth.js — strict limiter on login + register only
router.post('/login',    authLimiter, validate(LoginSchema),    asyncHandler(...))
router.post('/register', authLimiter, validate(RegisterSchema), asyncHandler(...))

// books.js — lenient limiter on public GET routes
router.get('/',    publicLimiter, asyncHandler(...))
router.get('/:id', publicLimiter, asyncHandler(...))
```

---

## Redis Counters — How They're Stored

Each limiter stores counters under its own key namespace — they never interfere:

```
Redis
  ├── rl:global:192.168.1.1   → globalLimiter counter
  ├── rl:auth:192.168.1.1     → authLimiter counter
  └── rl:public:192.168.1.1   → publicLimiter counter
```

Reset all counters:
```bash
docker exec -it redis redis-cli FLUSHALL
```

---

## Response Headers

Every response includes:
```
RateLimit-Limit: 5
RateLimit-Remaining: 3
RateLimit-Reset: 900
Retry-After: 900    ← only on 429
```

---

## Docker Setup

Redis has no official Windows build — run it in Docker:

```bash
# start Redis container
docker run -d --name redis -p 6379:6379 redis:alpine

# confirm running
docker ps

# test connection
docker exec -it redis redis-cli ping  # → PONG
```

Current architecture:
```
Your machine
  ├── Node.js (running directly)
  └── Docker
        └── Container: redis
```

Day 20 puts everything in containers together with Docker Compose.

---

## Production Reality

```
Cloudflare/Nginx   → blocks DDoS at edge
  → express-rate-limit + Redis  → enforces per-user business rules
    → your API
```

Infrastructure handles volume. Application handles business logic limits.

---

## Quiz Score: 4/4 ✅

---

## Commit

```
feat: add rate limiting with Redis — global, auth, and public limiters
```