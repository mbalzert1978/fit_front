# Passwort vergessen läuft über einen Code, und die Anforderung antwortet immer gleich

## Lage

Seit die Registrierung in der App entsteht (#33), ist ein vergessenes Passwort der einzige Weg, der
einen Nutzer endgültig aussperrt — es gibt keine Stelle, an der er zurückkommt. Issue #34 hält den
Weg offen und nennt drei Punkte, die vor der ersten Zeile zu klären sind: welche Endpunkte der
Client bestellt, wie der Rückweg aus der E-Mail in die App führt, und was ein Nutzer sieht, der eine
unbekannte Adresse eintippt. Das Ticket nennt sich außerdem „blockiert durch" eine Abstimmung mit
der Gegenseite; Regel 8 in [`../regeln.md`](../regeln.md) kennt keine solche Abstimmung — der
Vertrag legt fest, der Provider löst ein.

## Entscheidung

Der Weg besteht aus zwei Aufrufen und einem Screen
[`../../app/reset.tsx`](../../app/reset.tsx), erreichbar als dritter Knopf unter der Anmeldung in
[`../../app/login.tsx`](../../app/login.tsx). `POST /identity/password-reset` mit `{ email }` fordert
an und antwortet **immer 204**, ob die Adresse ein Konto hat oder nicht.
`POST /identity/password-reset/confirm` mit `{ email, code, password }` und `Idempotency-Key` löst
ein und antwortet **204 ohne Sitzung**; danach steht der Nutzer wieder vor der Anmeldemaske. Der
Rückweg aus der E-Mail ist ein **Code, den der Nutzer eintippt**, kein Deep Link. Der angemeldete
Nutzer aus dem Konto-Bereich bekommt diesen Weg **nicht** zusätzlich.

## Begründung

**Ein Code statt eines Deep Links.** Der Link ist die bequemere Geste und der teurere Bau: Schema
und `associatedDomains` in [`../../app.json`](../../app.json), eine `apple-app-site-association` und
ein `assetlinks.json` auf der Domain der Gegenseite, dazu ein Route-Handler für das Token. Bezahlt
wird das mit einem Weg, der genau dann ins Leere läuft, wenn der Nutzer die Mail am Rechner
liest — und das tut, wer sein Telefon gerade neu einrichtet, also im häufigsten Anlass überhaupt.
Der Code kostet ein Feld und funktioniert von jedem Gerät aus. Wird der Link später doch gewollt,
ist er eine eigene Entscheidung und ein zweiter Weg **neben** diesem, nicht statt seiner.

**Immer dieselbe Antwort.** Eine ehrliche Antwort auf eine unbekannte Adresse („kein Konto") macht
aus dem Endpunkt ein Verzeichnis: wer eine Liste von Adressen durchprobiert, erfährt für jede, ob
sie hier ein Konto hat. Das ist genau die Auskunft, die die Registrierung mit ihrer 409 bewusst nur
dem gibt, der die Adresse ohnehin besitzt. Also 204 in beiden Fällen, und der Screen sagt
danach denselben Satz — dass eine Mail unterwegs ist, **falls** es das Konto gibt. Der Preis ist
ein Tippfehler, der stumm bleibt; er kostet den Nutzer einen zweiten Versuch, während die andere
Wahl jeden Fremden eine Kontoliste kostet.

**204 und kein 202 mit Rumpf.** Es gibt nichts zu berichten — das ist hier nicht Sparsamkeit,
sondern die Entscheidung selbst: jedes Feld in einer Antwort wäre ein Feld, das über das Konto
Auskunft geben könnte. Anders als die Kontolöschung, die ihre Frist nennt
([`2026-08-21-1329-die-kontoloeschung-nennt-ihre-frist.md`](2026-08-21-1329-die-kontoloeschung-nennt-ihre-frist.md)),
hat dieser Aufruf nichts zu sagen, was der Anfragende wissen dürfte.

**Kein Schlüssel beim Anfordern, einer beim Einlösen.** Wer zweimal anfordert, will eine zweite
Mail — der Aufruf ist wiederholbar wie ein `DELETE`. Das Einlösen ist es nicht: der Code verbrennt.
Ginge die Antwort auf dem Rückweg verloren, läse der Nutzer beim zweiten Tippen „Code ungültig",
obwohl sein Passwort längst gesetzt ist — dieselbe Falle, die die Registrierung mit ihrem Schlüssel
vermeidet ([`2026-08-21-1104-der-schluessel-haengt-am-ganzen-rumpf.md`](2026-08-21-1104-der-schluessel-haengt-am-ganzen-rumpf.md)).
Deshalb trägt das Einlösen einen `Idempotency-Key`, und er hängt am ganzen Rumpf.

**Keine Sitzung aus dem Einlösen.** Sie zurückzugeben wäre ein Schritt weniger und ein Feld mehr,
das nur die Mail beweist. Der Nutzer hat gerade ein Passwort gewählt; es einmal zu benutzen ist der
kürzeste Beweis, dass es angekommen ist, und die Anmeldemaske steht ohnehin schon im Stapel.

**Keine falsche Kennung für den falschen Code.** Ein abgelaufener oder falscher Code ist
`invalid-credentials` (401) — der Code **ist** ein Zugangsnachweis, und eine neue Kennung neben der
vorhandenen wäre ein zweiter Name für dieselbe Sache. Ein zu schwaches Passwort bleibt, was es
überall ist: **422** mit der Begründung unter `password`.

**Nicht zusätzlich aus dem Konto-Bereich.** Wer angemeldet ist, kennt sein Passwort und ändert es
über #18. Denselben Weg dort zusätzlich anzubieten hieße, einen zweiten Einstieg für einen Fall zu
bauen, dessen Bedarf niemand belegt hat.

## Folgen

- [`../../pact/identity.pact.test.ts`](../../pact/identity.pact.test.ts) sichert fünf Interaktionen
  zu: Anfordern mit bekannter Adresse (204), Anfordern mit unbekannter Adresse (**ebenfalls 204** —
  diese Zusage ist die Entscheidung, und ohne sie dürfte das Backend die Auskunft geben, ohne den
  Vertrag zu brechen), Einlösen (204), falscher Code (401 `invalid-credentials`) und zu schwaches
  Passwort (422 mit `errors.password`). Keine 403: beide Endpunkte hängen an keinem Token und
  adressieren keine fremde Ressource (Regel 4).
- `requestPasswordReset` und `confirmPasswordReset` stehen in
  [`../../src/api/session.ts`](../../src/api/session.ts) und gehen wie alles andere durch
  [`../../src/api/client.ts`](../../src/api/client.ts). Kein zweiter Weg nach draußen.
- `useIdempotencyKey` zieht aus [`../../app/register.tsx`](../../app/register.tsx) nach
  [`../../src/api/ids.ts`](../../src/api/ids.ts) um: zwei Screens brauchen denselben Schlüssel am
  ganzen Rumpf, und zweimal dieselbe Regel wäre zweimal dieselbe Regel zum Auseinanderlaufen.
- Alle Sätze dieses Wegs liegen in [`../../src/i18n/`](../../src/i18n/). Was der Server zum
  Fehlschlag sagt (`detail`, `errors.password`), geht unverändert auf den Schirm.
- Ob die Mail einen Code oder einen Link enthält, ist ab jetzt keine offene Frage mehr, sondern
  eine Zusage: der Vertrag bestellt einen Code. Ein Deep Link braucht eine neue Entscheidung.
- Issue #34 ist damit nicht mehr blockiert; der dort genannte Abstimmungsbedarf entfällt mit
  Regel 8.
