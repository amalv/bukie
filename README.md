# Bukie

[![TypeScript](https://img.shields.io/badge/-TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-000?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Bun](https://img.shields.io/badge/bun-282a36?style=flat-square&logo=bun&logoColor=fbf0df)](https://bun.sh/)
[![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=flat-square&logo=github-actions&logoColor=white)](https://github.com/features/actions)
[![Actions Status](https://github.com/amalv/bukie/actions/workflows/test.yml/badge.svg)](https://github.com/amalv/bukie/actions/workflows/test.yml)
[![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=flat-square&logo=playwright)](https://playwright.dev/)
[![Playwright E2E](https://github.com/amalv/bukie/actions/workflows/playwright.yml/badge.svg)](https://github.com/amalv/bukie/actions/workflows/playwright.yml)
[![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=flat-square&logo=vitest&logoColor=white)](https://vitest.dev/)
[![Biome](https://img.shields.io/badge/Biome-00BFAE?style=flat-square&logoColor=white)](https://biomejs.dev/)
[![Commitlint](https://img.shields.io/badge/Commitlint-6CC644?style=flat-square&logo=commitlint&logoColor=white)](https://commitlint.js.org/)
[![Maintainability](https://qlty.sh/gh/amalv/projects/bukie/maintainability.svg)](https://qlty.sh/gh/amalv/projects/bukie)
[![Code Coverage](https://qlty.sh/gh/amalv/projects/bukie/coverage.svg)](https://qlty.sh/gh/amalv/projects/bukie)
[![Storybook](https://img.shields.io/badge/Storybook-FF4785?style=flat-square&logo=storybook&logoColor=white)](https://storybook.js.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

Bukie is a book database platform for discovering and tracking books. It features a modern Next.js stack, automated quality checks, and a growing curated catalog.

## Features

### Available Now
- Built with TypeScript, Next.js, Bun, and Drizzle-backed PostgreSQL/SQLite support
- Unit testing with Vitest
- End-to-end testing with Playwright
- Linting and formatting with Biome
- Pre-commit checks with Lefthook
- Automated CI/CD with GitHub Actions and Semantic Release

### Coming Soon
- Authentication
- User profiles and onboarding
- Expanded discovery and personalization flows

See [ROADMAP.md](./ROADMAP.md) for planned milestones and upcoming features.

## Toolchain

- Bun `1.3.10`
- Node.js `24.14.0` (see [.nvmrc](./.nvmrc))
- CI installs dependencies with `bun install --frozen-lockfile`

## Styling

- Tailwind CSS is the primary styling solution.
- Theme values live as CSS variables in [src/app/globals.css](./src/app/globals.css).
- Shared token references for tests and stories live in [src/design/tokens.ts](./src/design/tokens.ts).
- The repo uses the default Next.js Turbopack path with plain `next dev`, `next build`, and `next start` scripts.
- The earlier Windows-only webpack fallback was removed after the Next 16.2 canary upgrade fixed the local Turbopack path for this project.

## Testing

See the full testing guide in [docs/testing.md](./docs/testing.md), covering unit tests, Storybook tests, Playwright E2E, and CI integration.

## Database

### Build-time seeding (Preview/Production)

- Build runs `bun run db:migrate:pg && bun run db:seed:pg && next build`.
- `DATABASE_URL` must be available during the Vercel build.
- Preview seeding runs on every build and is idempotent.
- Production seeding runs only when the table is empty unless `SEED_ON_BUILD=1` is set.

### Preview/Production on Vercel (Neon Postgres)

- Preferred: `bun run db:migrate:pg`
- Fallback for first setup: `bun run db:init:pg`

For details, see `.env.example` and the deployment notes in this repository.

### Homepage Sections

The database includes optional metadata and a `book_metrics` table to power homepage sections like New Arrivals, Top Rated, and Trending Now. See [docs/database-sections.md](./docs/database-sections.md).

### Book curation batches

For the 100-book batch curation workflow, see [docs/books-steps.md](./docs/books-steps.md).

## Release Automation

Bukie uses [Semantic Release](https://semantic-release.gitbook.io/) and GitHub Actions to automate versioning, changelog updates, and publishing releases. Every push to `main` triggers the release workflow.

For configuration details, see [docs/release-automation.md](./docs/release-automation.md).

## Architecture Decisions

See the ADR index in [docs/decisions/index.md](./docs/decisions/index.md).

## License

This project is licensed under the [MIT License](LICENSE).
