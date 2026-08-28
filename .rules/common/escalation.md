# Eskalation bei Unschlüssigkeit

## Die Regel

**Wer unschlüssig ist, rät nicht.** Eine geratene Annahme ist im Ergebnis nicht von einer
getroffenen Entscheidung zu unterscheiden — sie sieht fertig aus und trägt nicht.

Das gilt in diesem Repo doppelt: [`CLAUDE.md`](../../CLAUDE.md) sagt, dass der Inhalt einer nicht
zugänglichen Quelle **nicht geraten und nicht ersatzweise erfunden** wird, sondern nachgefragt.

## Mit Mensch in der Schleife

Fragen, bevor entschieden wird. Eine kurze Rückfrage kostet weniger als eine falsche Annahme, die
erst drei Schritte später auffällt.

## Ohne Mensch in der Schleife

Ein Agent im Worktree, in der Ticket-Pipeline oder im Hintergrund hat niemanden zu fragen. Für ihn
gilt:

1. **Anhalten**, nicht annehmen.
2. Die Unschlüssigkeit benennen — was genau offen ist und welche Antworten in Frage kommen.
3. Den beauftragenden Agenten **auffordern, die Frage an den Menschen zu dirigieren**.

## Die Kette nach oben

Jede Ebene entscheidet nur, was sie aus **eigenem Kontext ohne Raten** entscheiden kann. Reicht ihr
Kontext nicht, reicht sie weiter nach oben — bis ein Mensch antwortet. Eine Ebene höher zu sitzen
erlaubt keine Annahme, die eine Ebene tiefer verboten war.

## Zwei Fälle, die hier oft aussehen wie Unschlüssigkeit

- **Fehlt etwas oder ist es bewusst offen?** Das steht in den Issues dieses Repositories auf
  GitHub, nicht in einer Datei ([`CLAUDE.md`](../../CLAUDE.md)). Erst nachsehen, dann fragen.
- **Was leistet die API?** Das steht in [`pact/`](../../pact/) und in den daraus erzeugten
  Verträgen unter [`pacts/`](../../pacts/) — es gibt keine Quelle außerhalb dieses Repositories.
  Wer dort nichts findet, hat eine offene Frage und keine Lücke, die er füllen dürfte.

> Die Vorlage belegt diese Regel mit zwei Vorfällen aus `docs/reflections/` ihres Repos. Die
> Dateien gibt es hier nicht und sie werden nicht nacherzählt; die Regel steht ohne sie.
