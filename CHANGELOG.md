# [0.29.0](https://github.com/amalv/bukie/compare/v0.28.0...v0.29.0) (2025-08-30)


### Features

* **layout:** polish footer, match header branding ([52f9126](https://github.com/amalv/bukie/commit/52f912661cbe0fee0153c3469405427c5ade01b6))

# [0.28.0](https://github.com/amalv/bukie/compare/v0.27.0...v0.28.0) (2025-08-26)


### Bug Fixes

* **design-system:** make BookCard heart icon non-interactive to avoid test collisions ([09ee167](https://github.com/amalv/bukie/commit/09ee167c4ba17e557f4a2925d182465e049d1ab6))


### Features

* **design-system:** compact BookCard UI and uniform media heights ([83fe225](https://github.com/amalv/bukie/commit/83fe225b57dee6b4d615eacfa819ae76b42010ad))


### Performance Improvements

* **images:** reduce BookCard intrinsic size to 427x240 to avoid unnecessary bandwidth ([e4dae46](https://github.com/amalv/bukie/commit/e4dae46403aedf5dca2bc9a06d6446e1b36e5b8b))

# [0.27.0](https://github.com/amalv/bukie/compare/v0.26.0...v0.27.0) (2025-08-25)


### Bug Fixes

* **books:** restore listNewArrivals import ([2a8003d](https://github.com/amalv/bukie/commit/2a8003db52ede1509fee1b56537b4a19e2c35a3b))


### Features

* **design:** increase hero H1 prominence and book title scale for better hierarchy and contrast ([e195cc6](https://github.com/amalv/bukie/commit/e195cc6694b519e1a3092b04a2ebe331b88b1bc5))
* **page:** update section fallback to "all" and enhance "All Books" display logic ([ed8751f](https://github.com/amalv/bukie/commit/ed8751fdca01d8cc8e132127c6277a4dd5b6a2d4))

# [0.26.0](https://github.com/amalv/bukie/compare/v0.25.0...v0.26.0) (2025-08-24)


### Features

* **tests:** add unit tests for pageParams helpers and PaginatedBooks component ([68ce974](https://github.com/amalv/bukie/commit/68ce974c3298aec1e76ea10217b7c7dfef0f5331))
* **tests:** add unit tests for pagination, BookList, and theme actions; update coverage script ([94b17cc](https://github.com/amalv/bukie/commit/94b17cc45dab2813b23705e132d7b31739637c5b))

# [0.25.0](https://github.com/amalv/bukie/compare/v0.24.0...v0.25.0) (2025-08-23)


### Bug Fixes

* **schema:** ensure drizzle schema is created if not exists ([338fa37](https://github.com/amalv/bukie/commit/338fa37d2a0d7ed5df9650a2448801a9437add49))


### Features

* **check:** add script to check database migrations and columns ([0b6524c](https://github.com/amalv/bukie/commit/0b6524c14e9bfaca533048b1d2ccd504a5674975))
* **homepage:** add homepage sections (New Arrivals, Top Rated, Trending Now) and full test coverage ([8256ef8](https://github.com/amalv/bukie/commit/8256ef8c65513c8433dbe8f4864b3c2fdf1f5eff))
* **homepage:** add sections (New Arrivals, Top Rated, Trending Now) ([1ef61c6](https://github.com/amalv/bukie/commit/1ef61c64f5c204b16c3ddd0df0bcca19e29daba4))
* **timestamps:** update added_at and updated_at columns to bigint for epoch milliseconds ([68d8e2e](https://github.com/amalv/bukie/commit/68d8e2e88381f9c0b4cc400ef6ed3fc8bcd88ae4))

# [0.24.0](https://github.com/amalv/bukie/compare/v0.23.0...v0.24.0) (2025-08-22)


### Bug Fixes

* **books:** remove stray $ in BookCard a11y string ([f6ed291](https://github.com/amalv/bukie/commit/f6ed291176ba42d0e15570cb71916b05d4d02489))


### Features

* **books:** polish BookCard single-star rating and grid background ([32029f1](https://github.com/amalv/bukie/commit/32029f16ef1457dac79ac23d21b0591290bba691))
* **books:** single-star rating and spacing polish on Book page and Card ([92d812f](https://github.com/amalv/bukie/commit/92d812fc1e125385c947acf7fa187f3f6848fda6))

# [0.23.0](https://github.com/amalv/bukie/compare/v0.22.0...v0.23.0) (2025-08-21)


### Features

* **pagination:** add SSR-first cursor pagination with client append ([256a63d](https://github.com/amalv/bukie/commit/256a63dd01fadad72716ef9154de976ae77de833))

# [0.22.0](https://github.com/amalv/bukie/compare/v0.21.0...v0.22.0) (2025-08-20)


### Bug Fixes

* **theming:** make theme cookie secure only in production ([45da390](https://github.com/amalv/bukie/commit/45da390b7791bf2dd738b9ad16c2f8d36059fb13))


### Features

* **design-system:** add dark/light mode theming with SSR-safe toggle ([d19e14a](https://github.com/amalv/bukie/commit/d19e14a51237c22e4e5d83350b6da53c98ab6181))
* **theming:** polish hero search + icon brand ([45ec515](https://github.com/amalv/bukie/commit/45ec515cb0e7b2d951f3780a697cbe5e94892c3d))

# [0.21.0](https://github.com/amalv/bukie/compare/v0.20.0...v0.21.0) (2025-08-19)


### Features

* **search:** add DB search predicate and data-layer API for title/author (SQLite + Postgres) ([18967aa](https://github.com/amalv/bukie/commit/18967aa254cb9d007e61b0c5c150d93161441799))
* **search:** polish SSR search UI and UX ([2f9d09a](https://github.com/amalv/bukie/commit/2f9d09a57d52f38bc591ef02ea486078c016c6fd))
* **search:** ssr home page accepts ?q= and renders filtered results ([39da551](https://github.com/amalv/bukie/commit/39da5512f6306100e68683acfde9a409a60d0ebc))

# [0.20.0](https://github.com/amalv/bukie/compare/v0.19.0...v0.20.0) (2025-08-18)


### Features

* **books:** scaffold cover fetching script and helpers ([91900a1](https://github.com/amalv/bukie/commit/91900a16037d1f60e1f280e27d63f876bb568c6a))
* **books:** update cover image paths to include versioning ([a10b82d](https://github.com/amalv/bukie/commit/a10b82db7423437c0053824c46adcd630b23df78))
* **covers:** fetch, optimize and sync local cover images ([a425454](https://github.com/amalv/bukie/commit/a4254540c9d8f5ec6f43389be2441b39586049f0))

# [0.19.0](https://github.com/amalv/bukie/compare/v0.18.0...v0.19.0) (2025-08-17)


### Bug Fixes

* **book-details:** align sections to the right and use consistent icons ([63ea42f](https://github.com/amalv/bukie/commit/63ea42f65d1915ac746d6f0b8854f4775b61299d))
* **book-details:** use unique gradient id via useId and replace inline spacing with VE classes ([d60ef6e](https://github.com/amalv/bukie/commit/d60ef6ecbac155c89af07736960ff98320346ec5))


### Features

* **book-details:** show About section for all books with a friendly default copy ([0d3d97b](https://github.com/amalv/bukie/commit/0d3d97b8112bdb3d81f4322a1464aa296d12f9ee))
* **book-details:** use lucide-react icons ([a7e4c69](https://github.com/amalv/bukie/commit/a7e4c692b98d9b5c43830c1f2715178e9b1c9584))
* **books:** add About and Details sections to BookDetails with tokens-based panels ([a8db6f9](https://github.com/amalv/bukie/commit/a8db6f938f9425ce5e85191adf4f5ce98436f135))
* **books:** enhance BookDetails with badge, stars, and year (Vanilla Extract) ([230fda1](https://github.com/amalv/bukie/commit/230fda16c47e52f9d48f0848a10c75cc4af2b1d1))

# [0.18.0](https://github.com/amalv/bukie/compare/v0.17.0...v0.18.0) (2025-08-16)


### Bug Fixes

* **books:** use star token and clarify WebKit line clamp typing ([e08d694](https://github.com/amalv/bukie/commit/e08d69421ab0c6a62adb0970072d481b6e796c0f))
* **build:** update CI commands for Playwright to handle database configurations ([34e8ecd](https://github.com/amalv/bukie/commit/34e8ecd018da3145b76c1191088989833e22f2d4))
* **db:** avoid SQLite side effects in serverless ([517dcb0](https://github.com/amalv/bukie/commit/517dcb0e31e0d84be7ab2f610c393377b40ae83d))
* **db:** close Postgres after seeding to avoid hanging build ([0f6abab](https://github.com/amalv/bukie/commit/0f6ababbe95d4d23b4da5d1a0ad9050839564b6d))
* **db:** ensure table reset in preview environment for accurate seeding ([52c8a07](https://github.com/amalv/bukie/commit/52c8a07cb73ab22d20ed4a375f489cf3d2f2f9f1))
* **db:** optimize batch insertion logic in seed route ([b48054d](https://github.com/amalv/bukie/commit/b48054d5242aced8e33e86758a302d896021c1b1))
* **db:** prevent reseeding in production if the table is not empty ([8fcd526](https://github.com/amalv/bukie/commit/8fcd5264cb0d3ae6f5dac00c88a52074c3813258))
* **db:** update sqlite migrator to use getSqliteDb() after client refactor ([57dc71a](https://github.com/amalv/bukie/commit/57dc71abfe2e2291f7b2e9b76245e36ea14cef7e))


### Features

* **books:** enhance BookCard hover effects and transition timings ([f8e3d69](https://github.com/amalv/bukie/commit/f8e3d6974c9cb914c2eebabe664f45bc67a18894))
* **books:** redesign BookCard with badge, rating, and year using Vanilla Extract ([5b59745](https://github.com/amalv/bukie/commit/5b59745ad74601479e352ce02cfdcca3edef762a))
* **books:** switch covers to WebP-only and optimize image handling ([681f7d8](https://github.com/amalv/bukie/commit/681f7d829af29292ae11210e487edcf7c35f7502))

# [0.17.0](https://github.com/amalv/bukie/compare/v0.16.0...v0.17.0) (2025-08-15)


### Features

* **books:** add empty/footer stories and use named style imports in BookList ([c693a1d](https://github.com/amalv/bukie/commit/c693a1d5baf67f2555966ef9099146589b37ba1d))
* **books:** add footer slot to BookList and polish BookCard styles ([76a077b](https://github.com/amalv/bukie/commit/76a077b80d5d29c90371d14d426afb4b1001533e))
* **books:** style BookList states and add footer slot; polish BookCard interactions ([7774810](https://github.com/amalv/bukie/commit/77748101c931c66bedd9b3124d98480375018836))

# [0.16.0](https://github.com/amalv/bukie/compare/v0.15.0...v0.16.0) (2025-08-14)


### Features

* **books:** add ssr item page and link from list ([2bc061f](https://github.com/amalv/bukie/commit/2bc061f254d9615410a7ce77a0faab889dd04a05))

# [0.15.0](https://github.com/amalv/bukie/compare/v0.14.0...v0.15.0) (2025-08-14)


### Features

* **books:** add ssr item page and link from list ([f4676f3](https://github.com/amalv/bukie/commit/f4676f3cdee10ed7b97492f1a4f7791c45331dce))

# [0.14.0](https://github.com/amalv/bukie/compare/v0.13.0...v0.14.0) (2025-08-13)


### Bug Fixes

* **api:** update seed endpoint token variable for consistency in preview environment ([724ba60](https://github.com/amalv/bukie/commit/724ba60bfecba422e8540d69369bfde2d94f9182))


### Features

* **api:** create seeding endpoint for Postgres with token protection ([56f6cf6](https://github.com/amalv/bukie/commit/56f6cf67470a7b4a0d49ccf45af6a7c5f79d519f))
* **api:** implement debug endpoint for database environment information ([53a694a](https://github.com/amalv/bukie/commit/53a694a7803a983f1f85f4f4b5289bb08336b987))
* **db:** enhance database client with detailed logging for Postgres connections ([a63f2f4](https://github.com/amalv/bukie/commit/a63f2f4879ec40d2a165cbfe7da30f453fb4129f))
* **db:** enhance Postgres URL handling with additional environment variable support ([84b3974](https://github.com/amalv/bukie/commit/84b3974928ce82255aca42d3437a3813634f49e2))
* **db:** env-based provider (Postgres preview/prod, SQLite dev) ([984cb9f](https://github.com/amalv/bukie/commit/984cb9fd3402c874a3ebd60e142a595c1714e496))
* **db:** implement PostgreSQL client with configurable pool size and refactor provider ([64e2411](https://github.com/amalv/bukie/commit/64e2411cbdd860c1dba04648c0f4b8ec24760cdf))
* **docs:** add comprehensive database and API architecture documentation ([e5d085f](https://github.com/amalv/bukie/commit/e5d085fc37f91ea764d4720c0b1803856fb8d302))
* **page:** add dynamic export to enable server-side rendering ([dcea3dd](https://github.com/amalv/bukie/commit/dcea3ddca15d3456161801dde2824f6035ec26e6))

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
