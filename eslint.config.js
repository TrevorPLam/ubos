import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";

export default [
  {
    ignores: ["dist/**", "node_modules/**", "client/dist/**", "coverage/**", "**/*.min.*"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactPlugin.configs["jsx-runtime"].rules,
      ...reactHooksPlugin.configs.recommended.rules,

      // This repo uses some custom DOM attributes (e.g. cmdk) that React's rule flags.
      "react/no-unknown-property": "off",

      // Too strict for current codebase; revisit if/when we want purity enforcement.
      "react-hooks/purity": "off",

      // Vite/TS will handle unused vars more consistently if/when enabled;
      // keep ESLint noise low by default.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],

      // Too noisy for many TS codebases; rely on TS.
      "@typescript-eslint/no-explicit-any": "off",

      // React in TS does not require prop-types.
      "react/prop-types": "off",
    },
  },
  {
    files: [
      "server/**/*.{ts,tsx,js,jsx}",
      "script/**/*.{ts,tsx,js,jsx}",
      "vite.config.ts",
      "tailwind.config.ts",
    ],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ["client/src/**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
];
