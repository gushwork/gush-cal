import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    // Node 22 cold-imports the UI component modules more slowly than Node 20 (5s default was exceeded).
    testTimeout: 30000,
    include: ["**/*.test.ts", "**/*.test.tsx"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
