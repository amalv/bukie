
# 🗂️ Architecture Decision Records (ADR) Index

This index lists all architectural decisions for Bukie. Each ADR is numbered and includes a short description, status, and a link to the file.
Some early ADRs are retained as historical context and marked `superseded` when implementation later moved in a different direction.

| Number | Title | Status      | Description                                 | Link                                      |
|--------|-------|-------------|---------------------------------------------|-------------------------------------------|
| 0001   | Initial Tech Stack | ongoing      | High-level tech stack choices for Bukie     | [0001-initial-tech-stack.md](./0001-initial-tech-stack.md) |
| 0002   | Frontend Framework | accepted     | Decision and rationale for frontend framework | [0002-frontend-framework.md](./0002-frontend-framework.md) |
| 0003   | Rendering Strategy | accepted     | SSR chosen for SEO, performance, and accessibility | [0003-rendering-strategy.md](./0003-rendering-strategy.md) |
| 0004   | Design System      | accepted     | Custom design system for full control and future npm package | [0004-design-system.md](./0004-design-system.md) |
| 0005   | Backend Framework  | superseded   | Early Elysia/Bun backend exploration replaced by Next.js server modules and route handlers | [0005-backend-framework.md](./0005-backend-framework.md) |
| 0006   | API Architecture   | superseded   | Early Eden/Elysia API exploration replaced by Next.js route handlers and REST-style endpoints | [0006-api-architecture.md](./0006-api-architecture.md) |
| 0007   | Authentication     | accepted     | Clerk chosen for secure, scalable authentication | [0007-authentication.md](./0007-authentication.md) |
| 0008   | Cloud Provider     | accepted     | Vercel chosen for hosting, previews, and managed integrations | [0008-cloud-provider.md](./0008-cloud-provider.md) |
| 0009   | Infrastructure as Code | superseded | Early Azure/Bicep IaC exploration replaced by Vercel project configuration | [0009-infrastructure-as-code.md](./0009-infrastructure-as-code.md) |
| 0010   | Database           | accepted     | PostgreSQL chosen for reliability and scalability | [0010-database.md](./0010-database.md) |
| 0011   | CI/CD              | accepted     | GitHub Actions chosen for automated builds and deployment | [0011-ci-cd.md](./0011-ci-cd.md) |
| 0012   | Package Manager    | accepted     | Bun chosen for package management and repo runtime workflows | [0012-package-manager.md](./0012-package-manager.md) |
| 0013   | Release System      | accepted     | Semantic Release chosen for automated versioning and changelog | [0013-release-system.md](./0013-release-system.md) |
| 0014   | Code Quality       | accepted     | Qlty.sh chosen for maintainability and coverage visibility | [0014-qltysh-code-quality.md](./0014-qltysh-code-quality.md) |
