const tseslint = require('typescript-eslint');
const prettier = require('eslint-config-prettier');

/**
 * Lint dieses Repos. Flat Config, CommonJS — package.json setzt kein `type`.
 *
 * `prettier` steht bewusst zuletzt: es schaltet die Regeln ab, die über
 * Formatierung streiten. Formatierung entscheidet Prettier, Lint entscheidet
 * über den Rest — zwei Werkzeuge, keine zwei Meinungen.
 */
module.exports = tseslint.config(
  { ignores: ['node_modules/**', 'pacts/**', '.expo/**', 'dist/**', 'ios/**', 'android/**', 'package-lock.json'] },
  ...tseslint.configs.recommended,
  prettier,
  {
    // Flat Config wird von ESLint als CommonJS geladen; `require` ist hier
    // kein Rueckfall, sondern die einzige Form, die funktioniert.
    files: ['*.config.js'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
);
