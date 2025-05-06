/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: ['next/core-web-vitals'],
  plugins: ['react', 'react-hooks', 'testing-library'],
  rules: {
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    'react/jsx-uses-react': 'off',
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    'testing-library/await-async-queries': 'error',
    'testing-library/no-await-sync-queries': 'error',
    'testing-library/prefer-screen-queries': 'warn'
  }
};
