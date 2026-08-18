# NutriTrack — App

Mobile Anwendung zur Ernährungserfassung: Barcode scannen oder Nährwerttabelle
fotografieren, der Eintrag landet im Tagebuch und zählt gegen ein Tagesziel.
Expo und React Native, ein Code für iOS und Android, iOS zuerst.

Das Backend liegt in einem eigenen Repository und wird von hier aus nur gelesen.
Die API dazwischen ist consumer-driven mit Pact zugesichert: Diese App schreibt
die Verträge, das Backend verifiziert sie.

## Weiter

- [`CLAUDE.md`](CLAUDE.md) — wohin man vor einer Annahme schaut. Der Einstieg für
  alles Weitere, für Menschen wie für Agenten.
- [`docs/regeln.md`](docs/regeln.md) — was für jede Änderung gilt.
- [`docs/offene-punkte.md`](docs/offene-punkte.md) — was bewusst offen ist.
- [`docs/decisions/`](docs/decisions/) — was entschieden wurde.
- [`package.json`](package.json) — die Skripte sind der kanonische Weg zu
  Typprüfung, Verträgen und Start.
