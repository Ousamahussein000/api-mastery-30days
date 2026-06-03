# Day 16 — Caching with Redis

> Stack: Node.js, Express, Redis, ioredis | Type: Advanced

---

## The Core Idea

Redis is a key-value store that lives entirely in memory. PostgreSQL reads from disk in 10-100ms. Redis reads from RAM in 0.1-1ms. Caching stores the result of expensive DB queries in Redis so subsequent requests never touch the database.

```
Without cache: 1000 requests → 1000 PostgreSQL queries
With cache:    1000 requests → 1 PostgreSQL query + 999 Redis reads
```

---

## How Redis Sits Between Client and Database

Redis doesn't automatically know about your database. Your code is the bridge — Cache Aside pattern:

```
Request arrives
  → check Redis first
    → HIT  → return cached data, DB never touched
    → MISS → query PostgreSQL → store in Redis → return data
```

Cache starts empty. First request always hits the DB (cold cache). Every request after hits Redis until TTL expires.

---

## TTL — Time To Live

Every cached value gets an expiry. After it expires Redis deletes it automatically:

```javascript
await redis.set(cacheKey, JSON.stringify(result), 'EX', 60) // expires in 60s
```

| Data | TTL |
|------|-----|
| Books list | 60s |
| Single book | 120s |
| Categories | 300s |
| Orders | Never cache |
| Auth data | Never cache |

---

## Cache Invalidation Evolution

### ❌ redis.keys() — never use in production
```javascript
const keys = await redis.keys('books:*')
// scans every key in Redis
// with 10M keys → blocks Redis for seconds
// Redis is single-threaded → entire API freezes
```

### ❌ redis.scan() — better but still problematic
```javascript
// non-blocking but still collects and deletes keys
// hits Redis key limits at scale (100,000+ keys)
// still requires deletion operations
```

### ✅ Cache Versioning — production standard
No scanning. No deleting. Scales to billions of keys.

```javascript
// get current version
const getVersion = async (namespace) => {
  const version = await redis.get(`version:${namespace}`)
  return version || '1'
}

// bump version — makes all old keys unreachable
const invalidate = async (namespace) => {
  await redis.incr(`version:${namespace}`)
}
```

Cache keys include the version:
```javascript
const version  = await getVersion('books')
const cacheKey = `books:v${version}:${JSON.stringify(req.query)}`
```

When data changes:
```
version:books = 1 → books:v1:{} cached

Admin patches a book
  → redis.incr('version:books') → version:books = 2
  → books:v1:{} still exists but never requested again
  → expires naturally via TTL — zero deletions

Next request → books:v2:{} → cache miss → fresh DB data → cached
```

---

## src/cache.js

```javascript
const Redis = require('ioredis')

const redis = new Redis({ host: 'localhost', port: 6379 })

redis.on('connect', () => console.log('Redis cache connected'))
redis.on('error',   (err) => console.error('Redis cache error:', err))

const getVersion = async (namespace) => {
  const version = await redis.get(`version:${namespace}`)
  return version || '1'
}

const invalidate = async (namespace) => {
  await redis.incr(`version:${namespace}`)
}

module.exports = { redis, getVersion, invalidate }
```

---

## Caching Pattern in Routes

```javascript
// GET — check cache first, fall back to DB
router.get('/', asyncHandler(async (req, res) => {
  const version  = await getVersion('books')
  const cacheKey = `books:v${version}:${JSON.stringify(req.query)}`

  const cached = await redis.get(cacheKey)
  if (cached) return res.json({ ...JSON.parse(cached), source: 'cache' })

  // cache miss — query DB
  const books = await prisma.book.findMany({ ... })

  await redis.set(cacheKey, JSON.stringify(result), 'EX', 60)
  res.json({ ...result, source: 'database' })
}))

// POST/PATCH/DELETE — invalidate by bumping version
router.post('/', asyncHandler(async (req, res) => {
  const book = await prisma.book.create({ data: req.body })
  await invalidate('books')  // version 1 → 2, all old keys unreachable
  res.status(201).json({ data: book })
}))
```

---

## What to Cache vs What Not To

| Cache ✅ | Never Cache ❌ |
|---------|--------------|
| `GET /books` — public, read-heavy | Orders — user-specific |
| `GET /books/:id` | Auth routes — security sensitive |
| `GET /categories` — rarely changes | User-specific data |
| `GET /authors` | Frequently written data |

Rule: **frequently read, rarely written, not user-specific, not security-sensitive.**

---

## The Three Caching Strategies

| Strategy | How | When |
|----------|-----|------|
| Cache Aside | App checks cache, falls back to DB | Most APIs — what we built |
| Write Through | Write to DB and cache simultaneously | Critical data, always cached |
| Write Behind | Write cache first, DB async | High write throughput — complex |

---

## Performance Proof

```
First request  → 622ms  — PostgreSQL query
Second request → 8ms    — Redis read
```

78x faster on cache hit.

---

## Key Rules

- Cache Aside pattern — your code is the bridge between Redis and DB
- Always set a TTL — never cache forever
- Use versioning for invalidation — never `redis.keys()` in production
- Separate Redis connections for cache and rate limiting
- Never cache user-specific or security-sensitive data
- Cold cache is normal — first request always hits DB

---

## Quiz Score: 4/4 ✅

---

## Commit

```
feat: add Redis caching with version-based invalidation to books router
```