import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // Project-level rule overrides
  {
    rules: {
      // UI text naturally contains quotes — downgrade to warning
      "react/no-unescaped-entities": "warn",
      // setState inside effects is often intentional (e.g. listening to external stores)
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
