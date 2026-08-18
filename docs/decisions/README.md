# Entscheidungen

Jede Entscheidung und jede relevante Neuerung wird hier als **eigene Datei** festgehalten — nichts
davon in [`CLAUDE.md`](../../CLAUDE.md), nichts in einem sitzungsübergreifenden Memory.

## Benennung

`JJJJ-MM-TT-HHMM-kurzer-titel-in-kebab-case.md` — Datum und Uhrzeit der Entscheidung, danach ein
sprechender Titel. Beispiel: `2026-08-18-0930-suchfeld-erst-nach-pact.md`.

## Format

```markdown
# <Titel>

## Lage
Was der Anlass war, in zwei bis vier Sätzen.

## Entscheidung
Was ab jetzt gilt. Ein Satz im Indikativ, keine Optionen.

## Begründung
Warum diese und nicht die naheliegende Alternative.

## Folgen
Was daraus zu tun ist, und was dadurch ungültig wird.
```

Die vier Abschnitte sind Pflicht, stehen in dieser Reihenfolge, und **andere gibt es nicht**.

Insbesondere gibt es keinen Abschnitt für eine Abweichung von einer fremden Spezifikation. Früher
war einer vorgesehen; er ist entfallen, weil es nichts gibt, wovon abzuweichen wäre — der Vertrag
unter [`../../pact/`](../../pact/) legt fest, was gilt (Regel 8 in [`../regeln.md`](../regeln.md)).
Ältere Dateien tragen den Abschnitt noch; sie bleiben unverändert liegen.

Eine Entscheidung wird nicht überschrieben. Ändert sie sich, entsteht eine neue Datei, die die
alte namentlich ablöst — vollständig oder in genannten Punkten. Die ablösende Datei sagt im
Abschnitt `Folgen`, was von der alten stehen bleibt; die alte bleibt unverändert liegen.
