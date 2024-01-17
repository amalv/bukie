# [1.56.0](https://github.com/amalv/bukie/compare/v1.55.1...v1.56.0) (2024-01-17)


### Features

* refactor favorite handling to use Apollo Client cache ([a64be23](https://github.com/amalv/bukie/commit/a64be232c5f3a299dea4307d764dc5ef78644cd1))

## [1.55.1](https://github.com/amalv/bukie/compare/v1.55.0...v1.55.1) (2024-01-15)


### Bug Fixes

* **urlUtils.test:** replace direct manipulation of window.location with vi.stubGlobal ([8200aa6](https://github.com/amalv/bukie/commit/8200aa687a6a78f344447d4d117162b79bf974b0))

# [1.55.0](https://github.com/amalv/bukie/compare/v1.54.0...v1.55.0) (2024-01-15)


### Features

* **eslint-config:** enhance ESLint configuration with additional plugins and rules ([2aeab5a](https://github.com/amalv/bukie/commit/2aeab5a4e5c0d824c1a16e9014df3a4e96d0af32))

# [1.54.0](https://github.com/amalv/bukie/compare/v1.53.1...v1.54.0) (2024-01-15)


### Features

* add getEnvironmentDependentUrl function to reduce code duplication ([3089926](https://github.com/amalv/bukie/commit/3089926bb8c386b1043cf3f494bebb2751b7c883))

## [1.53.1](https://github.com/amalv/bukie/compare/v1.53.0...v1.53.1) (2024-01-15)


### Bug Fixes

* **auth:** adjust returnTo URL based on environment in useLogout ([f939381](https://github.com/amalv/bukie/commit/f939381fa7d08e80b375e9aace47985eab721b7e))

# [1.53.0](https://github.com/amalv/bukie/compare/v1.52.0...v1.53.0) (2024-01-14)


### Bug Fixes

* **e2e-tests:** move test username and password to e2e-tests job ([0f03310](https://github.com/amalv/bukie/commit/0f03310357e6edf7fea0fa9f31bfa3175fd64dd5))
* **tests:** move auth.setup.ts to tests directory ([5577b2b](https://github.com/amalv/bukie/commit/5577b2bb21014e74f847ccd4d275ae70549d24bf))


### Features

* **tests:** add support for authenticated tests in Playwright ([7b4aa5e](https://github.com/amalv/bukie/commit/7b4aa5ef39adaf1036f1f1926ecacd62800dd246))

# [1.52.0](https://github.com/amalv/bukie/compare/v1.51.2...v1.52.0) (2024-01-09)


### Bug Fixes

* correct syntax for test.yml ([fb1be92](https://github.com/amalv/bukie/commit/fb1be92557ca6f6f9e3dea78c08867191ed97ca9))


### Features

* enable again e2e tests job ([b0f4a56](https://github.com/amalv/bukie/commit/b0f4a569f4a270123c6535b938cab9b48f1d4421))
* **testing:** set baseURL dynamically for Playwright tests ([cfa3bdd](https://github.com/amalv/bukie/commit/cfa3bdd8292265ddce722818130f6dfecc990033))

## [1.51.2](https://github.com/amalv/bukie/compare/v1.51.1...v1.51.2) (2024-01-09)


### Bug Fixes

* **useBooks:** remove token from BOOKS_QUERY variables to prevent double query execution ([82cfaac](https://github.com/amalv/bukie/commit/82cfaac50fa0d211c5508af546206be93dea2e2f))

## [1.51.1](https://github.com/amalv/bukie/compare/v1.51.0...v1.51.1) (2024-01-09)


### Bug Fixes

* use correct staging API URL in test.yml workflow ([e283438](https://github.com/amalv/bukie/commit/e2834384cec0aceb80f4b8fd989b8f3d392f1d0b))

# [1.51.0](https://github.com/amalv/bukie/compare/v1.50.1...v1.51.0) (2024-01-09)


### Bug Fixes

* resolve TypeScript indexing error in API URL selection ([d1eb137](https://github.com/amalv/bukie/commit/d1eb1375fe99b8ec71e3443f804284714bf073d9))


### Features

* add staging support for API url in apolloClient ([88099fc](https://github.com/amalv/bukie/commit/88099fc4c316a2881f9bbb5512070be94abc21b1))

## [1.50.1](https://github.com/amalv/bukie/compare/v1.50.0...v1.50.1) (2024-01-09)


### Bug Fixes

* add returnTo parameter to Auth0 logout function ([b0dbd27](https://github.com/amalv/bukie/commit/b0dbd27e008c01eb735900abc1d7840b1467b88e))

# [1.50.0](https://github.com/amalv/bukie/compare/v1.49.0...v1.50.0) (2024-01-09)


### Features

* add staging environment check for Auth0 redirect URI ([8daa979](https://github.com/amalv/bukie/commit/8daa979ca75ff02cba87f05086ed19b635a48293))

# [1.49.0](https://github.com/amalv/bukie/compare/v1.48.1...v1.49.0) (2024-01-09)


### Features

* add staging Auth0 variables to GitHub Actions ([d7f6caf](https://github.com/amalv/bukie/commit/d7f6cafc7fdc9ec529fdad7dcb38cbecf6c5c7f8))

## [1.48.1](https://github.com/amalv/bukie/compare/v1.48.0...v1.48.1) (2024-01-09)


### Bug Fixes

* update audience for Auth0Provider ([216f129](https://github.com/amalv/bukie/commit/216f12919966fe5951f82716c84f3586baf17308))

# [1.48.0](https://github.com/amalv/bukie/compare/v1.47.0...v1.48.0) (2024-01-09)


### Bug Fixes

* disable e2e tests job ([c4bf813](https://github.com/amalv/bukie/commit/c4bf8139903ef36cea2880f65d7ee6ed58417a66))
* **playwright:** update baseURL to use BASE_URL environment variable ([50c9271](https://github.com/amalv/bukie/commit/50c9271b4603a49aac2ef6b012d1b1438a0eaa8c))


### Features

* update AuthProvider to use access token ([8b2a2b4](https://github.com/amalv/bukie/commit/8b2a2b437d99e4dd108cda783ba4cd80eb16a630))

# [1.47.0](https://github.com/amalv/bukie/compare/v1.46.0...v1.47.0) (2024-01-07)


### Bug Fixes

* consolidate deploy staging and test workflows into a single one ([836e0ee](https://github.com/amalv/bukie/commit/836e0ee2ddfd3cb516b2ccdc74fba10c9140e292))
* update name for test.yml job ([bc3cb40](https://github.com/amalv/bukie/commit/bc3cb40df973b50961bdcc5d265ec3ff2f7fb1c7))


### Features

* add id to Deploy to Netlify step for output access ([f02c8c3](https://github.com/amalv/bukie/commit/f02c8c3d8d7dcdd0644027722ef0162fd8b58463))
* add Playwright e2e basic test and support for staging URL ([fb01805](https://github.com/amalv/bukie/commit/fb018057e7caf9b7cda87c796ec786b03e40c5ce))

# [1.46.0](https://github.com/amalv/bukie/compare/v1.45.1...v1.46.0) (2024-01-07)


### Features

* add noindex meta tag to prevent search engine indexing ([9889220](https://github.com/amalv/bukie/commit/98892202eb0d2512d7b278b2240f9f39b2f26536))

## [1.45.1](https://github.com/amalv/bukie/compare/v1.45.0...v1.45.1) (2024-01-07)


### Bug Fixes

* correct VITE_API_URL_PRODUCTION value in deploy-staging.yml ([0c27cd4](https://github.com/amalv/bukie/commit/0c27cd4eb5c78863d79f5c961ef314063b443a69))

# [1.45.0](https://github.com/amalv/bukie/compare/v1.44.0...v1.45.0) (2024-01-07)


### Features

* add staging deployment workflow with Netlify integration ([3724023](https://github.com/amalv/bukie/commit/3724023672fa165eb0cc233ab45c61fd5347e313))
* add VITE_API_URL environment variable for staging API requests ([04063f6](https://github.com/amalv/bukie/commit/04063f6842f8a6a7ac6a527e38854439f303b2ac))

# [1.45.0](https://github.com/amalv/bukie/compare/v1.44.0...v1.45.0) (2024-01-07)


### Features

* add staging deployment workflow with Netlify integration ([3724023](https://github.com/amalv/bukie/commit/3724023672fa165eb0cc233ab45c61fd5347e313))

# [1.44.0](https://github.com/amalv/bukie/compare/v1.43.1...v1.44.0) (2024-01-07)


### Features

* extract AuthProvider from AuthContext and add tests ([6559550](https://github.com/amalv/bukie/commit/655955006de550d8e396ee2c22bf68cad65c2fd2))
* install lint-staged and husky for pre-commit testing and linting ([e85ece5](https://github.com/amalv/bukie/commit/e85ece50827b4fa2c660949f2f9eaa0681d1a3da))

## [1.43.1](https://github.com/amalv/bukie/compare/v1.43.0...v1.43.1) (2024-01-06)


### Bug Fixes

* ensure semantic release only runs on successful deploy ([4252074](https://github.com/amalv/bukie/commit/4252074d66a6778a222d99c29455d00ce1283d07))

# [1.43.0](https://github.com/amalv/bukie/compare/v1.42.0...v1.43.0) (2024-01-06)


### Features

* integrate e2e and unit tests into a single workflow ([ce4e0ad](https://github.com/amalv/bukie/commit/ce4e0ad42d5415d7d5184fe65fa8251f624b6fb3))

# [1.42.0](https://github.com/amalv/bukie/compare/v1.41.1...v1.42.0) (2024-01-06)


### Features

* enhance CI/CD pipeline with unit and e2e testing ([d11b147](https://github.com/amalv/bukie/commit/d11b147d7a28c5647607894548716d0e95b28e2f))

## [1.41.1](https://github.com/amalv/bukie/compare/v1.41.0...v1.41.1) (2024-01-06)


### Bug Fixes

* exclude Playwright tests from Vitest configuration ([dc6daa5](https://github.com/amalv/bukie/commit/dc6daa51ffbd7f5f6350875de2e39525a5d2d1e5))

# [1.41.0](https://github.com/amalv/bukie/compare/v1.40.0...v1.41.0) (2024-01-06)


### Features

* add Playwright for end-to-end testing ([3b1ed19](https://github.com/amalv/bukie/commit/3b1ed19f25947038588d1ecfc6e681466e65c144))

# [1.40.0](https://github.com/amalv/bukie/compare/v1.39.0...v1.40.0) (2024-01-04)


### Features

* trigger BOOKS_QUERY re-execution on token change ([44e938d](https://github.com/amalv/bukie/commit/44e938d0eebba4f3e1527a78e6c6503af375f747))

# [1.39.0](https://github.com/amalv/bukie/compare/v1.38.0...v1.39.0) (2024-01-04)


### Features

* update useBooks hook to always fetch from network and conditionally set authorization header ([ce87138](https://github.com/amalv/bukie/commit/ce87138c47250cbbfed5b9c14f9de3fcc6d25365))

# [1.38.0](https://github.com/amalv/bukie/compare/v1.37.1...v1.38.0) (2024-01-04)


### Features

* Enhance book fetching logic ([d561d59](https://github.com/amalv/bukie/commit/d561d5950f08d51ac7270d38b39611f7e21f615b))

## [1.37.1](https://github.com/amalv/bukie/compare/v1.37.0...v1.37.1) (2024-01-02)


### Bug Fixes

* Remove unnecessary zIndex from StyledIconButton ([9c14b93](https://github.com/amalv/bukie/commit/9c14b93f92bfa03fdd859b3b4273bb1d67e76269))

# [1.37.0](https://github.com/amalv/bukie/compare/v1.36.0...v1.37.0) (2024-01-02)


### Features

* Redirect unauthenticated users to login when favoriting a book ([d43c157](https://github.com/amalv/bukie/commit/d43c157cd59439eb920e5e065b5557d32588e531))

# [1.36.0](https://github.com/amalv/bukie/compare/v1.35.0...v1.36.0) (2023-12-31)


### Features

* Add AuthProvider and favorites support ([e004aeb](https://github.com/amalv/bukie/commit/e004aebecbb2f7af811c3681b936354dd0368763))

# [1.35.0](https://github.com/amalv/bukie/compare/v1.34.2...v1.35.0) (2023-12-29)


### Features

* prevent unnecessary requests when initial search results are less than page size ([87facd1](https://github.com/amalv/bukie/commit/87facd10fe15cc291468d4a5aacd0f77f7599e3c))

## [1.34.2](https://github.com/amalv/bukie/compare/v1.34.1...v1.34.2) (2023-12-29)


### Bug Fixes

* reset lastPageReached state on search change for infinite scrolling ([d868c69](https://github.com/amalv/bukie/commit/d868c695143c5f5960f353ed96d74b17104c342f))

## [1.34.1](https://github.com/amalv/bukie/compare/v1.34.0...v1.34.1) (2023-12-28)


### Bug Fixes

* ThemeProvider import duplicated ([f8b1d57](https://github.com/amalv/bukie/commit/f8b1d577f1b9d334ab8bd3f28f7033762f2fae4c))

# [1.34.0](https://github.com/amalv/bukie/compare/v1.33.0...v1.34.0) (2023-12-28)


### Features

* refactor theme creation and usage ([da8a19e](https://github.com/amalv/bukie/commit/da8a19e0f2999bec5e9ab3fc04e45fd330b9bb99))

# [1.33.0](https://github.com/amalv/bukie/compare/v1.32.0...v1.33.0) (2023-12-27)


### Features

* add theme selector and persistence ([40fa101](https://github.com/amalv/bukie/commit/40fa1013fb42ac971d02465dcb776d712412e1d1))

# [1.32.0](https://github.com/amalv/bukie/compare/v1.31.0...v1.32.0) (2023-12-27)


### Features

* **LibraryPage:** update Books component and add unit tests ([849115a](https://github.com/amalv/bukie/commit/849115a7d5804f8fb8daddcda201c97401d5153b))

# [1.31.0](https://github.com/amalv/bukie/compare/v1.30.0...v1.31.0) (2023-12-27)


### Features

* enhance layout, add tests, and improve folder structure in LibraryPage ([3c32ba7](https://github.com/amalv/bukie/commit/3c32ba796d1d6b774475b61bb336b6976776b7e5))

# [1.30.0](https://github.com/amalv/bukie/compare/v1.29.0...v1.30.0) (2023-12-26)


### Features

* delete BookList component and replace with LibraryPage ([bd8be97](https://github.com/amalv/bukie/commit/bd8be97d34154fd0f6622b64613ea760c7fbfcce))

# [1.29.0](https://github.com/amalv/bukie/compare/v1.28.0...v1.29.0) (2023-12-26)


### Features

* decouple intersection observer logic into useIntersectionObserver hook ([fe1dfa1](https://github.com/amalv/bukie/commit/fe1dfa1c63ad10883bbbeba5a9aa517457c37524))

# [1.28.0](https://github.com/amalv/bukie/compare/v1.27.0...v1.28.0) (2023-12-26)


### Features

* refactor BookList component and handle error display ([cb71a21](https://github.com/amalv/bukie/commit/cb71a2159ca7f48b4d549a6745ef6a495d97a655))

# [1.27.0](https://github.com/amalv/bukie/compare/v1.26.0...v1.27.0) (2023-12-26)


### Features

* refactor BookList component and extract logic to useBookList hook ([e1c55ba](https://github.com/amalv/bukie/commit/e1c55ba254b5f774e1c226ef9c6486503464cfb1))

# [1.26.0](https://github.com/amalv/bukie/compare/v1.25.1...v1.26.0) (2023-12-26)


### Features

* add theme customization and user avatar with logout functionality ([57bcba4](https://github.com/amalv/bukie/commit/57bcba4107b7e1a9f9722ebfc00fca043b7d69d2))

## [1.25.1](https://github.com/amalv/bukie/compare/v1.25.0...v1.25.1) (2023-12-26)


### Bug Fixes

* refactor redirect URI in App component ([fa4642e](https://github.com/amalv/bukie/commit/fa4642e7344e9b0666cb6f28b8228452a4ae817a))

# [1.25.0](https://github.com/amalv/bukie/compare/v1.24.0...v1.25.0) (2023-12-26)


### Bug Fixes

* add mock for Auth0Provider in App.test.tsx ([c0f8e1c](https://github.com/amalv/bukie/commit/c0f8e1c1e01a5bf149331bcae10a45fa3bd4d035))
* add ReactNode type to Auth0Provider props ([63896e6](https://github.com/amalv/bukie/commit/63896e60f1f81cc00fc46246fb6aefdcdb41cae6))


### Features

* add console log for redirect URI ([6050810](https://github.com/amalv/bukie/commit/6050810eb491a2ad3701295d3c1b0c4d2b9f1b90))

# [1.24.0](https://github.com/amalv/bukie/compare/v1.23.0...v1.24.0) (2023-12-26)


### Features

* add Auth0 configuration and remove obsolete code ([4c85438](https://github.com/amalv/bukie/commit/4c85438bab04c1165d07c2d80aca34b3423967e7))

# [1.23.0](https://github.com/amalv/bukie/compare/v1.22.1...v1.23.0) (2023-12-23)


### Features

* add Auth0 authentication and login button component ([fce9943](https://github.com/amalv/bukie/commit/fce9943bace31a8918bd4c7305c1827d46365b5b))

## [1.22.1](https://github.com/amalv/bukie/compare/v1.22.0...v1.22.1) (2023-12-22)


### Bug Fixes

* update  BookList test to support new search approach ([8ce1e34](https://github.com/amalv/bukie/commit/8ce1e347a5a3a148f129984cb546effafb20380d))

# [1.22.0](https://github.com/amalv/bukie/compare/v1.21.0...v1.22.0) (2023-12-22)


### Features

* update search functionality in BookList component to support author ([defb5b2](https://github.com/amalv/bukie/commit/defb5b2ace2f50e6734ae47eac4e9f6978b0fff9))

# [1.21.0](https://github.com/amalv/bukie/compare/v1.20.1...v1.21.0) (2023-12-21)


### Features

* implement infinite scrolling in Books component ([e5ce2c6](https://github.com/amalv/bukie/commit/e5ce2c62c21b85d581b41a29279d968022682e82))

## [1.20.1](https://github.com/amalv/bukie/compare/v1.20.0...v1.20.1) (2023-12-21)


### Bug Fixes

* update BookList test to support new response ([3b716ff](https://github.com/amalv/bukie/commit/3b716ffa06d0ba7c19120cb945a30e2d94879d49))

# [1.20.0](https://github.com/amalv/bukie/compare/v1.19.0...v1.20.0) (2023-12-21)


### Features

* update BookList component to limit number of books displayed ([230756d](https://github.com/amalv/bukie/commit/230756db0b110e4cbc2073c6a71709cd376c8c5a))

# [1.19.0](https://github.com/amalv/bukie/compare/v1.18.0...v1.19.0) (2023-12-21)


### Features

* update grid item sizes in BookList and BookCard components in order to improve responsive view ([0415a89](https://github.com/amalv/bukie/commit/0415a89edc8ed5f178cd3f931a4ece856c11073a))

# [1.18.0](https://github.com/amalv/bukie/compare/v1.17.0...v1.18.0) (2023-12-18)


### Features

* refactor BookList component and add loading message ([511972e](https://github.com/amalv/bukie/commit/511972ea47e31dffcb0fb5ac7351804a3fc1853d))

# [1.17.0](https://github.com/amalv/bukie/compare/v1.16.0...v1.17.0) (2023-12-18)


### Features

* add environment variable for production API URL ([f1029ed](https://github.com/amalv/bukie/commit/f1029ed7291cc1cb1ecae12f9649f9c8fb89db1e))

# [1.16.0](https://github.com/amalv/bukie/compare/v1.15.0...v1.16.0) (2023-12-18)


### Features

* add .env.sample and update .gitignore and apolloClient.ts ([be12c6a](https://github.com/amalv/bukie/commit/be12c6a22f4b0cd10972dab461b830d4d5c09380))

# [1.15.0](https://github.com/amalv/bukie/compare/v1.14.0...v1.15.0) (2023-12-18)


### Features

* refactor BookList component and add search functionality ([87a6e90](https://github.com/amalv/bukie/commit/87a6e909510eb55fa17c2e769e52f4f29a980273))

# [1.14.0](https://github.com/amalv/bukie/compare/v1.13.0...v1.14.0) (2023-12-17)


### Features

* add dark mode support and search functionality ([8117f66](https://github.com/amalv/bukie/commit/8117f6629c442ffdf30a118850b3163414705e2e))

# [1.13.0](https://github.com/amalv/bukie/compare/v1.12.0...v1.13.0) (2023-12-17)


### Features

* add @types/jest dependency and add test for BookCard ([be81247](https://github.com/amalv/bukie/commit/be812476a46b4643772b163d36ec363ceadbedca))

# [1.12.0](https://github.com/amalv/bukie/compare/v1.11.0...v1.12.0) (2023-12-17)


### Features

* add hover effect and transition to BookCard ([cb39f9a](https://github.com/amalv/bukie/commit/cb39f9a84e5078e5bbb0add5ddcbe3d047c48e20))

# [1.11.0](https://github.com/amalv/bukie/compare/v1.10.0...v1.11.0) (2023-12-15)


### Bug Fixes

* update assertion in BookList.test.tsx ([99ee329](https://github.com/amalv/bukie/commit/99ee3290b3d2435147236279dfcc8b3c1ac59f76))


### Features

* refactor BookList component and fix import in BookList.test.tsx ([bb2e4bb](https://github.com/amalv/bukie/commit/bb2e4bb4abc53b67d874168bc4bad3367b3453ec))

# [1.10.0](https://github.com/amalv/bukie/compare/v1.9.0...v1.10.0) (2023-12-14)


### Features

* enhance book card layout and adjust number of book cards per row ([c3c8488](https://github.com/amalv/bukie/commit/c3c8488e45ec1e330d12b56870a22c9a1fe910d6))

# [1.9.0](https://github.com/amalv/bukie/compare/v1.8.0...v1.9.0) (2023-12-13)


### Features

* differentiate API URL based on NODE_ENV ([a4334b7](https://github.com/amalv/bukie/commit/a4334b7597a7825b2faf7f465f4737246399a873))

# [1.8.0](https://github.com/amalv/bukie/compare/v1.7.0...v1.8.0) (2023-12-13)


### Features

* update book cards layout to occupy 8 columns on desktop screens ([159bceb](https://github.com/amalv/bukie/commit/159bceb8923b9f8e60bff312329f0dda181eea78))

# [1.7.0](https://github.com/amalv/bukie/compare/v1.6.0...v1.7.0) (2023-11-27)


### Features

* Integrate Apollo Client for data retrieval and install dependencies ([b73589d](https://github.com/amalv/bukie/commit/b73589d53b4eb7b3af4a3cb48e64d6249fed0312))

# [1.6.0](https://github.com/amalv/bukie/compare/v1.5.0...v1.6.0) (2023-11-27)


### Features

* add .prettierrc for Prettier configuration ([bc70ea3](https://github.com/amalv/bukie/commit/bc70ea310ecff383665cceb2e7486af5033eb86b))

# [1.5.0](https://github.com/amalv/bukie/compare/v1.4.0...v1.5.0) (2023-10-16)


### Features

* add vite-plugin-checker for TypeScript type checking ([59cab43](https://github.com/amalv/bukie/commit/59cab430b7449e81a851dc6790723e5a5cb7567a))

# [1.4.0](https://github.com/amalv/bukie/compare/v1.3.0...v1.4.0) (2023-10-16)


### Features

* add BookList UI with fake data and books factory ([c0602fb](https://github.com/amalv/bukie/commit/c0602fbe3b476ea568c855250d82bd13f61aef4d))
* add support for Code Climate GitHub Action and React Testing Library ([b850851](https://github.com/amalv/bukie/commit/b8508510dc150a078a59bc272fd00a51ea5a13cc))

# [1.3.0](https://github.com/amalv/bukie/compare/v1.2.0...v1.3.0) (2023-10-13)


### Features

* add vitest for testing ([2ac0057](https://github.com/amalv/bukie/commit/2ac0057a2bdce8768cbc8868b67ddc7a0119ce39))

# [1.2.0](https://github.com/amalv/bukie/compare/v1.1.0...v1.2.0) (2023-10-12)


### Features

* add MIT License to project ([a0f18d9](https://github.com/amalv/bukie/commit/a0f18d9ad8a467bdf82053ea8781d95f855fa2af))

# [1.1.0](https://github.com/amalv/bukie/compare/v1.0.0...v1.1.0) (2023-10-12)


### Features

* add support for Robot font using Fountsource ([3b0351c](https://github.com/amalv/bukie/commit/3b0351c3caf45cafc3613e011e24c5d6ab46cecd))

# 1.0.0 (2023-10-12)


### Features

* add @mui/material, @emotion/react, and @emotion/styled dependencies ([a641ed2](https://github.com/amalv/bukie/commit/a641ed255908c791a8a875b72dd96edf387e2ddb))
* add semantic release for automated versioning and changelog generation ([0b30f74](https://github.com/amalv/bukie/commit/0b30f7483e21f0af4e65325d7242b4d8a7305079))
* **App:** update welcome message ([ccfef69](https://github.com/amalv/bukie/commit/ccfef69446b56f4f1c9f7afb0fb5a1d549b83ba3))
* **config:** set base URL to /bukie/ ([d93ce8e](https://github.com/amalv/bukie/commit/d93ce8ed9376e1291566560bc3dc062171661563))
* create deploy for Github pages ([dc328aa](https://github.com/amalv/bukie/commit/dc328aac6c4237bbe9bc6aac023fecdaf106a18a))
* initialize project with Vite and React ([a50fba2](https://github.com/amalv/bukie/commit/a50fba287741802993fa076236a4c048e4248534))
