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
  {
    /**
     * Der Suchlauf, der belegt, dass keine Beschriftung mehr im Screen steht.
     *
     * Er sitzt im Lint und nicht in einem Skript daneben, weil ein Skript, das
     * niemand aufruft, nichts belegt: `./make.ps1 ci` faehrt ihn ohnehin. Zwei
     * Formen faengt er ab — Text zwischen Tags und eine Beschriftung als
     * Attribut.
     *
     * Nicht dabei sind Einheiten: `g`, `%`, `+`, `−` haben keine zwei
     * Buchstaben, und `kcal` steht ausdruecklich in der Ausnahme — es lautet in
     * jeder Sprache gleich. Wer eine weitere Einheit als Text schreibt, traegt
     * sie hier nach; das ist die Stelle, an der ueber so etwas entschieden wird.
     * Beim Attribut zaehlt nur der unmittelbare Wert: `sourceType === 'Product'`
     * im Ausdruck darunter ist ein Datenwert und keine Beschriftung.
     */
    files: ['app/**/*.tsx', 'src/components/**/*.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXText[value=/\\b(?!kcal\\b)[A-Za-z]{2,}\\b/]',
          message: 'Sichtbarer Text gehoert nach src/i18n und kommt ueber useTexts() in den Screen.',
        },
        {
          selector:
            'JSXAttribute[name.name=/^(label|hint|note|placeholder|title|subtitle|accessibilityLabel)$/] > Literal[value=/[A-Za-z]{2}/]',
          message: 'Beschriftungen gehoeren nach src/i18n und kommen ueber useTexts() in den Screen.',
        },
        {
          selector:
            'JSXAttribute[name.name=/^(label|hint|note|placeholder|title|subtitle|accessibilityLabel)$/] > JSXExpressionContainer > Literal[value=/[A-Za-z]{2}/]',
          message: 'Beschriftungen gehoeren nach src/i18n und kommen ueber useTexts() in den Screen.',
        },
      ],
    },
  },
);
