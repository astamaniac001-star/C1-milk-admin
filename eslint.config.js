// ─────────────────────────────────────────────────────────────────────────────
// FILE: eslint.config.js
// ─────────────────────────────────────────────────────────────────────────────
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist", ".netlify", ".tmp", ".vite", "coverage"]),
  {
    files: ["**/*.{js,jsx}"],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Flag stray console.log but allow warn/error
      "no-console": ["warn", { allow: ["warn", "error"] }],
      
      // ✅ ADDED: Allow exporting constants/helpers from .jsx files
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true }
      ],
    },
  },

  //  Cloudflare Pages functions directory
  {
    files: ["functions/**/*.js"],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: {
        // Cloudflare Pages Functions globals
        Request: "readonly",
        Response: "readonly",
        fetch: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        crypto: "readonly",
      },
    },

    ignores: [
      "dist/**",
      "node_modules/**",
      "playwright-report/**",
      "test-results/**",
      "coverage/**",
    ],
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
]);