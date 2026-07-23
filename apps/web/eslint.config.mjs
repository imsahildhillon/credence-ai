import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';
import unusedImports from 'eslint-plugin-unused-imports';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // Next.js (bundles React + React Hooks + a baseline of jsx-a11y) + TypeScript.
  ...compat.extends('next/core-web-vitals', 'next/typescript'),

  // Accessibility is a merge gate (CLAUDE.md §13.1) — elevate the full
  // jsx-a11y recommended rule set to error. Positioned after Next's config
  // so it overrides Next's "warn" defaults for overlapping rules.
  ...compat.extends('plugin:jsx-a11y/recommended'),
  {
    rules: {
      // React 19 + CLAUDE.md §8.3 "Derive, don't sync" — an incorrect
      // dependency array is a correctness bug, not a style nit.
      'react-hooks/exhaustive-deps': 'error',

      // CLAUDE.md §20.1 — structured logging (Pino) only; console.log is
      // never committed. console.warn/console.error remain for the rare
      // case a lower-level module needs to surface something before the
      // logger is available.
      'no-console': ['error', { allow: ['warn', 'error'] }],

      // Consistent, alphabetized import grouping.
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          pathGroups: [
            {
              pattern: '@/**',
              group: 'internal',
            },
          ],
          alphabetize: { order: 'asc', caseInsensitive: true },
          'newlines-between': 'always',
        },
      ],
      'import/no-duplicates': 'error',
    },
  },

  // Unused imports: reported and auto-fixable (removed), distinct from
  // unused local variables, which @typescript-eslint continues to flag.
  {
    plugins: { 'unused-imports': unusedImports },
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],
    },
  },

  // Prettier last: disables ESLint stylistic rules that would conflict
  // with Prettier's own formatting.
  ...compat.extends('prettier'),
];

export default eslintConfig;
