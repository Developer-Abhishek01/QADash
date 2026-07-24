module.exports = {
  extends: ['@qadash/eslint-config/react', 'next/core-web-vitals', 'plugin:jsx-a11y/recommended'],
  rules: {
    '@next/next/no-html-link-for-pages': 'off',
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
  },
};