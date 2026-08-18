# Auth, Fehlerfälle und Cache-Direktiven sind Vertragsvorgabe

## Lage

Ein Sicherheitsaudit des Umschlag-PR hat fünfzehn Befunde ergeben, davon fünf hoch. Der schwerste
lag nicht im Code, sondern in dem, was die Verträge **nicht** sagten: von dreißig zugesicherten
Interaktionen forderten einundzwanzig keinen `Authorization`-Header, und außer der fehlgeschlagenen
Anmeldung war kein einziger 401 zugesichert. Ein Backend, das jeden Endpunkt unauthentifiziert
ausliefert, hätte alle Verträge dieses Repos erfüllt. Dazu kamen in der HTTP-Schicht eine
Erneuerung ohne Sperre, ein 401-Wiederholungspfad, der auch nicht-idempotente Schreibaufrufe
wiederholte, eine Abmeldung, die den Server nie erreichte, und ein Umschlag, der nur behauptet und
nie geprüft wurde.

## Entscheidung

Auth, Statuscodes, Fehlerform, Cache-Direktiven und Idempotenz stehen im Vertrag, unabhängig davon,
ob ein Screen sie liest: jede Anfrage an einen geschützten Endpunkt sichert `Authorization` zu, jede
Antwort mit personenbezogenen Daten `Cache-Control: no-store`, jeder Kontext einen `401`, und wo
eine Ressource einem Nutzer gehört, einen `403`. Die Sitzung liegt als ein Datensatz unter einem
Schlüssel, geräteintern und nicht in Backups; erneuert wird höchstens einmal gleichzeitig und
vorausschauend; nach einem 401 wird nur wiederholt, was der Server zweimal gleich beantwortet; und
Abmelden entwertet den Refresh-Token serverseitig, bevor lokal gelöscht wird.

## Begründung

**Warum die Ausnahme von Regel 2 wächst.** Regel 2 sagt: nur prüfen, was ein Screen wirklich liest —
sonst blockiert jede harmlose Backend-Änderung. Das Argument trägt für Nutzlastfelder und trägt
nicht für Auth. Ein Feld, das kein Screen liest, kostet im schlimmsten Fall eine unnötig gebrochene
Verifikation. Ein fehlender `Authorization`-Header im Vertrag kostet die Zusage selbst: er macht das
Weglassen der Authentifizierung zu einer vertragskonformen Backend-Implementierung. Die Grenze
verläuft deshalb nicht zwischen „gelesen" und „ungelesen", sondern zwischen Nutzlast und Form. Auth,
Status, Fehlerform, Cache-Direktive und Idempotenz sind Form — dieselbe Kategorie, in der der
Umschlag und die OAuth-Benennung bereits stehen.

**Warum ein Sitzungsdatensatz statt zweier Schlüssel.** Access- und Refresh-Token getrennt zu
schreiben hat einen Zustand, den es nicht geben darf: der erste Schreibvorgang gelingt, der zweite
scheitert, und zurück bleibt ein frischer Access-Token neben einem alten Refresh-Token. Der geht
beim nächsten 401 hinaus, und weil der Server rotiert, gilt er dort als wiederverwendet — was nach
`BACKEND.md` alle Sitzungen des Nutzers beendet. Ein Datensatz kann diesen Zustand nicht annehmen.
Dass dabei `expiresIn` und `refreshExpiresIn` einen Platz bekommen, löst nebenbei den zweiten Punkt:
`hasSession()` prüfte die bloße Existenz eines Access-Tokens und startete die App deshalb auch dann
hinter der Anmeldung, wenn die Sitzung seit Wochen tot war.

**Warum vorausschauend erneuert wird.** Die naheliegende Lösung für den 401-Sturm beim App-Start
wäre eine Sperre allein gewesen. Sie genügt nicht: sechs parallele Abfragen liefen weiterhin
zunächst in ihre 401 und erst danach in die gemeinsame Erneuerung. Läuft der Token schon vor der
ersten Anfrage ab, ist die Erneuerung fällig, bevor irgendetwas hinausgeht — und dann trifft der
401-Pfad nur noch den Fall, für den er gedacht ist: der Server hat die Sitzung verworfen. Erst das
macht die zweite Entscheidung erträglich, nach einem 401 `POST` und `PATCH` ohne `Idempotency-Key`
**nicht** zu wiederholen. Ohne den Vorlauf wäre das eine spürbare Verschlechterung; mit ihm ist es
ein Randfall.

