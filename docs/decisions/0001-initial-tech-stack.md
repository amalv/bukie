# 🛠️ Initial Tech Stack
- Status: ongoing 

## 📚 Context
High-level tech stack choices for Bukie to ensure consistency and maintainability.

## 🎯 Decision Drivers
- Developer experience
- Performance
- Community support
- Simplicity
- Long-term maintainability

## 🔍 Initial Tech Stack Decisions

| Area                | Options                                         | Decision (ADR) |
|---------------------|------------------------------------------------|----------------|
| Frontend Framework  | React + Vite / React Router / Next.js / Astro   | Next.js (0002) |
| Rendering Strategy  | SSR / SPA / Static                             | SSR (0003)     |
| Design System       | Tailwind / shadcn/ui / MUI / Custom             | Custom (0004)  |
| Backend Framework   | Node.js (Fastify, Nest, Express) / Python / Go / Bun (Elysia) | Bun (Elysia) (0005) |
| API Architecture    | REST / GraphQL / tRPC / Eden (Elysia)           | Eden (Elysia) (0006) |
| Authentication      | Supabase Auth / Clerk / Auth0 / Azure AD / Custom OAuth | Clerk (0007) |
| Cloud Provider      | Vercel / AWS / Google Cloud / Azure / Multi-cloud | Vercel (0008)  |
| Infrastructure as Code | Terraform / Pulumi / CDK / Bicep / None      | Vercel project configuration (no IaC) |
| Database            | PostgreSQL / SQLite / MongoDB                   | PostgreSQL (Neon via Vercel) (0010) |
| CI/CD               | GitHub Actions with matrix builds and caches    | GitHub Actions (0011) |
| Package Manager     | pnpm / npm / yarn / bun                         | bun (0012)     |
| Release System      | Semantic Release / Release Please / Manual      | Semantic Release (0013) |
| Code Quality        | Biome / Super-Linter / Qlty.sh / CodeQL         | Qlty.sh (0014) |

## ✅ Decision Outcomes
Chosen option: Next.js for frontend framework. See ADR-0002 for rationale and pros/cons.

## 📋 Consequences
- Modern, maintainable stack
- Clear direction for future PRs