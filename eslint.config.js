import pluginJs from '@eslint/js';

export default [
  pluginJs.configs.recommended,
  {
    rules: {
      'no-unused-vars': 'warn',
      'no-undef': 'off',
      'no-unexpected-multiline': 'warn',
      'semi': 'warn',
      'no-extra-semi': 'warn',
      'semi-spacing': 'warn',
      'no-else-return': 'warn',
      'indent': ['warn', 2],
      'quotes': [2, 'single', { 'avoidEscape': true }],
      'no-redeclare': 'warn'
    }
  }
];
