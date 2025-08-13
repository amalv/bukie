# ☁️ Cloud Provider Decision
- Status: accepted

## 📚 Context
Bukie needs a reliable, developer-friendly platform for hosting our Next.js app, managing storage (PostgreSQL, KV, Blob), and providing excellent preview environments with minimal ops.

## 🎯 Decision Drivers
- First-class support for Next.js and SSR/Edge
- Developer experience and built-in previews
- Global performance and scalability
- Managed storage options (Postgres) with simple setup
- CI/CD integration and environment variable management

## 🔍 Considered Options
- Vercel
- AWS
- Google Cloud
- Azure
- Multi-cloud

## ✅ Decision Outcome
Vercel is chosen as the sole cloud platform for Bukie.

### 💡 Rationale
- Best-in-class integration with Next.js (App Router, Server/Edge Functions, Image/OG, ISR).
- Automatic Preview Deployments for every PR with isolated env vars and URLs.
- Vercel Marketplace provides managed storage products, including Vercel Postgres.
- Excellent developer experience, DX tooling, logs, and project-level env management.
- Global edge network and caching for performance.

## ⚖️ Pros and Cons
### Vercel
**👍 Pros:**
- Native Next.js support and zero-config previews
- Managed storage integrations (Postgres, KV, Blob)
- Simple environment management per environment (dev/preview/prod)
- Strong DX and observability
**👎 Cons:**
- Vendor lock-in for some features (Edge runtime, integrations)
- Background/long-running jobs require additional services

### AWS / GCP / Azure
**👍 Pros:**
- Broad service catalogs and flexibility
**👎 Cons:**
- Higher ops overhead for small teams; more setup to reach Vercel-like DX

### Multi-cloud
**👍 Pros:**
- Flexibility and redundancy
**👎 Cons:**
- Added complexity, fragmented tooling

## 📋 Consequences
- Bukie will deploy the app on Vercel.
- Managed database will be Neon (Serverless Postgres) installed via Vercel Integrations Marketplace.
- We will use deployment integration actions (when available) to branch DBs for previews or run migrations on deploy.
- Preview/Production environments are handled via Vercel’s environment model with per-env DATABASE_URL.
- Future migration is possible but will require replacing Vercel-specific integrations.
