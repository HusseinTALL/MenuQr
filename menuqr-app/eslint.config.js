import js from '@eslint/js';
import pluginVue from 'eslint-plugin-vue';
import vueTsEslintConfig from '@vue/eslint-config-typescript';
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting';

export default [
  {
    name: 'app/files-to-lint',
    files: ['**/*.{ts,mts,tsx,vue}'],
  },

  {
    name: 'app/files-to-ignore',
    ignores: [
      '**/dist/**',
      '**/dist-ssr/**',
      '**/coverage/**',
      '**/node_modules/**',
      '**/.git/**',
      '**/public/**',
      '**/dev-dist/**',
    ],
  },

  js.configs.recommended,
  ...pluginVue.configs['flat/essential'],
  ...vueTsEslintConfig(),
  skipFormatting,

  {
    name: 'app/custom-rules',
    rules: {
      // Vue specific rules
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'warn',
      'vue/require-default-prop': 'off',
      'vue/require-explicit-emits': 'error',
      'vue/block-order': ['error', {
        order: ['script', 'template', 'style']
      }],
      'vue/no-unused-refs': 'error',
      'vue/no-useless-v-bind': 'error',

      // TypeScript rules
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // General rules
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      'no-debugger': 'error',
      'no-alert': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      'eqeqeq': ['error', 'always'],
      'curly': ['error', 'all'],
    },
  },

  {
    name: 'app/test-files',
    files: ['**/*.test.ts', '**/*.spec.ts', '**/test/**/*.ts', '**/e2e/**/*.ts'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-non-null-asserted-optional-chain': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
];
