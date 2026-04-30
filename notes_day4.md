# Day 4 — REST URL Design & Resource Naming

## The core mindset shift

URLs represent resources, not actions.
The HTTP method is the verb. The URL is the noun.
If you catch yourself putting a verb in a URL, stop and rethink.

## The 8 rules of good URL design

1. Use nouns not verbs — /users not /getUsers
2. Use plural nouns for collections — /posts not /post
3. Use kebab-case lowercase only — /blog-posts not /blogPosts
4. Nest routes to show relationships — /posts/5/comments
5. Never go deeper than 3 levels — flatten deep nesting
6. Version your API from day one — /v1/users
7. Use query params for filtering — /users?status=active not /active-users
8. Actions that don't fit CRUD go at the end — POST /posts/5/publish

## Versioning strategies

- URL versioning (/v1/users) — most common, explicit, easiest to test
- Header versioning (Accept: application/vnd.myapi.v2+json) — pure REST 
  but invisible in browser and harder to test
- Query param versioning (/users?version=2) — avoid this
- Rule: use URL versioning, it's what most real APIs and employers use

## Social media API I designed

### Users
GET    /v1/users                  — get all users
GET    /v1/users?search=john      — search users
GET    /v1/users/:id              — get specific user
POST   /v1/users                  — create user
PATCH  /v1/users/:id              — update profile
DELETE /v1/users/:id              — delete account

### Posts
GET    /v1/posts                  — global feed
GET    /v1/posts/:id              — get specific post
PATCH  /v1/posts/:id              — edit post
DELETE /v1/posts/:id              — delete post
GET    /v1/users/:id/posts        — get all posts by a user
POST   /v1/posts                  — create post (flat approach)

### Comments
GET    /v1/posts/:id/comments     — get comments on a post
POST   /v1/posts/:id/comments     — create a comment on a post

### Likes
POST   /v1/posts/:id/likes        — like a post
DELETE /v1/posts/:id/likes        — unlike a post

### Followers
GET    /v1/users/:id/followers    — get followers of a user
GET    /v1/users/:id/following    — get who a user follows
POST   /v1/users/:id/follow       — follow a user
DELETE /v1/users/:id/follow       — unfollow a user

## What I learned from the review

- My routes were mostly correct — got nesting, plural nouns, and 
  versioning right from the start
- The debated one: POST /v1/users/:id/posts vs POST /v1/posts
  Both are valid — nested shows ownership, flat keeps all post 
  operations in one place. Most teams go flat for creation.
- I was missing the full CRUD for posts (PATCH, DELETE)
- Follow/unfollow pattern: POST and DELETE on the same 
  sub-resource /follow — elegant because it mirrors like/unlike

## Open questions

- How do I handle pagination on GET /v1/posts — what query params?
- What does the response body look like for POST /v1/users/:id/follow?
- How do I protect routes so only the owner can DELETE their own post?