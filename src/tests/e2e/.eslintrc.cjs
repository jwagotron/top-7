/* eslint-env node */
module.exports = {
  root: true,
  env: {
    node: true,
    commonjs: true,
    es2021: true,
  },
  rules: {
    'no-undef': 'off',
  },
  overrides: [
    {
      files: ['**/*.js', '**/*.cjs'],
      env: {
        node: true,
        commonjs: true,
      },
      rules: {
        'no-undef': 'off',
      },
    },
  ],
};