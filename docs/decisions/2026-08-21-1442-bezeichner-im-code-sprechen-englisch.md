# Bezeichner im Code sprechen Englisch

## Lage

Der Code trug gemischte Bezeichner: `Konto` neben `Session`, `sichtbareFelder` neben
`visibleFields`, `felder`/`saetze`/`satz` in der Fehlerform, `angemeldet`/`anfrage` in der
Sitzungsnaht, `versuch`/`daten` am Idempotency-Key. Die Umbenennung auf Englisch ist mit
Commit `1f70aee` durchgezogen worden, ohne dass sie als Entscheidung festgehalten wurde —
[`2026-08-21-1335-kommentare-im-code-sprechen-englisch.md`](2026-08-21-1335-kommentare-im-code-sprechen-englisch.md)
beruft sich in seiner „Lage" bereits darauf und fand bis jetzt keinen Anker. Derselbe Commit
hat außerdem
[`2026-08-21-1104-der-schluessel-haengt-am-ganzen-rumpf.md`](2026-08-21-1104-der-schluessel-haengt-am-ganzen-rumpf.md)
mit umbenannt und damit eine bestehende Entscheidung überschrieben, was
[`README.md`](README.md) ausschließt.

## Entscheidung

Jeder Bezeichner im Code — Funktion, Typ, Feld, Variable — steht auf Englisch; und eine ältere
Entscheidungsdatei zeigt den Stand ihres Tages und wird von einer Umbenennung nicht nachgezogen.

## Begründung

Die naheliegende Alternative wäre, jede Umbenennung durch die Entscheidungsdateien zu ziehen,
damit dort nur aktuelle Namen stehen. Das macht die Dateien aber zu einem zweiten, laufend zu
pflegenden Abbild des Codes und nimmt ihnen das Einzige, was sie leisten: zu zeigen, was an
ihrem Tag entschieden wurde und warum. Wer wissen will, wie ein Bezeichner heute heißt, liest
den Code; wer wissen will, wann er sich geändert hat, liest diese Datei.

## Folgen

- Neue Bezeichner werden englisch benannt; Deutsch bleibt der Dokumentation vorbehalten
  (siehe [`2026-08-21-1335-kommentare-im-code-sprechen-englisch.md`](2026-08-21-1335-kommentare-im-code-sprechen-englisch.md)).
- Unberührt bleibt, was nach außen zeigt: der Route-Wert `neu`, die `given(...)`-Zustände, die
  Token-Fixtures `rt_alt`/`rt_neu` und jeder Testtitel. `pacts/` ändert sich durch eine
  Umbenennung nicht.
- Die in `1f70aee` an
  [`2026-08-21-1104-der-schluessel-haengt-am-ganzen-rumpf.md`](2026-08-21-1104-der-schluessel-haengt-am-ganzen-rumpf.md)
  vorgenommene Änderung ist zurückgenommen; dort steht wieder
  `register(anfrage: RegistrationRequest, idempotencyKey)`. Der heutige Name des Parameters ist
  `request` und steht hier, nicht dort.
- Von keiner bestehenden Entscheidung wird etwas ungültig.
