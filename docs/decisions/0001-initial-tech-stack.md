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
| Frontend Framework  | React + Vite / Next.js / Remix / Astro          | Remix (0002)   |
| Rendering Strategy  | SSR / SPA / Static                             |                |
| Design System       | Tailwind / shadcn/ui / MUI / Custom             |                |
| Backend Framework   | Node.js (Fastify, Nest, Express) / Python / Go  |                |
| API Architecture    | REST / GraphQL / tRPC                           |                |
| GraphQL Client      | Apollo Client / Relay / urql                    |                |
| Authentication      | Supabase Auth / Clerk / Auth0 / Azure AD / Custom OAuth |         |
| Database            | PostgreSQL / SQLite / MongoDB                   |                |
| Cloud Provider      | AWS / Google Cloud / Azure / Multi-cloud        |                |
| Hosting/Deployment  | Vercel / Render / Fly.io / Cloud provider       |                |
| Infrastructure as Code | Terraform / Pulumi / CDK / none yet          |                |
| CI/CD               | GitHub Actions with matrix builds and caches    |                |
| Package Manager     | pnpm / npm / yarn / bun                         |                |

## ✅ Decision Outcomes
Chosen option: Remix for frontend framework. See ADR-0002 for rationale and pros/cons.

## 📋 Consequences
- Modern, maintainable stack
- Clear direction for future PRs
