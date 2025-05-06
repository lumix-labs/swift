// This is a simple ESLint configuration that avoids the Next.js ESLint issues
// but still provides basic linting capabilities

module.exports = {
  extends: ["eslint:recommended"],
  env: {
    node: true,
    browser: true,
    es6: true
  },
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
    ecmaFeatures: {
      jsx: true
    }
  },
  settings: {
    react: {
      version: "detect"
    }
  },
  rules: {
    // Simple set of rules that won't cause problems
    "no-console": ["warn", { allow: ["warn", "error"] }],
    "no-unused-vars": "warn"
  },
  ignorePatterns: [
    "node_modules/",
    ".next/",
    "out/",
    "build/",
    "public/"
  ]
};
