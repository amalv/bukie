
# Initial Tech Stack Decisions

* Status: [in progress]


## 🎯 Context and Problem Statement

This document outlines Bukie's high-level tech stack choices. The goal is to keep development smooth, maintainable, and consistent as the project grows. A clear stack helps avoid decision fatigue and keeps things simple.

## 🚀 Decision Drivers

* Great developer experience and productivity
* Performance that scales when needed
* Strong community support and mature ecosystem
* Deployment and maintenance kept simple (KISS principle rocks!)
* Code can be maintained long-term without headaches

## Considered Options

### Technology Stack Decisions

| Area | Options | Decision |
|------|---------|----------|
| **Frontend Framework** | React + Vite / Next.js / Remix / Astro | Remix |
| **Rendering Strategy** | SSR (Server-Side Rendering) / SPA (Client-Side) / Static | |
| **Design System** | Tailwind / shadcn/ui / MUI / Custom design system | |
| **Backend Framework** | Node.js (Fastify, Nest, Express) / Python (FastAPI) / Go | |
| **API Architecture** | REST / GraphQL (Apollo GraphQL) / tRPC | |
| **GraphQL Client** | Apollo Client / Relay / urql (if GraphQL chosen) | |
| **Authentication** | Supabase Auth / Clerk / Auth0 / Azure AD / Custom OAuth | |
| **Database** | PostgreSQL / SQLite / MongoDB | |
| **Cloud Provider** | AWS / Google Cloud / Azure / Multi-cloud | |
| **Hosting/Deployment** | Single cloud provider services vs. specialized platforms | |
| **Infrastructure as Code** | Terraform / Pulumi / CDK / none yet | |
| **CI/CD** | GitHub Actions with matrix builds and caches | |
| **Package Manager** | pnpm / npm / yarn / bun | |

## ✅ Decision Outcome

**Remix** is chosen as the frontend framework.

**Rationale:**
- Remix is modern, flexible, and closely follows web standards, making it a great fit for a project that values transparency and maintainability.
- It allows for incremental adoption and is less "magical" than some alternatives, so the codebase remains understandable and portable.
- While the ecosystem is smaller than Next.js, the developer experience is excellent, and the framework is designed to be future-proof and adaptable to different runtimes and hosting providers.
- SSR and GraphQL (Apollo) integration are both possible, and while setup may require a bit more manual work, the result is a more explicit and flexible architecture.

## ⚖️ Pros and Cons of the Options

### Frontend Framework

#### React + Vite
**Pros:**
- Fast dev server and build times
- Huge ecosystem and community
- Easy to find solutions and tutorials
- Flexible, not opinionated
**Cons:**
- Boilerplate for routing, SSR, etc. must be set up manually
- Not batteries-included (need to pick libs for data fetching, etc.)

#### Next.js
**Pros:**
- Full-featured (SSR, SSG, API routes, file-based routing)
- Great docs and community
- Vercel integration is seamless
- Good for SEO
**Cons:**
- Can feel heavy for small projects
- Some magic/abstraction can make debugging harder

#### Remix
**Pros:**
- Embraces web standards (uses loaders, actions)
- Great for data loading and mutations
- SSR/SSG out of the box
- Good developer experience
**Cons:**
- Smaller ecosystem than Next.js
- Some concepts are unique, learning curve if coming from CRA/Next

#### Astro
**Pros:**
- Super fast static sites
- Can use React/Vue/Svelte components together
- Minimal JS shipped by default
- Great for content-heavy or marketing sites
**Cons:**
- Not as mature for dynamic, app-like experiences
- Smaller ecosystem

## 📋 Acceptance Criteria

- [ ] Technology stack table above is filled in 
- [ ] ADR-001 committed under `docs/adr/`
- [ ] Follow-up issues created for scaffolding, CI setup, etc.
- [ ] Implementation plan documented

## References

* [Architecture Decision Records](https://adr.github.io/)
* [ADR Templates](https://adr.github.io/adr-templates/)
* [MADR Template](https://github.com/adr/madr/blob/develop/docs/decisions/adr-template.md)
