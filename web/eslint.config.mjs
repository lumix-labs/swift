import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // React rules
      "react/jsx-uses-react": "error",
      "react/jsx-uses-vars": "error",
      "react/prop-types": "off", // We use TypeScript for type checking
      "react/react-in-jsx-scope": "off", // Not needed with Next.js
      "react/display-name": "off",
      "react/jsx-curly-brace-presence": ["error", { props: "never", children: "never" }],
      
      // TypeScript rules
      "@typescript-eslint/no-unused-vars": ["warn", { 
        argsIgnorePattern: "^_", 
        varsIgnorePattern: "^_" 
      }],
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-non-null-assertion": "warn",
      
      // Import rules
      "import/no-unresolved": "off", // TypeScript handles this
      "import/order": [
        "error",
        {
          "groups": [
            "builtin",
            "external",
            "internal",
            ["parent", "sibling"],
            "index"
          ],
          "newlines-between": "never"
        }
      ],
      
      // Common JS/TS rules
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-debugger": "warn",
      "prefer-const": "error",
      "no-var": "error",
      "eqeqeq": ["error", "always"],
      "curly": ["error", "all"],
      "max-len": ["warn", { "code": 120 }],
      
      // Functional component best practices
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn"
    }
  }
];

export default eslintConfig;
