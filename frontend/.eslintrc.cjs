module.exports = {
  root: true,
  env: { browser: true, es2020: true, jest: true },
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'plugin:react/recommended', 'plugin:react/jsx-runtime', 'plugin:react-hooks/recommended', 'plugin:jest/recommended', 'plugin:jsx-a11y/recommended', 'plugin:storybook/recommended'],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  settings: { react: { version: '18.2' } },
  plugins: ['react-refresh', 'jest', '@typescript-eslint', 'jsx-a11y'],
  rules: {
    'react/jsx-no-target-blank': 'off',
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    'react/prop-types': 'off',
    
    // 🚨 접근성 규칙 강화
    'jsx-a11y/alt-text': 'error',
    'jsx-a11y/anchor-has-content': 'error',
    'jsx-a11y/aria-props': 'error',
    'jsx-a11y/click-events-have-key-events': 'error',
    'jsx-a11y/heading-has-content': 'error',
    'jsx-a11y/no-noninteractive-element-interactions': 'warn',
    'jsx-a11y/role-has-required-aria-props': 'error',
    'jsx-a11y/role-supports-aria-props': 'error',
    'jsx-a11y/tabindex-no-positive': 'error',
    'jsx-a11y/interactive-supports-focus': 'error',
    'jsx-a11y/no-autofocus': 'warn',
    'jsx-a11y/media-has-caption': 'warn',
  },
  overrides: [
    {
      files: ['**/__tests__/**'],
      env: {
        'jest/globals': true
      },
    },
  ],
}
