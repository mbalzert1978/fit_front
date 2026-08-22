# Vier Zusicherungen zum Zurücksetzen des Passworts werden nachgezogen

## Lage

Der Weg „Passwort vergessen" steht seit
[`2026-08-22-1100-passwort-vergessen-laeuft-ueber-einen-code-und-antwortet-immer-gleich.md`](2026-08-22-1100-passwort-vergessen-laeuft-ueber-einen-code-und-antwortet-immer-gleich.md)
mit fünf Interaktionen im Identity-Pact. Ein Sicherheits-Durchgang über diesen Abschnitt fand vier
Stellen, an denen ein Backend sich unsicher verhalten und die Verifikation trotzdem grün laufen
lassen dürfte: alte Sitzungen überleben das Zurücksetzen, das Einlösen wird zum Verzeichnis, die
Prüfreihenfolge macht ein zu kurzes Passwort zum Orakel, und die Einmaligkeit des Codes stand
bisher nur in einem Kommentar. Keine davon ist ein Fehlverhalten der App — es fehlen Zusagen, kein
Verhalten.

## Entscheidung

[`../../pact/identity.pact.test.ts`](../../pact/identity.pact.test.ts) sichert vier weitere
Interaktionen zu: ein Refresh-Token von vor dem Zurücksetzen wird mit **401** abgewiesen; ein
Einlösen mit unbekannter Adresse antwortet **genauso** wie eines mit falschem Code
(401 `invalid-credentials`); falscher Code **und** zu kurzes Passwort ergeben **401**, nicht 422;
und derselbe Code ein zweites Mal — mit **anderem** `Idempotency-Key` — ergibt **401**. Die App
unter [`../../src/`](../../src/) und [`../../app/`](../../app/) bleibt unverändert.

## Begründung

**Sitzungen enden mit dem Zurücksetzen.** Wer sein Passwort zurücksetzt, tut das im Regelfall,
weil er die Kontrolle über den Zugang verloren hat. Bleiben die alten Refresh-Token gültig,
überlebt ein erbeuteter Token genau die Handlung, mit der der Nutzer ihn loswerden wollte — das
neue Passwort schützt dann nur noch die Anmeldemaske, nicht das Konto. Die Zusage steht als 401 auf
`/identity/refresh`, weil dort der einzige Punkt ist, an dem ein alter Token noch etwas wert wäre.

**Der Aufzählungsschutz gilt an beiden Endpunkten.** Er stand nur an `/password-reset`. Am
`/confirm` fehlte er, und ein ehrliches `404 "kein Konto"` dort hätte grün verifiziert — dieselbe
Adressliste wäre einen Aufruf weiter beantwortet worden. Die Antwort ist deshalb **dieselbe** wie
beim falschen Code, bis auf die Kennung genau; ein Angreifer soll die beiden Fälle nicht
unterscheiden können.

**Die Prüfreihenfolge ist selbst eine Zusage.** Die beiden bestehenden Fehlerfälle ändern je eine
Variable und lassen offen, was zuerst geprüft wird. Prüft der Provider die Felder zuerst, wird ein
absichtlich zu kurzes Passwort zum Orakel: die 422 verrät, dass der Code stimmte, und ein
abgelehnter Rumpf verbraucht ihn nicht — der Versuch ist gratis und beliebig oft wiederholbar. Der
neue Fall nagelt fest, dass der Zugangsnachweis zuerst entscheidet.

**Der abweichende Schlüssel ist der Punkt.** Mit demselben `Idempotency-Key` auf demselben Rumpf
wiederholte der Server seine gespeicherte erste Antwort, und die Einmaligkeit bliebe ungeprüft. Erst
ein zweiter Schlüssel auf demselben Code fragt wirklich, ob der Code verbrannt ist.

## Folgen

- `pacts/nutritrack-app-nutritrack-identity.json` trägt jetzt neun Interaktionen zum Zurücksetzen
  statt fünf. Der Provider hat vier zusätzliche Zustände herzustellen, darunter zwei neue:
  `Fuer a@b.de ist ein Code eingeloest` und `Der Code 482913 wurde bereits eingeloest`.
- Der Kommentar, der die Einmaligkeit des Codes bisher nur behauptete, ist damit eingelöst; was im
  Vertrag steht, steht nicht mehr daneben in Prosa.
- Keine neue Fehlerkennung: alle vier Fälle sind `invalid-credentials` beziehungsweise
  `token-expired`. [`../../src/api/problems.ts`](../../src/api/problems.ts) bleibt unverändert.
- **Nicht** Teil davon und weiterhin offen: in
  [`../../src/api/client.ts`](../../src/api/client.ts) gilt jede 401 als Sitzungsproblem. Ein
  falscher Code führt deshalb durch den Erneuerungspfad, und beim angemeldeten Nutzer würde die
  Anfrage mit `Authorization` wiederholt. Das ist ein eigener Vorgang und wird hier nicht angefasst.
- Die Entscheidung von 2026-08-22-1100 bleibt in allen Punkten gültig; diese Datei ergänzt sie um
  Zusagen und löst sie nicht ab.
