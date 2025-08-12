# [0.13.0](https://github.com/amalv/bukie/compare/v0.12.0...v0.13.0) (2025-08-12)


### Features

* **db:** add Drizzle ORM with SQLite and seed from mocks ([380ad3a](https://github.com/amalv/bukie/commit/380ad3a4e843a5f7e000b13729d50364f1ef2339))
* **db:** add Drizzle SQLite, migrations, reseed, and books CRUD ([5b33141](https://github.com/amalv/bukie/commit/5b3314121a59d51b12a18bd4ff42bd76ea350409))
* **db:** make book inserts idempotent to handle parallel test runs ([7d28c17](https://github.com/amalv/bukie/commit/7d28c176007cdf9c45d337ad19ae2bcab1311ac5))

# [0.12.0](https://github.com/amalv/bukie/compare/v0.11.0...v0.12.0) (2025-08-12)


### Features

* **api:** implement books CRUD API routes and refactor tests to AAA style ([8d25ac2](https://github.com/amalv/bukie/commit/8d25ac2610835eb8484c994436724e889aebcd15))
* **roadmap:** update milestones to reflect completed API mocking and initial book list features ([ce178a1](https://github.com/amalv/bukie/commit/ce178a181275369d719cdc86c71e81a25d5f8e06))

# [0.11.0](https://github.com/amalv/bukie/compare/v0.10.0...v0.11.0) (2025-08-12)


### Features

* **books:** add MSW mock API and initial BookList UI ([ef9fe38](https://github.com/amalv/bukie/commit/ef9fe38fe6792419e19bca4a554e525ab5d7d3ff))
* **books:** wire /api/books route and render BookList on home; fix images ([e042348](https://github.com/amalv/bukie/commit/e042348ffadad42925386822ce51a979e4816413))
* **roadmap:** add API mocking milestones for initial book list implementation ([371906b](https://github.com/amalv/bukie/commit/371906bb8ee0b8979cae2a2c88ae19a3a7b7aae4))

# [0.10.0](https://github.com/amalv/bukie/compare/v0.9.0...v0.10.0) (2025-08-11)


### Features

* **design-system:** 12‑column grid primitives + docs and tests ([a73d86e](https://github.com/amalv/bukie/commit/a73d86e6e5ca4e6d8086b28575fd3676842c30f6))

# [0.9.0](https://github.com/amalv/bukie/compare/v0.8.0...v0.9.0) (2025-08-11)


### Features

* **design-system:** add tokens and Storybook previews (Material 3–inspired) ([9966c7a](https://github.com/amalv/bukie/commit/9966c7ac2a8cd21f29f17fc8a9acec647b89d159))
* **tokens:** extract shared spacing and typography keys for reuse ([61cd79f](https://github.com/amalv/bukie/commit/61cd79f3721025e5f9b603a28a851a0af0d52824))

# [0.8.0](https://github.com/amalv/bukie/compare/v0.7.0...v0.8.0) (2025-08-10)


### Features

* integrate Vanilla Extract for CSS styling and refactor page layout ([21372ea](https://github.com/amalv/bukie/commit/21372ea10aa9a4c4141ffcc3e045b5870d5d593d))

# [0.7.0](https://github.com/amalv/bukie/compare/v0.6.0...v0.7.0) (2025-08-10)


### Bug Fixes

* **vitest:** generate lcov coverage report for Qlty.sh integration ([c888a95](https://github.com/amalv/bukie/commit/c888a954011e389440050956d409c65a0f8c006c))


### Features

* add initial Qlty configuration files for code quality checks ([87020a9](https://github.com/amalv/bukie/commit/87020a90330f9728537b8b0fa5c03e5b4ffed148))
* add Qlty.sh integration for code quality and maintainability checks ([bb038fe](https://github.com/amalv/bukie/commit/bb038fedff21dedd31de8a7bbdb21179a9908e6e))

# [0.6.0](https://github.com/amalv/bukie/compare/v0.5.0...v0.6.0) (2025-08-09)


### Bug Fixes

* add unzip installation step to Playwright workflow ([97107d9](https://github.com/amalv/bukie/commit/97107d9d8174971090339cfe1b4d42703a3db03f))
* set HOME environment variable for Playwright test execution ([f0125c4](https://github.com/amalv/bukie/commit/f0125c4bd161bcf7a4332f380959e05c8d4c9e7c))
* update Playwright container image to v1.54.2-noble ([41891e2](https://github.com/amalv/bukie/commit/41891e2687b4dd767e5a4fb1be97a0749f449299))


### Features

* add Playwright test script to package.json ([36de48a](https://github.com/amalv/bukie/commit/36de48a6cc0d30700092c3baf7a0f67d4919a673))
* add Storybook testing workflow and Vitest configuration ([c70d799](https://github.com/amalv/bukie/commit/c70d7999474c30436e298e2db30f9d65a96187b3))
* **storybook:** initialize Storybook with Next.js config and example stories ([b5f3d31](https://github.com/amalv/bukie/commit/b5f3d31f9859c9c3e3b354fa547831147bcc877e))
* update Playwright workflow to include container image and remove browser installation step ([7fe9c05](https://github.com/amalv/bukie/commit/7fe9c052ee21cc0b25c0fe700aec9cc22b0f38ef))

# [0.5.0](https://github.com/amalv/bukie/compare/v0.4.0...v0.5.0) (2025-08-08)


### Features

* add Playwright E2E tests and configuration files ([917562c](https://github.com/amalv/bukie/commit/917562c481d1a7ebb3e43aa42d9c8698c900d473))

# [0.4.0](https://github.com/amalv/bukie/compare/v0.3.0...v0.4.0) (2025-08-08)


### Bug Fixes

* add release script and format package.json for Semantic Release integration ([93eeefc](https://github.com/amalv/bukie/commit/93eeefcb87b91b654e3d324a8429a1f292035c77))


### Features

* set up basic Next.js app with initial structure and tooling integration ([753edc7](https://github.com/amalv/bukie/commit/753edc7674d433f57ad211fa7d78a30b43b008bf))

# [0.4.0](https://github.com/amalv/bukie/compare/v0.3.0...v0.4.0) (2025-08-08)


### Bug Fixes

* add release script and format package.json for Semantic Release integration ([93eeefc](https://github.com/amalv/bukie/commit/93eeefcb87b91b654e3d324a8429a1f292035c77))


### Features

* set up basic Next.js app with initial structure and tooling integration ([753edc7](https://github.com/amalv/bukie/commit/753edc7674d433f57ad211fa7d78a30b43b008bf))

# [0.3.0](https://github.com/amalv/bukie/compare/v0.2.0...v0.3.0) (2025-08-07)


### Features

* add Vitest for unit testing and create initial test file ([bb69545](https://github.com/amalv/bukie/commit/bb69545f11a60ab9bfcf9132a84d013fa0d7e9bb))

# [0.2.0](https://github.com/amalv/bukie/compare/v0.1.0...v0.2.0) (2025-08-07)


### Bug Fixes

* correct glob pattern indentation in lefthook configuration ([b00f36d](https://github.com/amalv/bukie/commit/b00f36d6c5319084bc5ca723d4cdae491a080705))


### Features

* add biome configuration and integrate lefthook for pre-commit checks ([5f4d731](https://github.com/amalv/bukie/commit/5f4d73125abf351b3301b4f655401fa3a5b3302f))

# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]
- Initial setup
