import { defineConfig } from "vitest/config";
import path from "path";

// Coverage requires @vitest/coverage-v8:
//   npm install -D @vitest/coverage-v8
// It is already listed in devDependencies if present in package.json.

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.{ts,tsx}", "src/**/__tests__/**/*.{ts,tsx}"],
    exclude: ["node_modules", ".next", "e2e"],
    coverage: {
      // Uses @vitest/coverage-v8 — install with: npm install -D @vitest/coverage-v8
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/__tests__/**",
        "node_modules/**",
        ".next/**",
      ],
      thresholds: {
        // Goal: prevent regression, raise as coverage grows.
        lines: 30,
        functions: 28,
        branches: 22,
        statements: 30,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
