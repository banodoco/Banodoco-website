import js from '@eslint/js';
import globals from 'globals';

const ignoredMaterial = [
  '**/node_modules/**',
  '.desloppify/**',
  'archive/**',
  'assets/**',
  'docs/**',
  'journey-v6-plan/**',
  'static/**',
  'vendor/**',
  'content/content-archive-deferred.js',
  'ownership/reasons.js',
];

export default [
  { ignores: ignoredMaterial },
  {
    files: [
      '*.js',
      'content/**/*.js',
      'journey/**/*.js',
      'organism/**/*.js',
      'ownership/**/*.js',
      'tools/**/*.js',
      'tools/**/*.mjs',
    ],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-empty': ['error', { allowEmptyCatch: true }],
      // Keep pre-existing dead-code findings visible without making the first
      // tooling-only change rewrite runtime modules.
      'no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      'no-useless-assignment': 'warn',
    },
  },
];
