# Die Fehlerform ist RFC 9457, und `type` ist eine Kennung

## Lage

Der Provider liefert `problem+json` in **allen** Fehlerfällen, nach RFC-Norm: `type` als URI
(`https://api.example/errors/validation-failed`), dazu `title`, `status`, `detail`, `instance` und
bei Feldfehlern `errors`. Diese Seite verglich Kurznamen (`'validation-failed'`) und sicherte auch
nur die zu. Ein Vertrag dieser Form würde bei einer Verifikation **an jedem Fehlerfall** scheitern —
und zwar in allen sechs Kontexten, nicht nur bei Identity.

Als Referenz gilt [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457.html) (löst RFC 7807 ab).

## Entscheidung

**Die Fehlerform ist die von RFC 9457, vollständig und überall.** Jede Fehlerzusage trägt `type`,
`title`, `status`, `detail` und `instance`; `errors` kommt dazu, wo ein Screen die feldweise
Begründung zeigt. Gebaut wird sie an einer Stelle, in `problem()` in
[`../../pact/setup.ts`](../../pact/setup.ts).

**`type` ist eine Kennung, kein Kurzname und kein Ort.** Sie wird nicht abgerufen, sie ändert sich
nicht mit der Umgebung, und sie wird **ganz** verglichen — nicht am letzten Pfadsegment. Ein
Vergleich auf Teilstücke wäre bequem und würde zwei verschiedene Kennungen mit gleichem Ende
verwechseln.

**Die Kennungen stehen an einer Stelle:** [`../../src/api/problems.ts`](../../src/api/problems.ts).
Jeder Screen vergleicht gegen `problems.*`, und `pact/setup.ts` **liest dieselbe Datei**. Was die App
vergleicht, ist damit dasselbe, was der Vertrag zusichert.

**Fehler, die hier entstehen, bekommen einen eigenen Namensraum.** `malformed-envelope`,
`malformed-token-response` und `precondition-required` kamen nie über die Leitung; sie stehen unter
`https://nutritrack.app/client-errors/`. An der Kennung bleibt so ablesbar, wer sie gestellt hat.

## Begründung

**Warum ganz vergleichen und nicht kürzen.** Der bequeme Weg wäre gewesen, in `ApiError.type` das
letzte Segment abzuschneiden und die Screens unverändert zu lassen. Das hätte die Kennung zu einem
Kurznamen degradiert, den zwei verschiedene Namensräume gleich lauten lassen können — genau das,
was eine URI verhindert. Und es hätte eine stille Übersetzung eingebaut, die nur an einer Stelle
steht und überall vorausgesetzt wird.

**Warum die Kennungen nicht als Zeichenkette in den Screens stehen.** Ein Tippfehler in
`'https://api.example/errors/slot-not-empty'` fällt nirgends auf: kein Compiler, kein Test, kein
Log — der Zweig greift nur nie. Als Konstante ist derselbe Tippfehler ein Fehler beim Übersetzen.
Dass der Vertrag dieselbe Datei liest, schließt die zweite Lücke: eine Zusage, die eine andere
Kennung nennt als der Screen, wäre sonst grün und trotzdem tot.

**Warum `detail` und `instance` überall, obwohl kaum ein Screen sie liest.** Regel 2 nimmt die
Fehlerform ausdrücklich aus dem Bedarfsprinzip aus. Eine halbe Fehlerform ist wie ein fehlender
`Authorization`-Header: sie macht eine Antwort vertragskonform, die dem Client weniger sagt, als er
im Ernstfall braucht — und der Ernstfall ist genau der, in dem niemand mehr nachfragen kann.

## Folgen

- Alle sechs erzeugten Verträge tragen die neue Form. Der Diff ist groß und trotzdem mechanisch:
  eine Kennung, zwei Felder, sechs Dateien.
- [`../regeln.md`](../regeln.md) ist an zwei Stellen nachgezogen: Regel 2 nennt die Fehlerform
  ausdrücklich als RFC 9457, Regel 3 sagt, dass `type` eine ganz zu vergleichende Kennung ist und
  wo die Kennungen stehen.
- **Offen: der Namensraum ist ein Platzhalter.** `https://api.example/errors/` steht heute so im
  Provider-Code und deshalb auch hier. Vor der ersten Auslieferung ist er auf eine Domain zu
  einigen, die beiden Seiten gehört — es ist genau eine Konstante hier und eine Zeichenkette dort,
  aber es ist eine Kennung: ändert sie sich später, ändern sich alle Verträge mit.
- Die Entscheidung von 12:09 bleibt gültig; sie beschreibt, **welche** Felder gelesen werden, diese
  hier, **welche Form** sie haben.
