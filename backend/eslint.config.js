const globals = require('globals');

module.exports = [
  {
    ignores: [
      'coverage/**',
      'data/**',
      'node_modules/**',
      'uploads/**',
    ],
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        ...globals.jest,
        ...globals.node,
      },
    },
    rules: {},
  },
];
