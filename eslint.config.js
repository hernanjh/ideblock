import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import i18next from 'eslint-plugin-i18next';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['**/node_modules/**', '**/out/**', '**/dist/**', '**/release/**', '**/coverage/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,js,mjs}'],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' },
      ],
      eqeqeq: ['error', 'always'],
    },
  },
  {
    files: ['apps/desktop/src/renderer/**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser },
    },
    plugins: {
      'react-hooks': reactHooks,
      i18next,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Every user-visible string must come from the translation files.
      'i18next/no-literal-string': [
        'error',
        {
          mode: 'jsx-only',
          callees: {
            exclude: ['i18n(ext)?', 't', 'hint', 'addEventListener', 'removeEventListener'],
          },
          'jsx-attributes': {
            include: ['title', 'alt', 'placeholder', 'label', 'aria-label', 'aria-description'],
          },
        },
      ],
    },
  },
  prettier,
);
