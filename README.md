# NutriTrack — App

Mobile Anwendung zur Ernährungserfassung: Barcode scannen oder Nährwerttabelle
fotografieren, der Eintrag landet im Tagebuch und zählt gegen ein Tagesziel.
Expo und React Native, ein Code für iOS und Android, iOS zuerst.

Das Backend liegt in einem eigenen Repository und wird von hier aus nur gelesen.
Die API dazwischen ist consumer-driven mit Pact zugesichert: Diese App schreibt
die Verträge nach [`pacts/`](pacts/) und ist damit fertig — verifiziert werden sie
drüben.

## Weiter

- [`CLAUDE.md`](CLAUDE.md) — wohin man vor einer Annahme schaut. Der Einstieg für
  alles Weitere, für Menschen wie für Agenten.
- [`docs/regeln.md`](docs/regeln.md) — was für jede Änderung gilt.
- [`docs/neue-sprache.md`](docs/neue-sprache.md) — wie eine weitere Sprache dazukommt, Schritt für
  Schritt bis zum Pull Request.
- Die Issues dieses Repositories auf GitHub — was bewusst offen ist.
- [`docs/decisions/`](docs/decisions/) — was entschieden wurde.
- [`make.ps1`](make.ps1) — der eine Weg durch dieses Repo: `./make.ps1 help` listet die
  Ziele, `./make.ps1 ci` prüft alles, was hier geprüft wird.
- [`package.json`](package.json) — die Skripte sind der kanonische Weg zu Lint,
  Formatierung, Typprüfung, Verträgen und Start; `make.ps1` ruft sie auf, ersetzt sie nicht.
