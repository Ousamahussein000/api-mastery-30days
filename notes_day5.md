# Day 5 — Query Params, Filtering, Sorting & Pagination

## Why this matters

Never return all records in one response — it will crash your server 
and kill the client. Query params give clients control over what data 
they get back, how much, and in what order.

Three problems, three patterns: filtering, sorting, pagination.

## Filtering

Basic field filter — each param is an AND condition:
/v1/posts?status=published&category=tech

Range filter — use _min/_max suffix:
/v1/products?price_min=10&price_max=100

Search:
/v1/users?search=john&search_fields=name,email

Multiple values (IN filter) — comma separated:
/v1/posts?status=published,draft

## Sorting

Two common conventions:

Option 1 — separate params:
/v1/posts?sort=created_at&order=desc

Option 2 — compact format (used by Stripe, GitHub):
/v1/posts?sort=-created_at,title
Minus prefix means descending, no prefix means ascending.

Rule: never create a new route for sorting — always use query params.

## Pagination — two patterns

### Offset based (classic)
Request:
/v1/posts?page=2&limit=20

Response shape:
{
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 20,
    "total": 340,
    "total_pages": 17,
    "has_next": true,
    "has_prev": true
  }
}

Always return pagination metadata — clients need total to build 
page number controls.

Problem: if a new record is inserted between requests, results 
shift and you get duplicates or skipped items. Fine for admin 
panels, bad for live feeds.

### Cursor based (modern)
Used by Instagram, Twitter, Stripe.

First request:
/v1/posts?limit=20

Response includes a cursor:
{
  "data": [...],
  "pagination": {
    "next_cursor": "eyJpZCI6MTAwfQ==",
    "has_next": true
  }
}

Next page:
/v1/posts?limit=20&cursor=eyJpZCI6MTAwfQ==

The cursor is a base64 encoded ID or timestamp that marks 
your position in the dataset.

Pros: stable under insertions, scales to millions of rows
Cons: cannot jump to a specific page number
Best for: infinite scroll feeds

## When to use which pagination

- Offset based — admin panels, tables with page numbers, 
  small datasets
- Cursor based — social feeds, real time data, large datasets

## Combining all three

A real request combining filtering, sorting and pagination:
/v1/posts?status=published&category=tech&sort=-created_at&page=1&limit=20

## Exercises

Incomplete — will finish as warmup on Day 6.

## Open questions

- How do I implement cursor pagination in Express + Prisma?
- How do I validate and sanitize query params server side?
- What is the max sensible limit value — should I cap it?