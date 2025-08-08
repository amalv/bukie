import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "jsdom",
    globals: true,
    exclude: ["tests/**", "tests-examples/**", "node_modules/**"],
    coverage: {
      provider: "v8",
      reporter: ["lcov", "text"],
    },
  },
});
