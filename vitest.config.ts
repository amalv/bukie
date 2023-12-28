import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./tests.setup.ts",
    coverage: {
      exclude: [
        "**/.eslintrc.cjs",
        "**/main.tsx",
        "**/vite-env.d.ts",
        "**/.styles.ts",
        "**/index.ts",
      ],
    },
  },
});
