# Day 3 — Headers, CORS, and Content Negotiation

## What I learned today

Headers are metadata that travel with every HTTP request and response.
They tell the server and client how to handle the message — what format 
the body is in, who is sending it, and who is allowed to access the resource.

## The four header categories that matter

- Content negotiation — what format is the body, what format do you want back
- Authentication — who is making this request
- CORS — which origins are allowed to talk to this API
- Response metadata — Location, Retry-After, X-Request-ID

## Content negotiation headers

- Content-Type — describes the format of the body, required on any request 
  with a body. Most common value: application/json
- Accept — tells the server what format the client wants back. 
  Server returns 406 if it cannot fulfill it.
- Content-Length — size of the body in bytes, usually set automatically

## Authentication headers

- Authorization — carries credentials. Two main formats:
  Bearer {token} for JWT, Basic {base64} for username:password
- Never put tokens in the URL — URLs get logged in server logs, 
  browser history, and proxy caches
- WWW-Authenticate — server sends this with a 401 to tell the client 
  what auth scheme to use
- X-API-Key — common custom header for API key auth, always over HTTPS only

## CORS explained

The browser enforces the Same-Origin Policy — a page on localhost:3000 
cannot call an API on localhost:5000 by default. Different port = different origin.

CORS is how servers relax this restriction selectively.

When a cross-origin request is made:
1. Browser adds an Origin header automatically
2. Server must respond with Access-Control-Allow-Origin matching that origin
3. If missing, the browser blocks the response even if the server processed it fine

For non-simple requests (Authorization header, PUT, DELETE), the browser 
sends a preflight OPTIONS request first to ask permission before the real request.

## CORS headers

- Access-Control-Allow-Origin — * for any origin, or a specific origin
- Access-Control-Allow-Methods — which HTTP methods are allowed cross-origin
- Access-Control-Allow-Headers — must include Authorization if using JWT from browser
- Access-Control-Allow-Credentials — set true to allow cookies/auth headers,
  but then you cannot use * for origin, must be specific

## Bonus — CSP vs CORS (discovered during exercise 5)

Ran a fetch() from a page that had a Content Security Policy.
Got a CSP error instead of a CORS error — they look similar but are different.

- CORS — enforced by the server, controls which origins can access the API
- CSP — enforced by the browser, the page controls which URLs its 
  own scripts are allowed to connect to

Fix for CSP: add the target URL to the connect-src directive in the 
Content Security Policy header or meta tag.

## Exercises completed

- Used curl -v to inspect request and response headers
- Sent Content-Type and Authorization headers manually with curl
- Inspected Access-Control-Allow-Origin on JSONPlaceholder via Postman
- Triggered a CSP error in the browser — learned the difference between 
  CSP and CORS errors

## Open questions

- How do I configure CORS properly in Express using the cors package?
- When should I use helmet.js and how does it relate to CSP?