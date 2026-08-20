# Die Registrierung trägt einen Idempotency-Key

## Lage

Der Nutzer tippt „Konto anlegen". Die Anfrage kommt an, das Konto entsteht, und die Antwort geht
auf dem Rückweg verloren — Funkloch, Tunnel, Wechsel von WLAN auf Mobilfunk. Er sieht einen Knopf,
der wieder angeht, und tippt erneut. Was er dann liest: „Diese E-Mail-Adresse ist bereits
registriert." Sie ist bereits registriert — von ihm selbst, eine Sekunde zuvor. Er hat ein Konto
und kommt nicht hinein.

Regel 2 verlangt einen `Idempotency-Key` an jedem nicht wiederholbaren Schreibaufruf. Die
Registrierung war die Ausnahme, ohne dass das je jemand entschieden hätte.

## Entscheidung

`POST /identity/register` trägt einen `Idempotency-Key`. Er wird aus den **Daten** des Versuchs
abgeleitet: derselbe Rumpf ist derselbe Schlüssel, ein geänderter Rumpf ein neuer.

## Begründung

**Warum überhaupt.** Ohne Schlüssel gibt es keinen Unterschied zwischen „nochmal versuchen" und
„ein zweites Konto anlegen". Mit ihm spielt der Server die erste Antwort ab, samt Token — der
zweite Versuch endet dort, wo der erste hinwollte. Das Backend hat die Middleware dafür schon.

**Warum der Schlüssel an den Daten hängt und nicht am Tastendruck.** Ein Schlüssel je Tastendruck
nützt nichts — dann ist jeder Versuch ein neuer und der 409 kommt wie zuvor. Ein Schlüssel je
Bildschirm ist falsch herum: wer nach einem 409 seine E-Mail ändert und erneut tippt, schickt einen
anderen Rumpf unter demselben Schlüssel, und das ist kein Wiederholen, sondern ein Fehler
(`idempotency-key-reused`). An den Daten zu hängen trifft beide Fälle richtig, und die Regel ist in
einer Zeile zu lesen: gleiche Daten, gleicher Schlüssel.

**Warum die Maske ihn erzeugt und nicht `register()`.** Nur die Maske weiß, was ein Versuch ist.
`register()` sieht einen Aufruf und könnte einen Schlüssel höchstens je Aufruf ziehen — also genau
das Nutzlose.

## Folgen

- `register(r, idempotencyKey)` in [`../../src/api/session.ts`](../../src/api/session.ts) nimmt den
  Schlüssel von außen; `useIdempotencyKey()` in `app/register.tsx` hält ihn an den Daten fest.
- Alle vier Registrierungs-Interaktionen im Vertrag tragen den Header. Er steht als Matcher da
  (`M.uuid()`), weil der Wert in der Maske entsteht und nicht im Test.
- Ein Vertrag für den **wiederverwendeten** Schlüssel fehlt weiterhin — offener Punkt 11. Er ist
  jetzt näher am Bedarf als vorher, aber noch immer kein Fall, den ein Screen behandelt.