**Warum kein Vertrag für `PUT` ohne `If-Match`.** Er wäre naheliegend gewesen — 428 Precondition
Required — und ist trotzdem nicht entstanden. `useSaveRecipe` schickt eine solche Anfrage seit
dieser Änderung gar nicht mehr, weil ein Speichern ohne Bedingung eine fremde Fassung lautlos
überschriebe. Ein Vertrag für eine Anfrage, die der Client verweigert, wäre eine Zusage, die kein
Aufrufer je einlöst — genau das, was Regel 6 und Punkt 7 der offenen Punkte ausschließen.
Zugesichert ist stattdessen der Fall, der wirklich vorkommt: `409 concurrency-conflict` gegen einen
überholten ETag, und der Rezept-Screen behandelt ihn.

**Warum der Produktkatalog kein `no-store` bekommt.** `no-store` überall wäre die bequeme Antwort
gewesen und die falsche. Ein kuratiertes Produkt zu einem Barcode ist für alle Nutzer dasselbe; es
zwischenzuspeichern ist erwünscht und für den Zehn-Sekunden-Weg vom Scan zum Eintrag hilfreich. Die
Direktive steht dort, wo der Rumpf zu einer Person gehört: Tagebuch, Ziele, Einstellungen,
Gesundheit, eigene Rezepte, Suchtreffer und Foto-Aufträge.

## Abweichung zur Backend-Spezifikation

`../fit_back/docs/Draft/BACKEND.md` kennt weder `Cache-Control: no-store` noch benannte Fehlertypen
für den abgelaufenen Access-Token oder den Zugriff auf eine fremde Ressource. Der Vertrag bestellt
dafür `token-expired` (401) und `forbidden` (403); §Fehlerformat verlangt RFC 7807, nennt aber keine
`type`-Werte für diese beiden Fälle. `concurrency-conflict` (409) ist dagegen aus §13 übernommen und
weicht nicht ab, ebenso `POST /identity/logout` aus §Identity — der Endpunkt stand dort von Anfang
an, nur hatte ihn niemand aufgerufen.

Das ist bewusst so und deckt sich mit [`../regeln.md`](../regeln.md) Regel 8. Von hier aus wird
`BACKEND.md` gelesen und nicht geändert; die Namen sind eine Bestellung, über die die Gegenseite bei
der Verifikation im eigenen Repo entscheidet.

## Folgen

- [`../regeln.md`](../regeln.md) Regel 2 nennt die Ausnahme jetzt vollständig; Regel 4 zählt
  `token-expired`, `forbidden` und `concurrency-conflict` mit auf. Regel 9 verlangt die
  fachlich relevanten Header ausdrücklich einschließlich `Authorization` und `Cache-Control`.
- [`../../pact/setup.ts`](../../pact/setup.ts) trägt `authHeaders`, `germanAuthHeaders`,
  `jsonAuthHeaders`, `privateHeaders`, `problem`, `unauthorized` und `forbidden`. Ein neuer Vertrag
  setzt sie ein, statt Header von Hand zusammenzustellen.
- Die Sitzung liegt unter dem Schlüssel `session`. Die früheren Schlüssel `accessToken` und
  `refreshToken` werden beim Abmelden mit gelöscht; bestehende Installationen melden sich einmalig
  neu an. Das ist der Preis dafür, dass es den halben Zustand nicht mehr gibt.
- `signOut()` ruft `POST /identity/logout`. Wer die Abmeldung auslöst, muss damit rechnen, dass sie
  das Netz berührt; scheitert sie, wird trotzdem lokal abgemeldet.
- `onSignedOut()` in [`../../src/api/client.ts`](../../src/api/client.ts) wird genau einmal
  registriert, in [`../../app/_layout.tsx`](../../app/_layout.tsx). Die HTTP-Schicht kennt weiterhin
  weder Router noch Query-Cache.
- `EXPO_PUBLIC_API_URL` muss `https` sein; Klartext gilt nur gegen `127.0.0.1`, `localhost`, `[::1]`
  und `10.0.2.2`. Eine `.env` aus der falschen Umgebung lässt die App beim Start scheitern.
  [`../../app.json`](../../app.json) verbietet Klartext zusätzlich auf beiden Plattformen.
- Ungültig wird die Annahme, ein Vertrag ohne `Authorization` sei bei einem geschützten Endpunkt
  vollständig. Ebenso ungültig: dass `api()` eine Antwort ohne `data` als leere Nutzlast durchreicht
  — sie ist ab jetzt ein `malformed-envelope`-Fehler.
- Offen bleibt, was in [`../offene-punkte.md`](../offene-punkte.md) unter den Punkten 9 bis 11 neu
  steht: eine Abmelde-Schaltfläche, eine Obergrenze für `take` und die Zusage über einen
  wiederverwendeten `Idempotency-Key` mit abweichendem Rumpf.
