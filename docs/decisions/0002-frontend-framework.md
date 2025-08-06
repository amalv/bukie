# ⚛️ Frontend Framework Decision
- Status: accepted

## 📚 Context
Choosing the frontend framework for Bukie to ensure maintainability, developer experience, and future-proof architecture.

## 🎯 Decision Drivers
- Web standards
- Developer experience
- Flexibility
- SSR/SSG support

## 🔍 Considered Options
- React + Vite
- Next.js
- Remix
- Astro

## ✅ Decision Outcome
**Remix** is chosen as the frontend framework.

### 💡 Rationale
- Remix is modern, flexible, and closely follows web standards, making it a great fit for a project that values transparency and maintainability.
- It allows for incremental adoption and is less "magical" than some alternatives, so the codebase remains understandable and portable.
- While the ecosystem is smaller than Next.js, the developer experience is excellent, and the framework is designed to be future-proof and adaptable to different runtimes and hosting providers.
- SSR and GraphQL (Apollo) integration are both possible, and while setup may require a bit more manual work, the result is a more explicit and flexible architecture.

## ⚖️ Pros and Cons of the Options

### React + Vite
**👍 Pros:**
- Fast dev server and build times
- Huge ecosystem and community
- Easy to find solutions and tutorials
- Flexible, not opinionated
**👎 Cons:**
- Boilerplate for routing, SSR, etc. must be set up manually
- Not batteries-included (need to pick libs for data fetching, etc.)

### Next.js
**👍 Pros:**
- Full-featured (SSR, SSG, API routes, file-based routing)
- Great docs and community
- Vercel integration is seamless
- Good for SEO
**👎 Cons:**
- Can feel heavy for small projects
- Some magic/abstraction can make debugging harder

### Remix
**👍 Pros:**
- Embraces web standards (uses loaders, actions)
- Great for data loading and mutations
- SSR/SSG out of the box
- Good developer experience
**👎 Cons:**
- Smaller ecosystem than Next.js
- Some concepts are unique, learning curve if coming from CRA/Next

### Astro
**👍 Pros:**
- Super fast static sites
- Can use React/Vue/Svelte components together
- Minimal JS shipped by default
- Great for content-heavy or marketing sites
**👎 Cons:**
- Not as mature for dynamic, app-like experiences
- Smaller ecosystem

## 📋 Consequences
- Flexible, explicit architecture
- Future-proof and adaptable
