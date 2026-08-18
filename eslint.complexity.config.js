const tseslint = require('typescript-eslint');

/**
 * Komplexitätsmaß, getrennt vom Lint-Lauf.
 *
 * Getrennt, weil die Antwort eine andere ist: Lint sagt „das ist falsch",
 * Komplexität sagt „das ist zu viel auf einmal". Wer das eine abstellt, um das
 * andere loszuwerden, hätte sonst leichtes Spiel.
 */
module.exports = tseslint.config(
  { ignores: ['node_modules/**', 'pacts/**', '.expo/**', 'dist/**', 'ios/**', 'android/**'] },
  {
    files: ['**/*.{ts,tsx,js}'],
    languageOptions: { parser: tseslint.parser },
    rules: {
      complexity: ['error', { max: 10 }],
      'max-depth': ['error', 4],
      'max-nested-callbacks': ['error', 4],
      'max-params': ['error', 5],
    },
  },
);
