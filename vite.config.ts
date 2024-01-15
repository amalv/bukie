import path from "path";

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { checker } from "vite-plugin-checker";

/* eslint-disable import/no-default-export */
export default defineConfig({
  plugins: [
    react(),
    checker({
      typescript: true,
    }),
  ],
  base: process.env.PUBLIC_BASE_URL || "/",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
