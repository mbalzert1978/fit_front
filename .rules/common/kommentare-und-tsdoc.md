# Kommentare und TSDoc

> Gegenstück zu `common/docstrings-und-kommentare.md` der Vorlage. Der Dateiname ist mitübersetzt:
> „Docstring" ist ein Begriff des anderen Stacks; hier heißt der Block über einer Deklaration
> TSDoc (`/** … */`).

Zwei Regeln. Beide sind Streichtests, keine Stilfragen.

## 1. Ein TSDoc-Block sagt, was die Signatur nicht sagen kann

**Streichtest:** Wäre der Satz auch nach dem Löschen noch wahr — weil Name, Parameter, Typen und
Rückgabe ihn schon tragen —, gehört er gelöscht.

Wer die API benutzt, liest die API. Namen und Typen sind die Dokumentation; ein TSDoc-Block ergänzt
nur, was dort nicht hineinpasst: eine Vorbedingung, eine Reihenfolge, eine Einheit, eine
Nebenwirkung, ein Fall, in dem die Funktion etwas *nicht* tut.

Don't:
```ts
/**
 * Runs a side effect on the value without changing the chain.
 *
 * If the return value of `f` mattered, `flatMap` would be the tool.
 */
export function tap<T>(value: T, f: (value: T) => void): T {
```

Der zweite Satz beantwortet „warum nicht `flatMap`?" — eine Frage des Reviewers, nicht des
Aufrufers. `(value: T) => void` rein und `T` raus sagt bereits: das Ergebnis wird verworfen, der
Wert bleibt.

Do:
```ts
/** Runs a side effect on the value. */
export function tap<T>(value: T, f: (value: T) => void): T {
```

## 2. Ein Kommentar erklärt WARUM, nie WAS

Erklärt ein Kommentar, *was* der Code tut, ist der Code der Befund — nicht der fehlende Kommentar.
Die Antwort ist ein besserer Name, eine extrahierte Funktion oder eine Zusicherung, nicht ein Satz
daneben. Verbindlich entschieden in
[`docs/decisions/2026-08-21-1330-ein-kommentar-traegt-ein-warum-oder-geht.md`](../../docs/decisions/2026-08-21-1330-ein-kommentar-traegt-ein-warum-oder-geht.md).

Bleiben darf ein Kommentar, wenn er etwas trägt, das im Code nicht steht: eine externe Vorgabe
(ein RFC, ein Vertragspunkt), einen Messwert, eine bewusst nicht gewählte Alternative, eine
Plattform-Eigenart. So steht es im Repo — der Grund für `CLOCK_SKEW_MS` und der Grund, warum die
Sitzung **ein** Datensatz ist, stehen in [`src/api/client.ts`](../../src/api/client.ts) und wären
sonst nirgends zu finden.

Kommentare sind englisch
(`docs/decisions/2026-08-21-1335-kommentare-im-code-sprechen-englisch.md`).

## Wo Begründungen stattdessen hingehören

Der Grund für eine Entwurfsentscheidung gehört nach
[`docs/decisions/`](../../docs/decisions/) — je eine Datei, Format in der `README.md` dort. Steht
sie zusätzlich im TSDoc-Block, ist sie eine zweite Kopie — und Kopien driften.

Ein Kommentar darf auf eine Entscheidung **verweisen**. Er wiederholt sie nicht. Genau diese Form
steht im Repo: der Dateiname der Entscheidung in Klammern, ein Satz davor.

> Die Vorlage kennt daneben ein `docs/reflections/` für die destillierte Lektion. Dieses Repo hat
> keins, und es wird hier keins erfunden: Entscheidungen und relevante Neuerungen werden
> **ausschließlich** unter `docs/decisions/` erfasst ([`CLAUDE.md`](../../CLAUDE.md)). Der Verweis
> der Vorlage entfällt deshalb, die Regel nicht.

## Warum das eine Regel braucht

Nichts bremst hier von allein. Kein Werkzeug dieses Repos misst Kommentare: ESLint prüft nicht, ob
einer da ist, und erst recht nicht, wie lang er ist. Und wer sich an die Umgebung anpasst, schreibt
neben einem langen Block einen längeren — eine Ratsche, die nur in eine Richtung läuft.

## Review-Checkliste

- [ ] Jeder Satz im TSDoc-Block besteht den Streichtest: er sagt etwas, das Name, Parameter, Typen
      und Rückgabe nicht schon sagen.
- [ ] Keine Entwurfsbegründung im Block, die in `docs/decisions/` bereits steht — höchstens ein
      Verweis darauf.
- [ ] Kein Kommentar, der beschreibt, *was* die nächste Zeile tut.
- [ ] Ein Block, der die Umgebung nur nachahmt, weil daneben schon lange Blöcke stehen, ist kein
      Argument für einen langen Block.
