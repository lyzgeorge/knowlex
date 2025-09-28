module.exports = {
  root: true,
  env: {
    browser: true,
    es2020: true,
    node: true
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript'
  ],
  ignorePatterns: ['out', 'dist', 'dist-electron', 'node_modules', '*.js'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  plugins: ['react-hooks', '@typescript-eslint', 'import'],
  settings: {
    'import/resolver': {
      typescript: true
    }
  },
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    'import/default': 'off',
    'import/no-named-as-default': 'off',
    'import/no-named-as-default-member': 'off'
  },
  overrides: [
    {
      files: ['src/main/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': ['error', { patterns: ['@renderer/*'] }]
      }
    },
    {
      files: ['src/renderer/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': ['error', { patterns: ['@main/*'] }]
      }
    },
    {
      files: ['src/shared/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': ['error', { patterns: ['@main/*', '@renderer/*'] }]
      }
    }
  ]
}
