# Day 6 — Error Response Design & Global Error Handler

## Why error design matters

The difference between a junior and senior API is how it handles errors.
A good error response tells the developer exactly what went wrong,
which field failed, and where — without exposing internal server details.

## The anti-patterns to avoid

- { "error": true } — vague, tells you nothing
- Inconsistent shapes — { "msg": "..." } in one route, { "err": ... } in another
- Returning 200 OK with an error in the body — clients check status codes first,
  they will treat it as success and miss the error entirely
- Exposing stack traces — reveals file structure, library versions, 
  internal logic to potential attackers

## The base error schema

Every error response should have at minimum:
{
  "status":    400,              -- mirrors the HTTP status code
  "code":      "VALIDATION_ERROR", -- machine readable, never changes
  "message":   "Human readable description",
  "timestamp": "2026-05-03T10:00:00Z",
  "path":      "/v1/users"
}

## The code field — why it matters

The code field is a stable contract with your clients.
Even if you change the message wording, the code never changes.
Frontend developers write switch statements against it:
  if (error.code === 'NOT_FOUND') { show404Page() }
  if (error.code === 'VALIDATION_ERROR') { highlightFields() }

## Validation error schema

Return ALL validation errors at once — never just the first one.
{
  "status": 422,
  "code": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "details": [
    { "field": "email", "message": "must be a valid email address" },
    { "field": "age",   "message": "must be a positive number" }
  ]
}

## RFC 9457 — Problem Details standard

The official IETF standard for HTTP error responses.
Uses Content-Type: application/problem+json
Fields: type (URL to docs), title, status, detail, instance
Not all APIs use it but knowing it exists signals seniority.

## Error code catalogue

VALIDATION_ERROR     → 422
NOT_FOUND            → 404
UNAUTHORIZED         → 401
FORBIDDEN            → 403
CONFLICT             → 409
RATE_LIMIT_EXCEEDED  → 429
INTERNAL_ERROR       → 500
SERVICE_UNAVAILABLE  → 503

Define these as constants — treat them like a public contract.

## The global error handler pattern — most important concept of the day

Instead of handling errors in every route separately, Express lets you
funnel ALL errors into one central place using a 4-parameter middleware:

  app.use((err, req, res, next) => { ... })

The 4 parameters are how Express identifies it as an error handler.
Write it with 3 params and Express treats it as normal middleware.

### How it works with routes

Routes detect the problem and throw it up:
  next(new AppError(404, 'NOT_FOUND', 'User not found'))

The error handler catches everything and formats it consistently:
  → builds the clean JSON response
  → sends it back to the client

next() with nothing = normal flow, go to next middleware
next(anything) = skip everything, go straight to error handler

### Two cases the error handler covers

Case 1 — planned AppErrors (404, 422, 401...)
  These have err.status set because you created them with new AppError()
  The handler uses your status, code, and message directly

Case 2 — unexpected crashes (bugs, null pointers, DB failures)
  These have no err.status — just a plain JavaScript error
  The || 500 fallback kicks in
  A generic safe message is returned instead of your real error message

### Why || 500 as fallback

Unexpected crashes have no status code at all — just a plain JS error.
err.status is undefined so || 500 defaults it to a server error.

### What a stack trace is

When code crashes, Node.js records the exact path it took:
which file, which line, every function that was called to get there.

Example:
  TypeError: Cannot read properties of null
    at getUser       (index.js:3)   ← where it crashed
    at handleRequest (index.js:8)   ← which called it
    at app.get       (index.js:12)  ← which called it

Useful for debugging on your laptop.
Dangerous on a real server — reveals file structure and internals.

### The stack trace condition explained

if (process.env.NODE_ENV === 'development' && !err.status) {
  response.stack = err.stack
}

Two conditions must both be true:
1. NODE_ENV === 'development' — we are on our local machine, not production
2. !err.status — it is an unexpected crash, not one of our planned AppErrors

NODE_ENV is an environment variable:
  NODE_ENV=development node index.js  ← your laptop
  NODE_ENV=production  node index.js  ← real server

### Why central handler beats per-route handling

With 50 routes, writing error formatting in each = 50 copies to maintain.
With a central handler, change the format once = all 50 routes updated.

## Code written today

Built a working Express error handler with:
- AppError custom class with status, code, message, details
- ErrorCodes constants object
- Global 4-param error handling middleware
- Tested with curl: 404, 422 validation error, 201 success

## Open questions

- How do I integrate a proper validation library like Zod 
  so I don't write manual if checks for every field?
- How do I log errors to a file or external service in production?
- How does this error handler change when I add async routes?