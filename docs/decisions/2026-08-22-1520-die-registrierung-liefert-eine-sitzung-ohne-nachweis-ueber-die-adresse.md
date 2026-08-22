# Die Registrierung liefert eine Sitzung ohne Nachweis über die Adresse

## Lage

[`2026-08-20-0843-registrierung-legt-konto-und-sitzung-in-einem-aufruf-an.md`](2026-08-20-0843-registrierung-legt-konto-und-sitzung-in-einem-aufruf-an.md)
hat entschieden, dass ein Konto und die Sitzung darin in einem Aufruf entstehen: wer sich
registriert, ist danach angemeldet, ohne dass die E-Mail-Adresse je bestätigt wurde. Zu diesem
Zeitpunkt war die Adresse nur ein Feld am Konto. Seit
[`2026-08-22-1100-passwort-vergessen-laeuft-ueber-einen-code-und-antwortet-immer-gleich.md`](2026-08-22-1100-passwort-vergessen-laeuft-ueber-einen-code-und-antwortet-immer-gleich.md)
ist sie das Zugangsdatum zum Konto: wer die Mails zu einer Adresse liest, kann ihr Passwort setzen.
Damit hat die Rechnung eine neue Variable bekommen, und ein Security-Review hat sie aufgeschrieben.

## Entscheidung

**Die Registrierung liefert weiterhin sofort eine vollständige Sitzung, ohne Nachweis über die
Adresse.** Der Bestätigungsablauf wird nicht in diesem Vorgang gebaut.

**Was ein frisch angelegtes Konto darf, steht ab jetzt im Vertrag:** eine Interaktion in
[`../../pact/identity.pact.test.ts`](../../pact/identity.pact.test.ts) sichert zu, dass ein Konto
mit unbestätigter Adresse `GET /identity/me` mit **200** beantwortet bekommt. Es gibt keine
Rechteklasse „unbestätigt" unterhalb der vollen.

## Begründung

**Warum die Rechnung sich geändert hat.** Vorher war eine falsch eingetippte Adresse ein Schönheits-
fehler: das Konto gehörte dem, der es angelegt hatte, und die Adresse war eine Notiz daran. Jetzt
ist sie ein zweiter Schlüssel. Wer sich mit `nachbar@example.de` registriert — aus Versehen oder
absichtlich —, legt ein Konto an, das der Inhaber dieser Adresse jederzeit über „Passwort vergessen"
übernehmen kann. Umgekehrt kann jemand ein Konto auf eine fremde Adresse anlegen und darin Daten
sammeln, die dem Inhaber später zufallen. Das ist keine Katastrophe, solange in diesen Konten nur
das eigene Ernährungstagebuch steht — aber es ist eine Zusage, die vorher niemand gegeben hat.

**Warum trotzdem jetzt kein Bestätigungsablauf.** Er ist kein Zusatz, sondern ein eigener Weg:
ein Screen für den Code, ein Endpunkt zum Einlösen, ein zweiter zum erneuten Senden, und vor allem
die Antwort auf die Frage, was ein unbestätigtes Konto darf — nichts, alles außer dem Löschen, oder
alles mit einem Hinweisband. Das nebenbei zu entscheiden hieße, die teuerste Frage des Ablaufs im
Vorbeigehen zu beantworten. Bis dahin ist die richtige Antwort nicht, den Bau zu verstecken, sondern
die Lücke zu benennen.

**Warum die Rechte trotzdem in den Vertrag kommen.** Solange nirgends steht, dass ein frisch
angelegtes Konto an seine eigenen Daten darf, dürfte das Backend es hinter eine 403 setzen, ohne den
Vertrag zu brechen — und die App springt nach der Registrierung direkt ins Tagebuch. Der Nutzer säße
dann vor einem leeren Screen ohne Weg nach vorn, und die Verifikation wäre grün. Die Zusage kostet
eine Interaktion und legt den heutigen Stand fest, gegen den der Bestätigungsablauf später bewusst
verstoßen muss.

## Folgen

- [`../../pact/identity.pact.test.ts`](../../pact/identity.pact.test.ts) trägt die Interaktion
  „Eigenes Konto direkt nach der Registrierung laden" mit dem neuen Zustand „Nutzer a@b.de ist
  frisch registriert und hat seine Adresse nicht bestätigt". Der Provider muss ihn herstellen
  können.
- Von
  [`2026-08-20-0843-registrierung-legt-konto-und-sitzung-in-einem-aufruf-an.md`](2026-08-20-0843-registrierung-legt-konto-und-sitzung-in-einem-aufruf-an.md)
  bleibt alles stehen. Ergänzt ist nur, dass der dort nicht bedachte Preis — die unbewiesene
  Adresse — seit dem Zurücksetz-Weg ein anderer ist und hier bewusst weiter getragen wird.
- Der Bestätigungsablauf ist ein eigener Vorgang und gehört als offener Punkt in die Issues dieses
  Repositories. Sein Umfang: ein Screen für den Code, `POST /identity/email/confirm` und
  `POST /identity/email/confirm/resend`, die Entscheidung über die Rechte eines unbestätigten
  Kontos, und die Frage, ob mit ihm die 409 der Registrierung fallen kann — siehe
  [`2026-08-22-1510-die-registrierung-nennt-die-vergebene-adresse-weiter-und-prueft-die-felder-zuerst.md`](2026-08-22-1510-die-registrierung-nennt-die-vergebene-adresse-weiter-und-prueft-die-felder-zuerst.md).
