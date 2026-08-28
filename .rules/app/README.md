# App Rules — Index

Was hier steht, gilt für jede Änderung an dieser App. Es sind Regeln, keine Zustandsbeschreibungen
— sie driften nicht mit dem Code.

Diese Schicht trägt die Regeln **dieses Projekts**: die Oberfläche, die Verträge, die HTTP-Naht und
die Abnahme. Sie ist weder sprachunabhängiges Prinzip ([`../common/`](../common/)) noch
TypeScript-Idiom ([`../typescript/`](../typescript/)), sondern das, was hier und nur hier gilt.

| Datei | Thema |
|-------|-------|
| [farben-und-masse.md](./farben-und-masse.md) | wo ein Farb- oder Maßwert stehen darf |
| [beschriftungen.md](./beschriftungen.md) | wo ein sichtbarer Satz herkommt und welche Sprache gilt |
| [vertraege.md](./vertraege.md) | die zehn Regeln für jeden Pact |
| [http-schicht.md](./http-schicht.md) | was für `src/api/client.ts` und alles dahinter gilt |
| [abnahme.md](./abnahme.md) | die Prüfliste vor der Abnahme |

## Herkunft

Diese fünf Dateien waren bis zum 28.08.2026 die Datei `docs/regeln.md`. Der Wortlaut ist
übernommen, nicht neu formuliert; geändert sind nur die Pfade der Verweise und die Aufteilung in je
eine Datei pro Thema. Die Entscheidung dazu steht in
[`docs/decisions/2026-08-28-0842-das-regelwerk-zieht-nach-punkt-rules.md`](../../docs/decisions/2026-08-28-0842-das-regelwerk-zieht-nach-punkt-rules.md).

## Vorrang

Widerspricht eine Regel hier einer aus [`../typescript/`](../typescript/) oder
[`../common/`](../common/), **gewinnt diese Schicht** — sie ist das Speziellere
([`../README.md`](../README.md)).
