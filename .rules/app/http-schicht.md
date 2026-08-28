# HTTP-Schicht

Was hier steht, gilt für [`src/api/client.ts`](../../src/api/client.ts) und alles, was durch sie
hinausgeht. Die Begründung steht in
[`docs/decisions/2026-08-18-1600-auth-und-fehlerfaelle-sind-vertragsvorgabe.md`](../../docs/decisions/2026-08-18-1600-auth-und-fehlerfaelle-sind-vertragsvorgabe.md).

- **Diese Naht ist der einzige Weg hinaus.** Kein zweiter `fetch` daneben, in keiner Datei. Wer an
  ihr vorbei anfragt, umgeht Auth, Erneuerung, Fehlerform, Sprache und Wiederholung auf einmal.
  Fehlt der Naht etwas, wird es **dort** ergänzt.
- **Die Basis-URL ist `https`.** Klartext gilt nur gegen `127.0.0.1`, `localhost`, `[::1]` und
  `10.0.2.2`; jede andere Basis lässt die App beim Start scheitern.
- **Die Sitzung ist ein Datensatz unter einem Schlüssel**, geräteintern abgelegt
  (`WHEN_UNLOCKED_THIS_DEVICE_ONLY`). Kein zweiter Schreibweg daneben, und kein Token wird einzeln
  geschrieben — ein halb geschriebenes Paar ist schlimmer als gar keins. **Und kein zweiter
  Schlüssel daneben:** die getrennten Schlüssel der früheren Fassung werden bei jedem Schreiben
  einer Sitzung mit entfernt, nicht erst beim Abmelden. Ein Token, den die App nicht kennt, kann
  sie auch nicht entwerten.
- **Erneuert wird höchstens einmal gleichzeitig** und vorausschauend, sobald der Access-Token
  abgelaufen ist. Ein zweiter, paralleler Aufruf von `/identity/refresh` mit demselben Token gilt
  beim Server als Wiederverwendung und beendet alle Sitzungen des Nutzers.
- **Nach einem 401 wird nur wiederholt, was der Server zweimal gleich beantwortet**: `GET`, `HEAD`,
  `PUT`, `DELETE` und alles mit `Idempotency-Key`. Ein neuer `POST` ohne Schlüssel ist ein Fehler in
  der Aufrufstelle, nicht ein Sonderfall in der Hülle.
- **Scheitert die Erneuerung, geht keine Anfrage hinaus.** Wer keinen gültigen Access-Token mehr
  bekommt, hat keine Sitzung mehr; dann wird abgemeldet und geworfen, statt die Anfrage ohne
  `Authorization` loszuschicken und sich die 401 abzuholen, die schon feststeht. Ein fehlender
  Token **ohne** abgelaufene Sitzung ist etwas anderes — Anmeldung, Registrierung und Erneuerung
  fragen zurecht ohne.
- **Abmelden entwertet den Refresh-Token serverseitig**, bevor lokal gelöscht wird. Scheitert der
  Aufruf, wird trotzdem lokal abgemeldet.
- **Antworten werden geprüft, nicht behauptet.** Ein `as`-Cast auf eine Nutzlast von außen ist keine
  Prüfung; fehlt der Umschlag, ist die Antwort falsch und nicht leer.
- **Die Sprache kommt aus einer Naht, nicht aus einem Literal.**
  [`src/language.ts`](../../src/language.ts) ist die einzige Stelle, die sie bestimmt: gewählte
  Vorliebe vor Gerätesprache, sonst Deutsch. Von dort füllt sie `Accept-Language` an jeder Anfrage
  **und** `locale` beim Anlegen eines Kontos — zwei Quellen dafür liefen auseinander, und das Konto
  trüge dann eine andere Sprache, als der Nutzer liest.
- **Fremde Werte gehören kodiert in den Pfad** (`pathSegment`). Ids kommen aus Deep-Links, Barcodes
  aus der Kamera.
