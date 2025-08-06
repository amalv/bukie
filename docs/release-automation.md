# 🚀 Release Automation with Semantic Release

This document explains how Bukie uses Semantic Release and GitHub Actions to automate releases, versioning, and changelog management.

## Overview
- **Semantic Release** automatically determines the next version, generates release notes, and publishes releases based on commit messages.
- **GitHub Actions** runs Semantic Release on every push to the `main` branch, ensuring releases are published and the changelog is updated without manual intervention.

## Workflow Details
- Workflow file: `.github/workflows/release.yml`
- Trigger: Push to `main` branch
- Steps:
  1. Checkout code
  2. Set up Bun
  3. Install dependencies (`bun install`)
  4. Run Semantic Release (`bun run release`)

## GITHUB_TOKEN
- Provided automatically by GitHub Actions for each workflow run
- Has write permissions by default (can create releases/tags)
- No manual setup required, but ensure repository workflow permissions are set to "Read and write" in Settings → Actions → General

## Usage
- To trigger a release, merge changes to the `main` branch with properly formatted commit messages (see [Conventional Commits](https://www.conventionalcommits.org/)).
- Semantic Release will:
  - Analyze commits
  - Update `CHANGELOG.md`
  - Create a new release and tag on GitHub

## References
- [Semantic Release Documentation](https://semantic-release.gitbook.io/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)


For more details, see:
- [CI/CD ADR](./decisions/0011-ci-cd.md)
- [README](../README.md)
