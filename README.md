# Bukie

[![Maintainability](https://api.codeclimate.com/v1/badges/38db54aa8cafbb619f02/maintainability)](https://codeclimate.com/github/amalv/bukie/maintainability)
[![Test Coverage](https://api.codeclimate.com/v1/badges/38db54aa8cafbb619f02/test_coverage)](https://codeclimate.com/github/amalv/bukie/test_coverage)
![Code Climate Status](https://github.com/amalv/bukie/actions/workflows/codeclimate.yml/badge.svg)
![Deploy Status](https://github.com/amalv/bukie/actions/workflows/deploy.yml/badge.svg)
![Semantic Release Status](https://github.com/amalv/bukie/actions/workflows/release.yml/badge.svg)
![TypeScript](https://img.shields.io/badge/-TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/-React-61DAFB?style=flat-square&logo=react&logoColor=white)
![Apollo Client](https://img.shields.io/badge/-Apollo_Client-311C87?style=flat-square&logo=apollo-graphql&logoColor=white)
![Auth0](https://img.shields.io/badge/-Auth0-EB5424?style=flat-square&logo=auth0&logoColor=white)
![Vite](https://img.shields.io/badge/-Vite-646CFF?style=flat-square&logo=vite&logoColor=white)
![Bun](https://img.shields.io/badge/bun-282a36?style=flat-square&logo=bun&logoColor=fbf0df)
![Playwright](https://img.shields.io/badge/Playwright-45ba4b?style=flat-square&logo=Playwright&logoColor=white)

Bukie is a project showcasing the use of TypeScript, React, Emotion, Material UI, and Apollo Client in a real-world application. It features a curated list of science fiction books, with a search engine and filters by title and author for easy navigation.

The application supports both light and dark themes, adapting to user browser preference, and offers infinite scrolling on the book list. User authentication is handled via Auth0.

The project leverages Semantic Release for automated versioning and releases, and Biome for code format and linting. It also benefits from the fast development and build times provided by Vite.

⚠️ This project is the companion to a backend project, which is an Apollo Server project that uses serverless, AWS Lambda, and Postgres as a database. The backend project must be launched first for local development. You can find it [here](https://github.com/amalv/apollo-server-lambda-postgres/).

## Screenshot

![Showcase Image](https://i.postimg.cc/BvCHjxWY/cropped.png)

## Features

📚 Curated list of science fiction books

🎛️ Filters by title and author

🚀 Built with TypeScript and React

💅 Styled with Emotion and Material UI design system

🌓 Supports light and dark themes (defaults to user browser preference)

📜 Infinite scrolling on the book list

🔒 User authentication via Auth0

🚦 Automated versioning and releases with Semantic Release

🔧 Code linting and formatting with Biome


🚀 Fast development and build times with Vite

📡 Data fetching with Apollo Client

## Getting Started

⚠️ To get started with the project, you must first launch the backend project. You can find it [here](https://github.com/amalv/apollo-server-lambda-postgres/).

Then, follow these steps:

Clone the repository:

```sh
git clone git@github.com:amalv/bukie.git
```

Install the dependencies:

```sh
npm install
```

Update the `.env.sample` file with your environment variables:

```sh
VITE_API_URL_DEVELOPMENT= # Usually http://localhost:3000 from the companion project
VITE_AUTH0_DOMAIN=
VITE_AUTH0_CLIENT_ID=
```

Rename the `.env.sample` to `.env`

Start the development server:

```sh
npm run dev
```

## License

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT).
