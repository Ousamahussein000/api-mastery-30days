# Day 1 — HTTP methods

## Why I started this challenge

I decided to take on this 30-day API mastery challenge to level up my backend 
development skills. The goal is to get solid with REST APIs, learn how real 
backend systems are built, and pick up Git and version control as part of 
the daily workflow. By the end of the 30 days I want to be confident enough 
to call myself a backend developer.

## What I learned today

- HTTP methods are not just labels — they carry guarantees the whole web relies on
- A method is **safe** if it never modifies server state (GET is the main one)
- A method is **idempotent** if calling it N times has the same result as calling it once
- These properties matter because browsers and proxies use them to decide when 
  to retry requests automatically

## The five methods

- `GET` — read a resource, safe and idempotent, params go in the URL never the body
- `POST` — create a resource, neither safe nor idempotent, server assigns the ID
- `PUT` — full replace of a resource, idempotent, missing fields get wiped
- `PATCH` — partial update, only send the fields you want to change
- `DELETE` — remove a resource, idempotent, same end state even if called twice

## The distinction that clicked

PUT vs PATCH — use PUT when you send the whole object, PATCH when you are 
only updating one or two fields and don't want to overwrite everything else.

## Exercises

Did not complete the Postman exercises yet — will do them as a warmup 
at the start of Day 2.

## Open questions

- When exactly is PATCH considered idempotent vs not?
- How do proxies and CDNs actually use the safe/idempotent guarantees in practice?