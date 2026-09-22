import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

/**
 * Native flat config. `next lint` was removed in Next.js 16 and `next build` no
 * longer lints, so ESLint is invoked directly by `npm run lint` and this file is
 * the only place the rules live. eslint-config-next 16 ships flat arrays, so no
 * FlatCompat shim is needed.
 */
const config = [
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts", "supabase/**"] },
  ...coreWebVitals,
  ...typescript,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
];

export default config;
