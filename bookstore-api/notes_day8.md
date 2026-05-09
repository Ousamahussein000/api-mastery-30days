# Day 8 — Express.js Setup, Routing, Middleware & CRUD API

## The most important mental model in Express

A request travels through a chain of middleware functions one by one
until a response is sent. Every middleware receives the same three things:

  (req, res, next)

  req  — the incoming request, headers, body, params, query
  res  — the response you will send back
  next — call this to pass control to the next middleware

If a middleware does not call next() and does not send a response,
the request hangs forever. This is one of the most common Express bugs.

## Project structure

  bookstore-api/
    src/
      routes/
        books.js
        authors.js
      middleware/
        logger.js
        notFound.js
      errors.js
    index.js
    package.json
    .gitignore

## What each file does

index.js        — entry point, wires everything together
errors.js       — AppError class and ErrorCodes constants (from Day 6)
logger.js       — custom middleware that logs every request
notFound.js     — catches any route that does not exist
books.js        — all CRUD routes for books
authors.js      — all CRUD routes for authors

## Middleware I built

### logger.js
Runs on every single request before the route handler.
Uses res.on('finish') to log after the response is sent,
so it can capture the status code and response time.

  GET /v1/books → 200 (12ms)

### notFound.js
Placed after all routes in index.js.
If no route matched, this catches it and throws a 404 AppError.
The global error handler then formats it into a clean JSON response.

## The order of middleware in index.js matters

  app.use(express.json())    ← 1. parse JSON bodies first
  app.use(logger)            ← 2. log every request
  app.use('/v1/books', booksRouter)    ← 3. routes
  app.use('/v1/authors', authorsRouter)
  app.use(notFound)          ← 4. catch unmatched routes
  app.use((err, req, res, next) => {}) ← 5. error handler, always last

If you put the error handler before the routes it will never receive errors.
If you put express.json() after the routes, req.body will be undefined.
Order is everything in Express.

## Filtering, sorting, pagination in a route

All three are applied in sequence on the same result array:

  1. Start with all records
  2. Filter — reduce the array based on query params
  3. Sort — order the filtered results
  4. Capture total — result.length AFTER filtering, BEFORE slicing
  5. Slice — cut out just the requested page
  6. Return data + pagination metadata

## Key things I learned about sorting

  const order = req.query.sort.startsWith('-') ? -1 : 1
  
  -1 and 1 must be numbers, not strings ('-1' breaks multiplication)
  
  result.sort((a, b) => (a[field] > b[field] ? 1 : -1) * order)
  
  The * order goes INSIDE the comparator function, not outside.
  Putting it outside multiplies the whole array by a number = NaN.

## Key things I learned about validation errors

Always push objects with field and message, not plain strings:

  errors.push({ field: 'name', message: 'name is required' })

The frontend needs the field key to know which input to highlight.
Plain strings lose that information.

## PATCH — only update fields that were sent

  if (name !== undefined) author.name = name
  if (nationality !== undefined) author.nationality = nationality
  if (bio !== undefined) author.bio = bio

Never overwrite a field with undefined just because the client
did not include it in the request body.

## res.json() shorthand

When the key and variable name are the same, write it once:

  { page: page, limit: limit }  ← verbose
  { page, limit }               ← shorthand, same result

## Arrow functions

  const fn = (req, res, next) => { }  ← modern syntax
  function fn(req, res, next) { }     ← old syntax

Same behavior for Express middleware. Arrow functions are standard
in modern Node.js code.

## Routes I built today

### Books (given as reference)
GET    /v1/books           — list with search, sort, pagination
GET    /v1/books/:id       — get single book
POST   /v1/books           — create book with validation
PATCH  /v1/books/:id       — partial update
DELETE /v1/books/:id       — delete, returns 204 no content

### Authors (built myself from scratch)
GET    /v1/authors         — list with search, sort, pagination
GET    /v1/authors/:id     — get single author
POST   /v1/authors         — create author with validation
PATCH  /v1/authors/:id     — partial update
DELETE /v1/authors/:id     — delete, returns 204 no content

## Bugs I fixed in my own code

1. Sorting order was a string '-1' instead of number -1
   — multiplying a string breaks the sort entirely

2. The * order was outside the sort comparator
   — result.sort(...) * order multiplies an array by a number = NaN

3. Validation errors were plain strings not objects
   — { field: 'name', message: '...' } is the correct format

4. Destructured id from req.body in POST
   — server assigns id from nextId++, never trust client-provided ids

## Health check endpoint

Added GET / to index.js so hitting the root gives useful info
instead of a 404:

  { name: 'Bookstore API', version: 'v1', status: 'running' }

## Open questions

- How do I connect this to a real database instead of in-memory arrays?
- How do I share the books array between the books and authors routes
  so GET /v1/authors/:id/books actually works?
- What happens to all the data when the server restarts?
  (Answer I already know: it resets — that is why we need a database)

## What changes in Week 2

The in-memory arrays get replaced with PostgreSQL via Prisma.
The manual validation if-checks get replaced with Zod.
Authentication middleware gets added to protect routes.
The data persists between server restarts.