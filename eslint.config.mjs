import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// Next.js ESLint configuration with Prettier integration
const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    rules: {
      // Make all ESLint rules warnings instead of errors during development
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      'no-unused-vars': 'off', // Disable the base rule as it can report incorrect errors
      '@typescript-eslint/no-unused-vars': 'warn', // Use TypeScript-specific rule instead
      'prefer-const': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn', // Downgrade from error to warning
      'react-hooks/exhaustive-deps': 'warn', // Ensure this is a warning, not error
      'react/no-unescaped-entities': 'warn', // Downgrade to warning
    },
  },
];

export default eslintConfig;
