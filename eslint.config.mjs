import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist/**', 'coverage/**', 'store/**', 'crypto/**']),

  {
    name: 'app/source',
    files: ['src/**/*.mts'],
    // Type-aware rules need strictNullChecks to work correctly, so they are
    // switched on together with `strict` rather than here.
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: { globals: globals.nodeBuiltin },
    rules: { 'no-console': 'error' },
  },

  {
    name: 'app/tests',
    files: ['test/**/*.test.mts'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: { globals: globals.nodeBuiltin },
  },

  {
    name: 'app/tooling',
    files: ['*.mjs', 'vitest.config.mts'],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.nodeBuiltin },
  },

  eslintConfigPrettier,
]);
