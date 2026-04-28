# Day 2 — Status codes mastery

## What I learned today

Status codes are the server's way of telling the client what happened.
The first digit tells you the category — that alone is enough to know 
whether to fix your request or fix your server.

## The five families

- 1xx — informational, request received and processing (rare in APIs)
- 2xx — success, something good happened
- 3xx — redirection, go look somewhere else
- 4xx — client error, you did something wrong
- 5xx — server error, the server did something wrong

The most important rule: 4xx is the client's fault, 5xx is the server's fault.

## The codes I need to know by heart

- 200 — OK, general success with a response body
- 201 — Created, POST succeeded, return the new resource + Location header
- 204 — No content, success but nothing to return (common for DELETE)
- 400 — Bad request, malformed syntax or missing required fields
- 401 — Unauthorized, not authenticated, needs to log in first
- 403 — Forbidden, authenticated but not permitted
- 404 — Not found, resource does not exist at this URL
- 409 — Conflict, duplicate email on register or version mismatch
- 422 — Unprocessable entity, syntax valid but semantics wrong (validation errors)
- 429 — Too many requests, rate limit hit, return Retry-After header
- 500 — Internal server error, unhandled crash, never expose stack traces
- 502 — Bad gateway, upstream service returned garbage
- 503 — Service unavailable, server overloaded or in maintenance

## The three confusions that trip people up

### 401 vs 403
- 401 — I don't know who you are, please log in
- 403 — I know exactly who you are, and you cannot do this

### 400 vs 422
- 400 — the request is malformed, could not even parse it properly
- 422 — parsed fine but the values are invalid (e.g. age: -5)

### 404 vs 403 on private resources
- Returning 404 instead of 403 is sometimes better for security
- It does not reveal that the resource exists at all

## 301 vs 302 redirects (went deeper on this)

- 301 Moved Permanently — browser caches this, use when the old URL is gone forever
- 302 Found — browser does not cache, use when the redirect is temporary
- 307 and 308 are the modern versions that preserve the HTTP method after redirect
- In REST APIs redirects are rare — mostly handled at infrastructure level
  (nginx redirecting http to https, not in Express code)

## Exercises completed

- Observed 200 on GET /posts/1
- Observed 201 on POST /posts
- Triggered 404 on GET /posts/99999
- Thought through scenarios and matched the right codes before checking answers

## Open questions

- How do I implement Retry-After header correctly for 429 in Express?
- When should I use 202 Accepted for async operations?