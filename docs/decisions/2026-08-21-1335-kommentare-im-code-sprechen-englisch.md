# Kommentare im Code sprechen Englisch

## Lage

Seit „Bezeichner im Code sprechen Englisch" heißen Funktionen, Typen und Variablen englisch. Die
Kommentare waren dabei nur teilweise mitgezogen worden: `src/api/` bis auf `types.ts` stand
englisch, `src/`, `src/components/`, `app/` und `pact/` standen deutsch. Ein Leser sah beim Wechsel
der Datei die Sprache wechseln, ohne dass ein Grund erkennbar gewesen wäre.
[`../../CLAUDE.md`](../../CLAUDE.md) nimmt Kommentare von der Deutschpflicht ausdrücklich aus, sagt
aber nicht, was stattdessen gilt.

## Entscheidung

Jeder Kommentar und jeder Docstring im Code ist englisch wie der Code selbst; Deutsch gilt für die
Dokumentation — [`../../README.md`](../../README.md), [`../../CLAUDE.md`](../../CLAUDE.md),
[`../regeln.md`](../regeln.md) und die Dateien in diesem Verzeichnis.

## Begründung

Die Alternative — Docstrings deutsch, Zeilenkommentare englisch — zieht die Grenze an einer Stelle,
an der der Leser keinen Unterschied erlebt: beide stehen im selben Bildschirm, beide erklären
dasselbe Stück Code, und ob eine Erklärung als `//` oder als `/** */` geschrieben ist, entscheidet
die Position zum Bezeichner und nicht ihr Gewicht. Die Grenze verläuft stattdessen dort, wo sie
ohnehin schon liegt: zwischen dem Code, der englisch benannt ist, und der Dokumentation, die eine
Leserin von außen führt.

## Folgen

- Alle Kommentare in `src/`, `app/` und `pact/` sind englisch.
- Deutsch bleiben: die sichtbaren Sätze in [`../../src/i18n/`](../../src/i18n/), die Testtitel, die
  `given(...)`-Zustände, die `uponReceiving(...)`-Namen und die Beispielsätze in den Matchern der
  Verträge — sie sind Inhalt und nicht Erklärung.
- Der Abschnitt „Sprache der Dokumentation" in [`../../CLAUDE.md`](../../CLAUDE.md) nimmt Kommentare
  weiterhin aus; diese Datei sagt, was für sie gilt. Ein Widerspruch besteht nicht.
- Wer eine deutschsprachige Datei bearbeitet, zieht ihre Kommentare bei Gelegenheit nach.
