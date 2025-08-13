# 🗄️ Database Decision
- Status: accepted

## 📚 Context
Bukie needs a reliable, scalable SQL database with strong DX and smooth integration into our Vercel-hosted Next.js app. We also want zero-ops previews for pull requests.

## 🎯 Decision Drivers
- Reliability and ACID compliance
- Performance and scalability
- Ecosystem and community support
- First-class integration with Vercel (envs, previews)
- Operational simplicity and cost

## 🔍 Considered Options
- PostgreSQL
- SQLite
- MongoDB

## ✅ Decision Outcome
PostgreSQL is chosen, provisioned via Neon (Serverless Postgres) installed from the Vercel Integrations Marketplace (Storage category).

### 💡 Rationale
- PostgreSQL is proven, feature-rich, and fits our relational needs.
- Neon provides serverless Postgres with branching and works seamlessly with Vercel via its native integration.
- Excellent developer experience: per-environment connection strings injected automatically.

## ⚖️ Pros and Cons
### PostgreSQL (Neon via Vercel)
**👍 Pros:**
- Managed service with preview/prod environments and DB branching
- Secure connection strings managed by Vercel
- Good performance and reliability
**👎 Cons:**
- Vendor-managed Postgres; advanced tuning options may be limited

### SQLite
**👍 Pros:**
- Simple for local dev
**👎 Cons:**
- Not suitable for multi-user production

### MongoDB
**👍 Pros:**
- Flexible schema
**👎 Cons:**
- Not a fit for our relational data and existing SQL tooling

## Integration: Neon via Vercel
- Marketplace category: https://vercel.com/marketplace/category/storage?category=storage&search=postgres
- Integration flow docs: https://vercel.com/docs/integrations/install-an-integration/product-integration

Steps:
1) From the Vercel dashboard, go to Integrations → Browse Marketplace, select Neon, and Install.
2) In the flow, create a Neon database, choose region/plan, and pick environments (Preview and Production).
3) Connect the provisioned Neon resource to this Vercel project (Projects tab). Vercel injects environment variables; we use `DATABASE_URL`.
	- Preview deployments get an isolated preview branch/database and URL.
	- Production gets its own database and URL.
4) Optionally configure Deployment Integration Actions to branch databases or run scripts automatically on deployments (see docs above).
5) Our app auto-selects the driver based on environment:
	- `VERCEL_ENV=preview|production` -> use Postgres.
	- Otherwise fallback to local SQLite unless `DATABASE_URL` is set.

Environment variables used by the app:
- `DATABASE_URL`: Postgres connection string (provided by the Neon integration). We also read `POSTGRES_URL` if set.
- `VERCEL_ENV`: set by Vercel to `development`, `preview`, or `production`.

Migrations:
- We keep SQL migrations under `drizzle/`. For Postgres in Vercel, run during deployment:
  - `bun run db:migrate:pg` (drizzle-orm/postgres-js/migrator).
  - As a fallback for first setup, `bun run db:init:pg` ensures required tables exist.

Local development:
- Default is SQLite at `.data/dev.sqlite`.
- To develop against Neon locally, pull envs with `vercel env pull` and run with `DATABASE_URL` set.

## 📋 Consequences
- Use Neon (via Vercel integration) for preview and production with `DATABASE_URL` managed by Vercel.
- Keep SQLite for fast local dev unless Postgres is explicitly configured.
- CI/CD will include a step to run Postgres migrations on deploy.
