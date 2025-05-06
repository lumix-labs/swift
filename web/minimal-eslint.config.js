// Minimal ESLint configuration that works with ESLint 9.x flat config
module.exports = {
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    globals: {
      document: 'readonly',
      navigator: 'readonly',
      window: 'readonly',
      console: 'readonly'
    }
  },
  linterOptions: {
    reportUnusedDisableDirectives: 'warn',
    noInlineConfig: false
  },
  rules: {
    'no-unused-vars': 'warn',
    'no-undef': 'error'
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
