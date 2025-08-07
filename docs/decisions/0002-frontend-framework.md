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
- React Router
- React + Vite
- Next.js
- Astro

## ✅ Decision Outcome
**Next.js** is chosen as the frontend framework.

### 💡 Rationale
Next.js is the most mature, stable, and widely adopted React SSR framework. It provides full-featured SSR, SSG, API routes, file-based routing, and a large ecosystem. Next.js is easy to onboard, has excellent documentation, and is future-proof for both small and large projects. It integrates well with Bun and Azure.

## ⚖️ Pros and Cons of the Options

### Next.js
**👍 Pros:**
- Mature, stable, and widely adopted
- Full-featured SSR, SSG, API routes, file-based routing
- Large ecosystem and community
- Excellent documentation and Vercel integration
- Good for SEO
- Easy onboarding and future-proof
**👎 Cons:**
- Can feel heavy for small projects
- Some magic/abstraction can make debugging harder

### React Router
**👍 Pros:**
- Modern routing and flexible architecture
- Large ecosystem and community
- Explicit, easy to understand
- Closely follows web standards
**👎 Cons:**
- SSR setup is manual and requires custom server code
- Not as batteries-included as Next.js

### React + Vite
**👍 Pros:**
- Fast dev server and build times
- Huge ecosystem and community
- Easy to find solutions and tutorials
- Flexible, not opinionated
- Vite ecosystem (plugins, HMR, etc.)
**👎 Cons:**
- Boilerplate for routing, SSR, etc. must be set up manually
- Not batteries-included (need to pick libs for data fetching, etc.)
- SSR requires additional setup (e.g., Vike)

### Astro
**👍 Pros:**
- Super fast static sites
- Can use React/Vue/Svelte components together
- Minimal JS shipped by default
- Great for content-heavy or marketing sites
**👎 Cons:**
- Not as mature for dynamic, app-like experiences
- Smaller ecosystem

### Remix
**👍 Pros:**
- Modern SSR and routing
- Great data loading primitives
- Good for full-stack React apps
- Strong community and docs
**👎 Cons:**
- Remix 2 is in maintenance mode, Remix 3 is under development
- Uncertainty about long-term support and features
- Not recommended to start new projects on Remix 2

## 📋 Consequences
- Modern, maintainable stack
- Clear direction for future PRs
