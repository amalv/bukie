# ⚡ Backend Framework Decision
- Status: accepted

## 📚 Context
Bukie requires a fast, modern backend for its API. Elysia (Bun) is chosen for its performance and developer experience.

## 🎯 Decision Drivers
- High performance and low latency
- Modern JavaScript/TypeScript support
- Simplicity and developer productivity
- REST API compatibility
- Ecosystem growth

## 🔍 Considered Options
- Node.js (Fastify, Nest, Express)
- Python (FastAPI)
- Go
- Elysia (Bun)

## ✅ Decision Outcome
Elysia (Bun) is chosen as the backend framework for Bukie’s API.

### 💡 Rationale
- Elysia + Bun offers cutting-edge performance and low resource usage.
- Modern, simple API for building REST endpoints.
- Growing ecosystem and support for PostgreSQL and other databases.
- Easy to use with TypeScript and integrates well with modern frontend stacks.

## ⚖️ Pros and Cons
### Elysia (Bun)
**👍 Pros:**
- Extremely fast and efficient
- Simple, modern API
- TypeScript support
- REST API ready
**👎 Cons:**
- Ecosystem is newer and less mature than Node.js
- Fewer third-party libraries (but growing)

### Node.js / Fastify / Express
**👍 Pros:**
- Mature ecosystem
- Lots of libraries and integrations
- Well-known patterns
**👎 Cons:**
- Slower than Bun/Elysia
- More resource usage

## 📋 Consequences
- Bukie will use Elysia (Bun) for its backend API
- PostgreSQL will be the recommended database
- Future migration to other frameworks is possible if needed
