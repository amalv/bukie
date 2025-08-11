# Bukie Roadmap

This roadmap defines incremental milestones for Bukie, each mapped to a set of actionable issues (e.g., `feat:`, `ci:`, `docs:`). Semantic Release manages versioning for each release.

## Milestones

### Initial Release
* ✅ feat: define initial technical architecture (#1)
* ✅ feat: add semantic-release (#5)
* ✅ ci: add GitHub Actions workflow for semantic-release (#6)

### Tooling & Quality
* ✅ ci: add Biome for linting and formatting
* ✅ ci: add Lefthook for pre-commit hooks
* ✅ ci: add Vitest for unit tests
* ✅ ci: add commitlint for Conventional Commits
* ✅ ci: set up basic Next.js app
* ✅ ci: deploy website to Vercel
* ✅ ci: add Playwright for e2e tests
* ✅ ci: integrate Qlty.sh for code quality, maintainability, and coverage gates

### Design System & Layout
* ✅ feat: custom Storybook setup
* ✅ feat: minimal app shell
* ✅ feat: design tokens in Storybook (Material 3–inspired: 8pt spacing, rem typography, basic color roles)
* 🛠️ feat: 12‑column grid primitives (Container/Grid/Column) aligned to Material breakpoints + stories
* ⏳ docs: design system documentation

### Core Features
* ⏳ feat: hello world endpoint (Next.js)
* ⏳ feat: item page for books
* ⏳ feat: basic search functionality
* ⏳ feat: authentication (Clerk)
* ⏳ feat: add book (CRUD: create)
* ⏳ docs: usage instructions

### Extended Features
* ⏳ feat: edit and delete book (CRUD: update, delete)
* ⏳ feat: improved search and filters
* ⏳ feat: pagination for book list
* ⏳ docs: API documentation

### User & UI Enhancements
* ⏳ feat: user profiles
* ⏳ feat: UI/UX improvements
* ⏳ docs: onboarding guide

### Future (TBD)
* ⏳ Additional features and improvements will be planned and tracked as issues. Only the first milestones are detailed; more will be added as the project evolves.

### v1.0.0 – Public Release
* docs: finalize documentation
* ci: release and deployment automation
* feat: all core features stable

## 📅 Next Steps

The next milestone is focused on incremental design system foundations:
* Add minimal 12‑column grid primitives aligned to Material breakpoints with a responsive story (in progress)
* Document the design system and component workflow

---

## 🧭 Visual Roadmap

```mermaid
graph TD
    A[Initial Release] --> B[Tooling & Quality]
    B --> C[Design System & Layout]
    C --> D[Core Features]
    D --> E[Extended Features]
    E --> F[User & UI Enhancements]
    F --> G[Future TBD]
    G --> H[v1.0.0 Public Release]
```