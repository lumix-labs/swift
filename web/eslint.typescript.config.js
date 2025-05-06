// ESLint configuration for TypeScript projects
// This is a more comprehensive configuration that should be used
// once the ESLint 9.x compatibility issues are resolved
module.exports = {
  files: ["**/*.ts", "**/*.tsx"],
  plugins: {
    "@typescript-eslint": require("@typescript-eslint/eslint-plugin")
  },
  languageOptions: {
    parser: require("@typescript-eslint/parser"),
    parserOptions: {
      ecmaFeatures: {
        jsx: true
      },
      ecmaVersion: "latest",
      sourceType: "module",
      project: "./tsconfig.json"
    }
  },
  settings: {
    react: {
      version: "detect"
    }
  },
  rules: {
    // TypeScript-specific rules
    "@typescript-eslint/no-unused-vars": "warn",
    "@typescript-eslint/no-explicit-any": "warn",
    
    // Disable rules that conflict with TypeScript
    "no-undef": "off", // TypeScript handles this
    "no-unused-vars": "off" // Use @typescript-eslint/no-unused-vars instead
  }
};
