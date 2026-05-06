// @ts-check

import js from '@eslint/js';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import eslintConfigPrettier from 'eslint-config-prettier/flat';

export default [
  // Base JavaScript rules
  js.configs.recommended,
  
  // TypeScript configuration
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: true,
        tsconfigRootDir: process.cwd(),
      },
    },
    plugins: {
      '@typescript-eslint': typescriptEslint,
    },
    rules: {
      ...typescriptEslint.configs.recommended.rules,
      ...typescriptEslint.configs.recommendedTypeChecked.rules,
      // Override rules that were disabled in apps/web/eslint.config.js
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/require-await': 'off',
    },
  },
  
  // Prettier integration (must be last)
  eslintConfigPrettier,
  
  // Ignore patterns
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.turbo/**',
      '**/.tanstack/**',
      '**/coverage/**',
      '**/.next/**',
      '**/build/**',
      '**/*.config.js',
      '**/*.config.mjs',
    ],
  },
];
