import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactRecommended from 'eslint-plugin-react/configs/recommended.js';
import reactHooks from 'eslint-plugin-react-hooks';
import nextPlugin from 'eslint-config-next';
import testingLibrary from 'eslint-plugin-testing-library';
// import jest from 'eslint-plugin-jest';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parser: tseslint.parser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    files: ['**/*.{js,mjs,cjs,jsx,ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'testing-library': testingLibrary,
      // 'jest': jest,
    },
    rules: {
      // React 18 rules
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      
      // React best practices
      'react/jsx-uses-react': 'off',
      'react/react-in-jsx-scope': 'off', // Not needed in React 18
      'react/prop-types': 'off', // Use TypeScript instead
      
      // TypeScript best practices
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      
      // Testing best practices
      'testing-library/await-async-queries': 'error',
      'testing-library/no-await-sync-queries': 'error',
      'testing-library/prefer-screen-queries': 'warn',
      // 'jest/no-disabled-tests': 'warn',
      // 'jest/no-focused-tests': 'error',
      // 'jest/valid-expect': 'error',
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  // Apply Next.js specific rules
  nextPlugin,
);
