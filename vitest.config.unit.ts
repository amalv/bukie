/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "src/**/*.spec.{ts,tsx}"],
    exclude: ["src/stories/**", "tests/**", "tests-examples/**", "node_modules/**"],
    coverage: {
      provider: "v8",
      reporter: ["lcov", "text"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        // Top-level and tool configs
        "**/vitest.config*.ts",
        "**/next.config.ts",
        "**/playwright.config.ts",
        "**/commitlint.config.ts",
        "**/drizzle.config*.ts",
        "**/lefthook.yml",
        // Types-only modules
        "**/types.ts",
        "**/*.d.ts",
        // Database and providers (covered via integration/e2e; out of scope for unit coverage)
        "src/db/**",
        // Non-critical admin/debug/seed API routes (manual ops, not part of unit targets)
        "src/app/api/admin/**",
        "src/app/api/debug/**",
        "src/app/api/seed/**",
        // Generated or non-source folders
        "drizzle/**",
        "scripts/**",
        "public/**",
        "docs/**",
        "tests/**",
        "tests-examples/**",
        "src/stories/**",
        "**/*.stories.*",
        "**/.storybook/**"
      ]
    }
  }
});
