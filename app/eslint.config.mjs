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

  // This rule is too noisy for common patterns used in this codebase
  // (mount flags, syncing derived UI state). We rely on code review for these.
  {
    rules: {
      'react-hooks/set-state-in-effect': 'off',
    },
  },
]);

export default eslintConfig;
