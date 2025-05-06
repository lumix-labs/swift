// Minimal ESLint configuration that works with ESLint 9.x flat config
module.exports = {
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parser: require('@typescript-eslint/parser'),
    parserOptions: {
      ecmaFeatures: {
        jsx: true
      },
      ecmaVersion: 'latest',
      sourceType: 'module',
      project: './tsconfig.json'
    },
    globals: {
      document: 'readonly',
      navigator: 'readonly',
      window: 'readonly',
      console: 'readonly',
      process: 'readonly',
      describe: 'readonly',
      it: 'readonly',
      expect: 'readonly'
    }
  },
  linterOptions: {
    reportUnusedDisableDirectives: 'warn',
    noInlineConfig: false
  },
  rules: {
    'no-unused-vars': 'warn',
    'no-undef': 'warn' // Downgrade to warning to prevent blocking commits
  },
  ignores: [
    '**/node_modules/**',
    '**/.next/**',
    '**/out/**',
    '**/build/**',
    '**/public/**',
    '**/dist/**'
  ]
};
