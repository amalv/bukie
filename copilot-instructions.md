# Copilot Custom Instructions

---

## Issue Template

**Title:**
Use a clear, action-oriented title (e.g., `docs: update roadmap`, `ci: add release workflow`).

**Description:**
- Brief summary of the task or change
- Link to related files, milestones, or ADRs if relevant
- State expected outcome or acceptance criteria
- Do not use 'Closes #X' in issues; this is only for PRs

**Checklist:**
- [ ] Task is actionable and scoped
- [ ] Reference related issues or PRs if needed

**Labels:**
Use `feat`, `docs`, `ci`, etc. for quick context

---

## Pull Request Template

**Title:**
Use a clear, action-oriented title (e.g., `ci: add Biome linting and formatting`).

**Description:**
- Brief summary of the changes
- Reference related issues using `Closes #X` to auto-close them
- List key changes, setup steps, or migration notes if needed

**Checklist:**
- [ ] Branch is pushed to remote before creating PR
- [ ] All CI checks pass
- [ ] PR references related issues (e.g., Closes #X)

---

## Testing Guidelines

- Use alongside test strategy: place `.test.ts` files next to their source `.ts` files (e.g., `index.ts` and `index.test.ts`).
- Use the AAA (Arrange, Act, Assert) pattern for tests. Each section should be separated by an empty line, without explicit comments for each A.


Example:
```typescript
import { add } from "./add"
import { describe, it, expect } from "vitest"

describe("add", () => {
  it("returns the sum of two numbers", () => {
    // Arrange
    const a = 2
    const b = 3

    // Act
    const result = add(a, b)

    // Assert
    expect(result).toBe(5)
  })
})
```

If more Arrange, Act, or Assert steps are needed, create additional test cases instead of adding more sections to a single test.
