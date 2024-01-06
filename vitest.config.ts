import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    globals: true,
    environment: "jsdom",
    exclude: [...configDefaults.exclude, "**/tests/**", "**/tests-examples/**"],
    setupFiles: "./tests.setup.ts",
    coverage: {
      exclude: [
        "**/.eslintrc.cjs",
        "**/main.tsx",
        "**/vite-env.d.ts",
        "**/.styles.ts",
        "**/index.ts",
        "**/tests/**",
        "**/tests-examples/**",
      ],
    },
  },
});
