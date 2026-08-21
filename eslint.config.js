import globals from 'globals'
import stylistic from '@stylistic/eslint-plugin'
import js from '@eslint/js'

export default [
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      sourceType: 'module',
      globals: {
        ...globals.browser,
      },
      ecmaVersion: 'latest',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      '@stylistic': stylistic,
    },
    rules: {
      '@stylistic/indent': [
        'error',
        2,
        // unified @stylistic defaults SwitchCase to 1; the js-only plugin this
        // config migrated from defaulted to 0. Pinned so the style is unchanged.
        { 'SwitchCase': 0 }
      ],
      '@stylistic/linebreak-style': [
        'error',
        'unix'
      ],
      '@stylistic/quotes': [
        'error',
        'single'
      ],
      '@stylistic/semi': [
        'error',
        'never'
      ],
      'eqeqeq': 'error',
      'no-trailing-spaces': 'error',
      'object-curly-spacing': [
        'error', 'always'
      ],
      'arrow-spacing': [
        'error', { 'before': true, 'after': true },
      ],
      'no-console': 'off',
    },
  },
  {
    files: ['vite.config.js', 'eslint.config.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    // .wolf/** is vendored OpenWolf hook tooling (CommonJS, its own style)
    ignores: ['dist/**', 'build/**', 'node_modules/**', '.wolf/**', 'coverage/**'],
  },
]
