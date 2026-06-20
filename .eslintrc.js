module.exports = {
  root: true,
  extends: ['@qadash/eslint-config/base'],
  overrides: [
    {
      files: ['apps/frontend/**/*.ts', 'apps/frontend/**/*.tsx'],
      extends: ['@qadash/eslint-config/nextjs'],
    },
    {
      files: ['apps/backend/**/*.ts'],
      extends: ['@qadash/eslint-config/nestjs'],
    },
    {
      files: ['apps/automation/**/*.ts'],
      extends: ['@qadash/eslint-config/base'],
    },
    {
      files: ['*.ts', '*.tsx'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        project: './tsconfig.json'
      }
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