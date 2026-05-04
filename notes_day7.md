# Day 7 — Week 1 Mini Project: Bookstore API Spec

## What I built today

A full REST API specification for a bookstore — no code yet, just design.
This is how real teams work — design and document the API first so frontend
and backend developers can work in parallel.

## Resources and relationships

Book        → belongs to Author, belongs to Category
Author      → has many Books
Category    → has many Books
Customer    → has many Orders
Order       → has many OrderItems
OrderItem   → belongs to Order, belongs to Book

## Key insight — API design IS database design

Every resource maps directly to a database table.
Every relationship maps to a foreign key or a join table.

books           → books table
authors         → authors table
categories      → categories table
customers       → customers table
orders          → orders table
order_items     → order_items table (join table between orders and books)

The OrderItem join table exists because an order can have many books
AND a book can appear in many orders — you cannot store that in either
table directly so you need a third table sitting between them.

## Full route specification

### Books
GET    /v1/books                          — list all books
GET    /v1/books/:id                      — get single book
POST   /v1/books                          — create book
PATCH  /v1/books/:id                      — update book
DELETE /v1/books/:id                      — delete book
GET    /v1/books?author_id=&category_id=&search=&sort=&page=&limit=

### Authors
GET    /v1/authors                        — list all authors
GET    /v1/authors/:id                    — get single author
GET    /v1/authors/:id/books              — get all books by author
POST   /v1/authors                        — create author
PATCH  /v1/authors/:id                    — update author
DELETE /v1/authors/:id                    — delete author

### Categories
GET    /v1/categories                     — list all categories
GET    /v1/categories/:id                 — get single category
GET    /v1/categories/:id/books           — get all books in category
POST   /v1/categories                     — create category
PATCH  /v1/categories/:id                 — update category
DELETE /v1/categories/:id                 — delete category

### Customers
GET    /v1/customers                      — list all customers
GET    /v1/customers/:id                  — get single customer
GET    /v1/customers/:id/orders           — get all orders for customer
POST   /v1/customers                      — register new customer
PATCH  /v1/customers/:id                  — update customer profile
DELETE /v1/customers/:id                  — delete customer account

### Orders
GET    /v1/orders                         — list all orders
GET    /v1/orders/:id                     — get single order with items
GET    /v1/orders/:id/items               — get items in an order
GET    /v1/customers/:id/orders           — get orders for a customer
POST   /v1/orders                         — place new order
PATCH  /v1/orders/:id/status              — update order status (admin)
POST   /v1/orders/:id/cancel              — cancel an order
DELETE /v1/orders/:id                     — delete an order

## Request and response shapes

### POST /v1/books request body
{
  "title":       "The Pragmatic Programmer",
  "author_id":   1,
  "category_id": 3,
  "price":       39.99,
  "stock":       100,
  "isbn":        "978-0135957059",
  "description": "A guide to software craftsmanship"
}

### POST /v1/books response 201 Created
{
  "data": {
    "id":          1,
    "title":       "The Pragmatic Programmer",
    "price":       39.99,
    "stock":       100,
    "isbn":        "978-0135957059",
    "author":   { "id": 1, "name": "David Thomas" },
    "category": { "id": 3, "name": "Software Engineering" },
    "created_at": "2026-05-03T10:00:00Z"
  }
}

### GET /v1/books response 200 OK
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 84,
    "total_pages": 5,
    "has_next": true,
    "has_prev": false
  }
}

### POST /v1/orders request body
{
  "customer_id": 42,
  "items": [
    { "book_id": 1, "quantity": 2 },
    { "book_id": 5, "quantity": 1 }
  ]
}

### POST /v1/orders response 201 Created
{
  "data": {
    "id":          99,
    "status":      "pending",
    "customer_id": 42,
    "items": [
      { "book_id": 1, "title": "The Pragmatic Programmer", "quantity": 2, "price": 39.99 },
      { "book_id": 5, "title": "Clean Code", "quantity": 1, "price": 29.99 }
    ],
    "total":      109.97,
    "created_at": "2026-05-03T10:00:00Z"
  }
}

## Error responses I designed

### POST /v1/customers
201 Created          → customer registered successfully
422 Unprocessable    → name or email missing or invalid format
409 Conflict         → email already exists in the database
500 Internal Error   → unhandled server crash

### PATCH /v1/books/:id
200 OK               → book updated successfully
404 Not Found        → no book exists with this id
400 Bad Request      → request body is malformed or unparseable
422 Unprocessable    → values are invalid e.g. price: -5 or stock: "hello"

### GET /v1/orders/:id
200 OK               → order found, returns full order with items
404 Not Found        → no order exists with this id

## What to add in Week 2 when auth is implemented

401 Unauthorized     → request has no token, user not logged in
403 Forbidden        → logged in but trying to access someone else's data

## What I learned about my own design process

- Listing resources and relationships first before writing routes
  is the right way to start — it reveals the database structure too
- PUT and PATCH on the same resource is redundant — pick PATCH
- Creating nested routes for creation (POST /authors/:id/books) 
  duplicates what POST /books already does — keep creation flat
- Query params need consistent naming — snake_case always
- Orders contain order_items not books directly — GET /orders/:id/items
  is more accurate than GET /orders/:id/books
- The 409 for duplicate email is the one most people miss

## Week 1 complete

Days 1-7 covered:
- HTTP methods, safe vs idempotent
- Status codes — 2xx, 3xx, 4xx, 5xx
- Headers — Content-Type, Authorization, CORS
- REST URL design — nouns, nesting, versioning
- Query params — filtering, sorting, pagination
- Error response design — schemas, global handler, stack traces
- API specification — designing before coding

Ready for Week 2 — building real APIs in Express with auth and databases.