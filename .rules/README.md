# Rules

Die verbindlichen Coding-Standards dieses Repos. Eine **gemeinsame** Schicht plus je ein
**sprachspezifisches** Verzeichnis.

## Aufbau

```text
.rules/
├── common/          # sprachunabhängige Prinzipien
│   ├── anti-anemic-domain.md
│   ├── coding-style.md
│   ├── kommentare-und-tsdoc.md
│   ├── escalation.md
│   ├── git-workflow.md
│   ├── patterns.md
│   ├── performance.md
│   └── security.md
├── typescript/      # der Stack dieses Repos — Einstieg: typescript/README.md
└── app/             # die Regeln dieses Projekts — Einstieg: app/README.md
```

- **`common/`** trägt allgemeine Prinzipien ohne sprachspezifische Beispiele.
- **`typescript/`** erweitert sie um die Muster, Werkzeuge und Codebeispiele dieses Stacks. Der
  Index dort ([`typescript/README.md`](typescript/README.md)) nennt die empfohlene Lesereihenfolge.
- **`app/`** trägt, was für **diese App** gilt: Farb- und Maßliterale, Beschriftungen, die zehn
  Vertragsregeln, die HTTP-Schicht und die Prüfliste vor der Abnahme. Das war bis zum 28.08.2026
  die Datei `docs/regeln.md`; sie ist hierher aufgelöst und existiert nicht mehr
  ([`app/README.md`](app/README.md)).

Damit ist `.rules/` die **einzige** Stelle für Regeln. [`CLAUDE.md`](../CLAUDE.md) verweist nur
hierher und behauptet selbst nichts; [`docs/decisions/`](../docs/decisions/) hält fest, **warum**
eine Regel so lautet, nicht **dass** sie gilt.

## Geltungsbereich

Diese Regeln gelten für **allen** TypeScript-Code dieses Repos: [`app/`](../app/),
[`src/`](../src/), [`pact/`](../pact/) und die Konfigurationsdateien im Wurzelverzeichnis.
**Testcode ist Code.**

Das ist hier keine Absichtserklärung, sondern der Zustand der Werkzeuge:
[`eslint.config.js`](../eslint.config.js) und
[`eslint.complexity.config.js`](../eslint.complexity.config.js) nehmen nur Erzeugtes und Fremdes
aus (`node_modules/`, `pacts/`, `.expo/`, `dist/`, `ios/`, `android/`) — die Vertragstests unter
`pact/` und die Tests neben dem Code laufen durch denselben Lint und dasselbe Komplexitätsmaß wie
`app/` und `src/`. [`tsconfig.json`](../tsconfig.json) prüft mit `strict` über `**/*.ts` und
`**/*.tsx`, also ebenfalls über den Testcode.

Eine Ausnahmeliste für Tests gibt es nicht, und es soll keine geben. Wer eine braucht, trägt sie
nicht ein, sondern schreibt den Test anders.

## Vorrang

**`app/` schlägt `typescript/` schlägt `common/`** — das Speziellere schlägt das Allgemeinere. Eine
Projektregel gewinnt gegen eine Sprachregel, eine Sprachregel gegen ein allgemeines Prinzip.
Innerhalb von `typescript/` gilt dasselbe: die Naht-Regel aus `typescript-feature-slices.md`
schlägt die generische Zustand/Verhalten-Trennung aus `typescript-code-organization.md`.

### Beispiel

`common/coding-style.md` fordert Unveränderlichkeit als Grundhaltung. Eine sprachspezifische Datei
darf das für ihre Sprache überschreiben, wo das Idiom dagegen steht — dann steht die Abweichung
dort und begründet sich, statt die gemeinsame Regel stillschweigend zu verletzen.
