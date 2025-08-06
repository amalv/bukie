
# 🔗 API Architecture Decision
- Status: accepted

## 📚 Context
Bukie needs a robust, type-safe API architecture to serve data to the frontend and other clients. Options include REST, GraphQL, tRPC, and Eden (Elysia).

## 🎯 Decision Drivers
- Simplicity and maintainability
- Performance
- Type safety
- Flexibility for future integrations
- Ecosystem and tooling support

## 🔍 Considered Options
- REST
- GraphQL
- tRPC
- Eden (Elysia)

## ✅ Decision Outcome
Eden (Elysia) is chosen as the API architecture for Bukie.

### 💡 Rationale
- Eden provides end-to-end type safety and REST-like endpoints, making it easy to use with HTTP clients like curl or Postman.
- API procedures are defined in Elysia and exposed as HTTP endpoints, so clients interact with them just like standard REST APIs.
- Eden integrates tightly with Elysia (Bun), offering modern DX and future-proofing for Bukie.
- GraphQL and tRPC are powerful, but Eden offers a simpler, type-safe approach tailored for Bun.

## ⚖️ Pros and Cons
### Eden (Elysia)
**👍 Pros:**
- End-to-end type safety
- REST-like endpoints, easy to test with curl/Postman
- Fast and modern
- Integrates with Bun ecosystem
**👎 Cons:**
- Newer ecosystem, less mature than REST/GraphQL
- Requires Elysia/Bun

### REST
**👍 Pros:**
- Simple and widely adopted
- Easy to document and test
- Works well with most clients
**👎 Cons:**
- Less flexible for complex queries
- No built-in type safety

### GraphQL
**👍 Pros:**
- Flexible queries
- Reduces over/under-fetching
**👎 Cons:**
- More complex setup and tooling
- Requires strict schema management

### tRPC
**👍 Pros:**
- Type-safe end-to-end
- Fast and modern
**👎 Cons:**
- Smaller ecosystem
- Tightly coupled to TypeScript

## 📋 Consequences
- Bukie will use Eden (Elysia) for its API architecture
- API endpoints will be accessible via HTTP (curl, Postman, etc.)
- Future migration to GraphQL or tRPC is possible if requirements change
