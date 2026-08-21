# Die Kontolöschung nennt ihre Frist, und die Sitzung endet auf ein zweites Tippen

## Lage

`DELETE /identity/me` steht in Issue #19: das Backend löscht **nicht sofort**, es nimmt an (202)
und nennt einen Zeitpunkt, ab dem die Löschung wirksam wird. Für die Oberfläche war nichts
beschrieben — weder wie die Absicht bestätigt wird, noch wie die Frist gezeigt wird, noch was
unmittelbar danach mit der Sitzung geschieht. Und es ist der einzige Weg in dieser App, der sich
nicht zurücknehmen lässt.

## Entscheidung

Konto löschen lebt im Abschnitt `Konto` in [`../../app/(tabs)/settings.tsx`](../../app/(tabs)/settings.tsx)
und läuft in drei Schritten: ein Knopf öffnet ein Feld, in das der Nutzer `LOESCHEN` tippt; erst
dann geht die Anfrage hinaus; danach steht an derselben Stelle der Zeitpunkt aus
`deletionEffectiveUtc` als Tag und Uhrzeit des Geräts, dazu der Satz, dass die Daten bis dahin noch
da sind, und ein Knopf `Abmelden`, der die Sitzung beendet. Automatisch abgemeldet wird nicht.
Einen Weg zurück innerhalb der Frist gibt es nicht — er wird auch nicht bestellt.

## Begründung

**Ein Wort statt eines Passworts.** Beides schützt gegen das versehentliche Tippen, aber das
Passwort schützt gegen etwas anderes — ein fremdes, entsperrtes Gerät —, und es kostet einen
Rumpf am `DELETE`, den die Spezifikation nicht kennt. Das wäre eine Bestellung nach Regel 8 für
einen Schutz, den die Anmeldung schon leistet. Das Wort steht als Beschriftung in
[`../../src/i18n/de.ts`](../../src/i18n/de.ts) und wechselt mit der Sprache (`LOESCHEN` /
`DELETE`) — ein deutsches Wort in einer englischen Maske wäre dieselbe Naht-Verletzung wie ein
deutscher Knopf. Ohne Umlaut, weil eine Tastatur ohne `Ö` sonst den Weg schwierig statt bedacht
macht; verglichen wird ohne Rücksicht auf Groß- und Kleinschreibung.

**Die Frist bleibt stehen, bis der Nutzer weitergeht.** Sofort abzumelden hieße, den einen Wert
wegzuräumen, um den es in diesem Ticket geht: der Nutzer sähe die Anmeldemaske und wüsste nicht,
wann seine Daten verschwinden. Ihn stumm angemeldet zu lassen wäre das andere Extrem — dann bliebe
der Zustand offen. Der Knopf ist der Ausweg aus beidem: der Zeitpunkt steht so lange da, wie der
Nutzer ihn liest, und die Sitzung endet an einer Stelle, die er selbst bestimmt. Ein halber Zustand
entsteht nicht, weil das Konto **bis zur Frist wirklich weiterbesteht** — es gibt hier nichts
Halbes zu vermeiden, sondern eine Wahrheit zu zeigen.

**Kein Weg zurück.** Die Spezifikation kennt keinen, und einen zu bestellen hieße, einen zweiten
Endpunkt für einen Fall zu fordern, dessen Bedarf niemand belegt hat. Die Frist selbst ist die
Sicherheit, die das Backend gibt; sie ist eine Sache seiner Datenhaltung und nicht der Oberfläche.

## Folgen

- [`../../pact/identity.pact.test.ts`](../../pact/identity.pact.test.ts) sichert `DELETE /identity/me`
  zu: **202** mit `deletionEffectiveUtc` im `data`/`meta`-Umschlag und die abgelaufene Anmeldung
  (401). Kein `Idempotency-Key` — ein `DELETE` ist wiederholbar, und genau deshalb darf die Hülle
  es nach einer Erneuerung noch einmal schicken. Keine 403: `/identity/me` hängt am Token, es gibt
  keine fremde Anfrage zu stellen (Regel 4).
- Der Zeitpunkt steht als `M.datetime` im Vertrag und nicht als `M.string`: die Oberfläche liest
  ihn mit `new Date(...)`, und ein Wort statt eines Zeitpunkts stünde dort als `Invalid Date`.
- `useDeleteAccount` in [`../../src/api/hooks.ts`](../../src/api/hooks.ts) räumt keinen Cache und
  meldet nicht ab; beides gehört an den Knopf im Screen.
- Alle Sätze dieses Wegs — Knopf, Feldbeschriftung, Hinweis, Fristsatz — liegen in
  [`../../src/i18n/`](../../src/i18n/); das Datumsmuster der Frist steht dort als `instantFormat`.
  Was der Server zum Fehlschlag sagt (`detail`), geht unverändert auf den Schirm.
- Wird ein Weg zurück innerhalb der Frist doch gebraucht, entsteht dafür eine neue Entscheidung und
  ein neuer Vertrag. Diese hier bleibt bis dahin gültig.
- Das Abnahmekriterium aus Issue #19, `docs/offene-punkte.md` Punkt 5 nachzuziehen, entfällt: die
  Datei ist mit
  [`2026-08-18-1900-issues-statt-datei-und-keine-fremde-spezifikation.md`](2026-08-18-1900-issues-statt-datei-und-keine-fremde-spezifikation.md)
  gelöscht.
- Die vorgemerkte Löschung überlebt einen Neustart **nicht**: sie lebt in der Antwort der Mutation
  und in keinem gelesenen Feld. `GET /identity/me` kennt das Merkmal nicht, und es dort zu
  bestellen ist eine eigene Entscheidung — sie steht als Issue #37 offen.
