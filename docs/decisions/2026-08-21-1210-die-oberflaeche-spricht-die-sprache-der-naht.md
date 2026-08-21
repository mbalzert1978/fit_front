# Die Oberfläche spricht die Sprache der Naht

## Lage

Der Sprachschalter schrieb die Wahl nach `/preferences` und füllte von da an `Accept-Language`;
die Sätze des Servers kamen also in der gewählten Sprache. Jede eigene Beschriftung stand dagegen
als deutsches Literal im Screen. Wer auf Englisch stellte, las englische Serversätze in einer
deutschen Maske — und hielt das zu Recht für kaputt.

## Entscheidung

Sichtbare Sätze stehen ausschließlich in [`../../src/i18n/`](../../src/i18n/) und kommen über
`useTexts()` in den Screen; die deutsche Fassung ist vollständig, jede weitere ein `Partial` davon,
und welche gilt, entscheidet allein die Naht [`../../src/language.ts`](../../src/language.ts) —
dieselbe, die `Accept-Language` und `locale` füllt. Ein Suchlauf im Lint hält Literale aus
[`../../app/`](../../app/) und [`../../src/components/`](../../src/components/) heraus.

## Begründung

Die naheliegende Alternative wäre eine Bibliothek (i18next und Verwandte) mit eigenem Provider,
eigenem Sprachzustand und eigener Auflösung. Sie brächte einen **zweiten** Ort, an dem steht,
welche Sprache gilt — und genau dieses Auseinanderlaufen ist der Fehler, der behoben wird. Die
Naht weiß es bereits; sie sagt es jetzt auch der Oberfläche, über `useSyncExternalStore`, damit
der Schalter ohne Neustart wirkt.

Der Rückfall ist ein Spread und keine Suche: `{ ...de, ...en }` einmal beim Laden. Deutsch ist
vollständig, also hat jeder Schlüssel einen Satz — ein roher Schlüssel kann gar nicht auf dem
Schirm landen. Der Typ erzwingt es zusätzlich: `Partial<Texts>` nimmt keinen unbekannten Namen an.

Der Beleg dafür, dass kein Literal mehr im Screen steht, ist eine Lint-Regel und kein Skript
daneben: `./make.ps1 ci` fährt sie ohnehin, ein Skript, das niemand aufruft, belegt nichts.
Einheiten lässt sie durch — `g`, `%`, `kcal` lauten in jeder Sprache gleich.

## Folgen

- Neue Beschriftungen werden in [`de.ts`](../../src/i18n/de.ts) angelegt; die englische Fassung
  darf nachziehen, ohne dass etwas bricht.
- `useTexts()` gehört in jede Komponente mit sichtbarem Text; `texts()` steht für den Code außerhalb
  von React.
- Datumsformate und das `date-fns`-Locale liegen bei den Sätzen: ein deutsches Datum in einer
  englischen Maske wäre derselbe Fehler wie ein deutscher Knopf.
- Was der Server sagt, bleibt unübersetzt. Das gilt weiter, unverändert.
- Die Fehlertitel in [`../../src/api/client.ts`](../../src/api/client.ts) und
  [`../../src/api/hooks.ts`](../../src/api/hooks.ts) bleiben deutsch: sie erscheinen auf keinem
  Screen, sondern nur in Diagnose. Käme einer je auf den Schirm, gehört er vorher in die Sätze.
