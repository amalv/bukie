/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react(), vanillaExtractPlugin()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "src/**/*.spec.{ts,tsx}"],
    exclude: ["src/stories/**", "tests/**", "tests-examples/**", "node_modules/**"],
    coverage: {
      provider: "v8",
      reporter: ["lcov", "text"],
      // Only measure coverage for app source files and ignore build/config/test scaffolding
      all: true,
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
        // Styles-only modules (no executable logic)
        "**/*.css.ts",
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
