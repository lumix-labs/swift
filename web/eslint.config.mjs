// Modern ESLint flat config (ESLint v8+)
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';
import path from 'path';
import { fileURLToPath } from 'url';

// Convert __dirname equivalent for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create compat layer to use plugins and configs from eslintrc
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

export default [
  // Apply ignore patterns (migrated from .eslintignore)
  {
    ignores: [
      '**/node_modules/**',
      '**/\.next/**',
      '**/\.next/types/**',
      '.next/**',
      'out/**',
      'dist/**',
      'public/**',
      '**/coverage/**',
      '**/*.d.ts',
      '.next/types/app/api/repos/download/route.ts',
    ],
  },

  // Core JS/TS configuration
  js.configs.recommended,
  ...compat.extends(
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'next/core-web-vitals'
  ),

  // Source files configuration
  {
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    rules: {
      // Base rules
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      'no-unused-vars': 'off', // Handled by TypeScript plugin
      'no-empty': ['error', { 'allowEmptyCatch': true }],
      'no-useless-escape': 'off', // This can be too strict at times
      'no-case-declarations': 'warn', // Allow declarations in case blocks but warn

      // TypeScript rules
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',

      // React rules
      'react/prop-types': 'off', // Not needed with TypeScript
      'react/react-in-jsx-scope': 'off', // Not needed in Next.js
      'react/jsx-filename-extension': ['warn', { extensions: ['.tsx'] }],

      // React Hooks rules
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // A11y rules
      'jsx-a11y/no-autofocus': 'off', // Sometimes needed for UX
      'jsx-a11y/click-events-have-key-events': 'warn', // Warning instead of error
      'jsx-a11y/no-static-element-interactions': 'warn', // Warning instead of error
    },
  },

  // Test files with relaxed rules
  {
    files: ['**/*.test.{js,jsx,ts,tsx}', '**/__tests__/**/*.{js,jsx,ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'react-hooks/exhaustive-deps': 'off',
    },
  },
];
