# ADR 0014: Adopt Qlty.sh for Code Quality and Maintainability

## Status
Accepted

## Context
We need robust code quality checks, maintainability analysis, and coverage gates for our Next.js repo. Biome provides linting/formatting, but does not cover code smells, duplication, or maintainability. Qlty.sh is a modular, modern platform that integrates with Biome and GitHub Actions, providing:
- PR quality gates (smells, duplication, complexity)
- Coverage on diffs
- Maintainability checks
- Unified reporting and PR comments
- Modular configuration via `qlty.toml`

Alternatives considered:
- **Biome-only**: Great for lint/format, but lacks maintainability/coverage UX.
- **GitHub CodeQL**: Security-focused, not general code quality.
- **GitHub Super-Linter**: Runs linters, but lacks maintainability/coverage features.
- **SonarCloud/DeepSource**: More complex, less modern workflow, not as tightly integrated with Biome.

## Decision
We will use Qlty.sh for code quality, maintainability, and coverage gates. Biome will remain our linter/formatter, integrated via Qlty. Qlty.sh is modular, so we can disable formatting and focus on quality checks. This fits our Next.js + GitHub Actions + Vercel workflow perfectly.

## Consequences
- PRs will be gated on code quality, coverage, and maintainability.
- Biome lint/format will run as part of Qlty checks.
- Unified reporting and PR comments for quality issues.
- Easy configuration and extensibility via `qlty.toml`.

## References
- [Qlty.sh Docs](https://docs.qlty.sh)
- [Qlty.sh GitHub Action](https://github.com/qltysh/qlty-action)
- [Biome](https://biomejs.dev)
- [GitHub CodeQL](https://github.com/github/codeql)
- [GitHub Super-Linter](https://github.com/github/super-linter)
