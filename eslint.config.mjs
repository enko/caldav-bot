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
    extends: [
      js.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      globals: globals.nodeBuiltin,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      'no-console': 'error',
      // `type` for data shapes, `interface` for contracts classes implement.
      // The rule cannot express that split, so it is off rather than half-wrong.
      '@typescript-eslint/consistent-type-definitions': 'off',
    },
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
