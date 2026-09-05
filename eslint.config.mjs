import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Purely cosmetic in JSX text ( " and ' render fine ), no runtime impact.
      "react/no-unescaped-entities": "off",
      // Allow intentionally-unused bindings when prefixed with "_"
      // (e.g. destructuring to omit a field, unimplemented stub params).
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Standalone dev/util scripts, not part of the app build.
    "scripts/**",
  ]),
]);

export default eslintConfig;
