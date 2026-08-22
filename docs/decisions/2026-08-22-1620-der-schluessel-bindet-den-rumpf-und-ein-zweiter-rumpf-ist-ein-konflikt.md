# Der Schlüssel bindet den Rumpf, und ein zweiter Rumpf ist ein Konflikt

## Lage

[`2026-08-21-1104-der-schluessel-haengt-am-ganzen-rumpf.md`](2026-08-21-1104-der-schluessel-haengt-am-ganzen-rumpf.md)
hat die Seite des Clients geregelt: `useIdempotencyKey` zieht einen neuen Schlüssel, sobald sich der
Rumpf ändert. Was der **Server** mit einem Schlüssel tut, stand nirgends — weder, worauf er ihn
schlüsselt, noch was passiert, wenn derselbe Schlüssel mit einem anderen Rumpf ankommt. Ein
Security-Review hat das als offene Frage ans Backend notiert; nach Regel 8 in
[`../regeln.md`](../regeln.md) gibt es diese Frage nicht — der Vertrag legt fest.

## Entscheidung

**Der Schlüssel bindet den ganzen Rumpf, je Endpunkt.** Derselbe Schlüssel mit **demselben** Rumpf
bekommt die erste Antwort noch einmal, und der Aufruf wird kein zweites Mal ausgeführt.

**Derselbe Schlüssel mit einem anderen Rumpf ist ein Konflikt: 409 mit der neuen Kennung
`idempotency-key-reused`.** Sie steht in [`../../src/api/problems.ts`](../../src/api/problems.ts),
trägt kein `errors`, und der Vertrag sichert sie an der Registrierung zu. Kein Screen unterscheidet
sie; sie fällt in den allgemeinen Fehlersatz.

## Begründung

**Warum das überhaupt zugesichert wird, obwohl die App es nicht auslösen kann.** Genau wie die 401
und die 403 in Regel 4: die Zusage steht nicht für einen Zweig im Screen, sondern gegen das, was die
Gegenseite sonst tun dürfte. Ohne sie wäre das Naheliegende, den Schlüssel allein zu nehmen und die
erste Antwort **erneut auszuliefern**. Dann korrigiert ein Nutzer sein Passwort, schickt ab, liest
`201` und eine Sitzung — und sein Konto trägt das Passwort aus dem ersten Versuch. Er erfährt es
nie, und die Verifikation ist grün. Das ist die teuerste Art, einen Vertrag einzuhalten.

**Warum 409 und nicht 422.** Der Entwurf `draft-ietf-httpapi-idempotency-key-header` nennt für
diesen Fall 422. In diesem Repo heißt 422 etwas anderes: „der Nutzer hat etwas falsch eingegeben und
bekommt es angestrichen", mit feldweiser Begründung (Regel 4). Hier hat der Nutzer nichts falsch
gemacht und es gibt kein Feld anzustreichen — der Fehler sitzt in der Aufrufstelle. 409 ist in
diesem Vertragsbestand der Statuscode für „der Zustand auf der Gegenseite passt nicht zu dem, was
der Aufruf annimmt", genau wie bei `email-already-registered` und `slot-not-empty`. Der eigenen
Taxonomie zu folgen ist mehr wert als einem Entwurf, der hier ohnehin nichts vorschreibt (Regel 8).

**Warum 409 und nicht 400.** Der Rumpf ist lesbar und in Ordnung — 400 ist in diesem Repo der
kaputte Rumpf. Falsch ist die Paarung mit einem Schlüssel, der schon etwas anderes beantwortet hat,
und das ist ein Zustand, kein Syntaxfehler.

**Warum eine eigene Kennung und nicht `concurrency-conflict`.** Die steht für optimistisches Sperren
über eine Version einer Ressource. Sie hier mitzubenutzen wäre ein zweiter Name für eine andere
Sache, und ein Screen, der später auf die eine reagieren will, träfe die andere mit.

## Folgen

- [`../../src/api/problems.ts`](../../src/api/problems.ts) trägt `idempotencyKeyReused`.
- [`../../pact/identity.pact.test.ts`](../../pact/identity.pact.test.ts) trägt die Interaktion
  „Registrierung unter einem schon vergebenen Schlüssel" mit dem neuen Zustand „Unter dem
  Registrierungs-Schlüssel liegt schon ein Versuch mit anderem Rumpf". Der `Idempotency-Key` steht
  dort als **Wert** und nicht als Matcher: der Zustand benennt den Schlüssel, der verbraucht ist.
- Die Zusage gilt für **jeden** Aufruf mit `Idempotency-Key`, nicht nur für die Registrierung. Eine
  Interaktion je Endpunkt wäre dieselbe Regel sechsmal; sie steht dort, wo der Schaden am größten
  wäre.
- **Die Wiederholung derselben Anfrage ist nicht als Pact zusicherbar.** Dass ein zweiter Aufruf
  kein zweites Konto anlegt, ist ein Zustand auf der Gegenseite, den eine Interaktion nicht
  beobachtet — Pact vergleicht eine Anfrage mit einer Antwort. Sie steht deshalb hier als
  Entscheidung und nicht im Vertrag; einlösen und prüfen muss sie der Provider in seinem eigenen
  Repo.
- Wie lange ein Schlüssel gilt, sagt diese Entscheidung nicht. Solange er gilt, gilt das Obige;
  danach ist er ein unbekannter Schlüssel und der Aufruf ein neuer.
