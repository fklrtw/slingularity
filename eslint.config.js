import eslint from '@eslint/js'
import stylistic from '@stylistic/eslint-plugin'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    // Global ignores must be in their own object without any other keys
    ignores: ['dist/**', 'node_modules/**', 'check-configs.js'],
  },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  stylistic.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'indent': [
        'error',
        2,
        {
          SwitchCase: 1,
        },
      ],
      'no-tabs': 'error',
      'no-undef': 'off',
      'curly': [
        'error',
        'all',
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@stylistic/brace-style': [
        'error',
        '1tbs',
        {
          allowSingleLine: false,
        },
      ],
      '@stylistic/comma-dangle': ['error', 'only-multiline'],
      '@stylistic/semi': ['error', 'always'],
      '@stylistic/semi-style': ['error', 'last'],
      '@stylistic/semi-spacing': 'error',
      // disable new v6 list-style rule to preserve existing formatting
      '@stylistic/list-style': 'off',
    },
  },
)
