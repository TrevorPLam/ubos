//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'

export default [
  // Extend the root ESLint configuration
  ...tanstackConfig,
  
  // Web app specific overrides
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      // Keep these disabled from the original config
      'import/no-cycle': 'off',
      'import/order': 'off',
      'sort-imports': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/require-await': 'off',
      'pnpm/json-enforce-catalog': 'off',
    },
  },
  
  // Ignore patterns specific to web app
  {
    ignores: [
      'eslint.config.js',
      'prettier.config.js',
      'dist/**',
      'node_modules/**',
      '.turbo/**',
      '.tanstack/**',
    ],
  },
]
