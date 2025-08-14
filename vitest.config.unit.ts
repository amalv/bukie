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
