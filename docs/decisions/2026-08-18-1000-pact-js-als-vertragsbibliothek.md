# Pact JS als Vertragsbibliothek; dieses Repo erzeugt Verträge und verifiziert nichts

## Lage

Die App soll ihren Bedarf an der API als Vertrag zusichern (consumer-driven, siehe
Fowler, *Practical Test Pyramid*, Abschnitt Contract Tests). Im Repo lagen bereits
fünf Pact-Testdateien und `@pact-foundation/pact` in den devDependencies — aber kein
Lauf, der sie ausführt: `node_modules` fehlte, `pacts/` existierte nicht, und die
Tests hätten so auch nicht funktioniert (`src/api/client.ts` liest
`EXPO_PUBLIC_API_URL` beim Import in eine Konstante; die Zuweisung an `process.env`
innerhalb der Tests kam zu spät).

Der Auftrag verlangt die Entscheidung in `docs/adr/` mit fortlaufender Nummer. Die
Ablage dieses Repos ist `docs/decisions/` mit Zeitstempel-Benennung
(`docs/decisions/README.md`, verbindlich laut `CLAUDE.md`); ein zweiter Ort für
dieselbe Sache wäre genau die Drift, die diese Regel verhindert. Die Entscheidung
steht deshalb hier.

## Entscheidung

Verträge werden mit **Pact JS** ([`@pact-foundation/pact`](https://github.com/pact-foundation/pact-js),
`^17.1.2`, V3-Spezifikation) geschrieben. Die Consumer-Tests laufen unter Jest und
legen `pacts/*.json` ab; damit ist dieses Repo fertig. **Es verifiziert keinen
Provider, startet keinen und weiß nichts über einen.** Die Vertragsdatei im Git ist
die Übergabe; verifiziert wird sie im Provider-Repo.

## Begründung

- **Pact JS ist die Bibliothek des Consumers.** Der Consumer ist TypeScript, Jest und
  ts-jest sind bereits da. Die V3-Oberfläche (`PactV3`, `MatchersV3`) deckt alles ab,
  was die App zusichert, bis hin zum Multipart-Upload der Nährwerttabelle
  (`withRequestMultipartFileUpload`).
- **Aktuelle Fassung statt der vorgefundenen.** `^13.1.4` stammt von 2023; die
  V3-Oberfläche ist in `^17.1.2` dieselbe und der Multipart-Weg dort verlässlich.
- **Gegen Verifikation aus diesem Repo** spricht die Rollentrennung, nicht die
  Machbarkeit. Wer hier den Provider startet, um „grün" zu sehen, macht das Frontend
  vom Zustand des Backends abhängig — und kehrt damit genau die Richtung um, die
  consumer-driven ausmacht. Ein Vertrag ist erfüllt oder nicht; wer das feststellt,
  ist der Provider.
- **Kein Broker.** Solange die Vertragsdatei im Git die Übergabe ist, braucht es
  keinen. `npm run pact:publish` bleibt für den Tag bestehen, an dem CI dazukommt.

## Folgen

- `./make.ps1` ist der eine Weg durch dieses Repo: `install`, `format`,
  `format-check`, `lint`, `complexity`, `typecheck`, `test`, `ci`, `all`. Kein Ziel
  greift über die Repo-Grenze.
- `./make.ps1 test` erzeugt `pacts/*.json`; die Dateien werden versioniert, damit die
  Änderung am Vertrag im Diff sichtbar ist. Vorher wird `pacts/` geleert — Pact
  ergänzt eine bestehende Datei, statt sie zu ersetzen, und eine gelöschte
  Interaktion bliebe sonst stehen.
- `./make.ps1 ci` ist heute **rot**, und zwar bewusst: 32 Typfehler in `app/`,
  `src/components/`, `src/theme/`, zwei Lint-Befunde und sechs Screens über der
  Komplexitätsgrenze. Alle stammen von vor diesem Auftrag; keiner liegt in `pact/`.
  Sie stehen im Lauf statt in einer Ausnahmeliste, damit sie Druck machen.
- Lint und Formatierung kommen von ESLint (Flat Config) und Prettier;
  `eslint-config-prettier` schaltet ab, worüber beide sonst stritten. Komplexität
  läuft mit eigener Konfiguration (`eslint.complexity.config.js`), damit sie sich
  nicht im Lint-Lauf abschalten lässt.
