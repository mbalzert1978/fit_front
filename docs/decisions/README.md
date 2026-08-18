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

Die vier Abschnitte sind Pflicht und stehen in dieser Reihenfolge. Ein **fünfter Abschnitt ist
erlaubt**, wenn die Entscheidung von einer Spezifikation außerhalb dieses Repos abweicht: dann
trägt er die Überschrift `## Abweichung zur Backend-Spezifikation` und steht zwischen `Begründung`
und `Folgen`. Regel 8 in [`../regeln.md`](../regeln.md) verlangt, dass eine solche Abweichung
benannt wird; dieser Abschnitt ist der Ort dafür. Andere Abschnitte gibt es nicht.

Eine Entscheidung wird nicht überschrieben. Ändert sie sich, entsteht eine neue Datei, die die
alte namentlich ablöst — vollständig oder in genannten Punkten. Die ablösende Datei sagt im
Abschnitt `Folgen`, was von der alten stehen bleibt; die alte bleibt unverändert liegen.
