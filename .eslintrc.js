module.exports = {
  root: true,
  overrides: [
    {
      files: ['packages/**/*.ts', 'packages/**/*.tsx'],
      extends: ['@qadash/eslint-config/base'],
    },
    {
      files: ['apps/frontend/**/*.ts', 'apps/frontend/**/*.tsx'],
      extends: ['@qadash/eslint-config/nextjs'],
    },
    {
      files: ['apps/backend/**/*.ts'],
      excludedFiles: ['*.spec.ts', '*.test.ts'],
      extends: ['@qadash/eslint-config/nestjs'],
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    {
      files: ['apps/automation/**/*.ts'],
      extends: ['@qadash/eslint-config/base'],
    },
    {
      files: ['*.ts', '*.tsx'],
      parser: '@typescript-eslint/parser',
    },
    {
      files: ['*.js', '*.jsx'],
      parser: 'espree'
    },
    {
      files: ['*.test.ts', '*.test.tsx', '*.spec.ts', '*.spec.tsx'],
      plugins: ['jest'],
      extends: ['plugin:jest/recommended']
    }
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
    'no-console': ['warn', { allow: ['warn', 'error'] }]
  },
  env: {
    node: true,
    browser: true,
    es2022: true
  }
};