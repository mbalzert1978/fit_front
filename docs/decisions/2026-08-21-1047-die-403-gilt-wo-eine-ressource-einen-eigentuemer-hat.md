# Die 403 gilt, wo eine Ressource einen Eigentümer hat

## Lage

Zwei Stellen beschrieben denselben Sachverhalt verschieden weit. Regel 4 in
[`../regeln.md`](../regeln.md) verlangte `token-expired` (401) **und** `forbidden` (403) „in
**jedem** Kontext";
[`2026-08-18-1600-auth-und-fehlerfaelle-sind-vertragsvorgabe.md`](2026-08-18-1600-auth-und-fehlerfaelle-sind-vertragsvorgabe.md)
sagte enger: „jeder Kontext einen `401`, und wo eine Ressource einem Nutzer gehört, einen `403`".
Nach dem weiten Wortlaut verstießen vier der sechs Verträge — `identity`, `catalog`, `goals`,
`health` sichern keine 403 zu —, nach dem engen keiner. Da `regeln.md` ausdrücklich Regeln und
keine Zustandsbeschreibung enthält, war das kein Rückstand, sondern ein Widerspruch.

## Entscheidung

Die 401 steht in jedem Kontext, die 403 dort, wo sich eine fremde Ressource adressieren lässt.
Regel 4 trägt ab jetzt diesen Wortlaut; die Entscheidung vom 18.08. bleibt unverändert gültig.

## Begründung

Eine 403 beantwortet die Anfrage „diese Ressource gibt es, sie gehört aber jemand anderem". Damit
ein Client sie überhaupt stellen kann, muss er die fremde Ressource benennen können — praktisch:
eine Id im Pfad, wie beim fremden Rezept in [`../../pact/recipes.pact.test.ts`](../../pact/recipes.pact.test.ts).
An `/identity/me`, `/goals` und `/health/consent` gibt es diese Id nicht: die Ressource hängt am
Token, und ein falscher Token ergibt 401, nicht 403. Katalogprodukte gehören niemandem. Eine 403
dort zuzusichern hieße, eine Antwort zu bestellen, zu der sich keine Anfrage formulieren lässt —
und `given(...)` müsste nach Regel 5 einen Zustand benennen, den das Backend nicht herstellen kann.

Der Nachsatz der alten Regel war richtig und nur zu weit gefasst: ohne die 403 dürfte das Backend
eine fremde Ressource ausliefern, ohne den Vertrag zu brechen — aber eben nur dort, wo es eine
fremde Ressource gibt. Nachgezogen wird deshalb die Regel und nicht die Entscheidung: die
Entscheidung war nie falsch, und sie zu ändern verlangte nach
[`README.md`](README.md) eine ablösende Datei, die den engeren Wortlaut durch denselben engeren
Wortlaut ersetzte.

## Folgen

- Regel 4 in [`../regeln.md`](../regeln.md) nennt beide Fälle getrennt und benennt die Endpunkte,
  an denen keine 403 zuzusichern ist. Wer einen Endpunkt mit Id für eine fremde Ressource
  hinzufügt, sichert sie zu — `forbidden()` aus [`../../pact/setup.ts`](../../pact/setup.ts).
- Kein Vertrag ändert sich. `diary` und `recipes` behalten ihre 403, die übrigen vier Kontexte
  bleiben ohne, und beides ist jetzt regelkonform statt geduldet.
- [`2026-08-18-1600-auth-und-fehlerfaelle-sind-vertragsvorgabe.md`](2026-08-18-1600-auth-und-fehlerfaelle-sind-vertragsvorgabe.md)
  bleibt in allen Punkten gültig; diese Datei löst nichts ab, sie zieht die Regel nach.
