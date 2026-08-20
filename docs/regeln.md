# Verbindliche Regeln

Was hier steht, gilt für jede Änderung an dieser App. Es sind Regeln, keine
Zustandsbeschreibungen — sie driften nicht mit dem Code.

## Farb- und Maßliterale

Farbliterale gehören ausschließlich in [`src/theme.ts`](../src/theme.ts). Ein Suchlauf nach `#` in
[`app/`](../app/) und [`src/components/`](../src/components/) muss leer bleiben — einzige Ausnahme
sind die beiden Weißwerte des Kamerarahmens in `CameraFrame`, die über der Vorschau liegen.

## Verträge (Pact)

Consumer-driven: die App schreibt den Vertrag, das Backend verifiziert ihn.

1. **Ein Pact je Bounded Context** (`nutritrack-identity`, `-catalog`, `-diary`, `-recipes`, `-goals`, `-health`), nicht einer für die ganze API — so bricht eine Änderung im Catalog nicht die Diary-Verifikation.
2. **Nur prüfen, was ein Screen wirklich liest.** Felder ohne Verwendung gehören nicht in den
   Vertrag, sonst blockiert jede harmlose Backend-Änderung. **Ausgenommen ist, was als Form
   vorgegeben ist** statt aus heutigem Bedarf abgeleitet. Die Grenze verläuft zwischen Nutzlast und
   Form, nicht zwischen gelesen und ungelesen: ein ungelesenes Nutzlastfeld kostet höchstens eine
   unnötig gebrochene Verifikation, eine fehlende Formzusage macht unsicheres Verhalten
   vertragskonform. Als Form gelten der `data`/`meta`-Umschlag, die Auth-Antwort nach OAuth 2
   (`tokenType`, `expiresIn`, `refreshExpiresIn`, `user.id`), der `Authorization`-Header an jeder
   geschützten Anfrage, `Cache-Control: no-store` an jeder Antwort mit personenbezogenen Daten,
   `Idempotency-Key` an jedem nicht wiederholbaren Schreibaufruf, `Accept-Language` an **jeder**
   Anfrage und `Content-Language` an jeder Fehlerantwort sowie Statuscode und Fehlerform.
   Die Fehlerform ist die von **RFC 9457** und steht vollständig in jeder Fehlerzusage: `type`,
   `title`, `status`, `detail`, `instance`. `errors` kommt dazu, wo ein Screen die feldweise
   Begründung zeigt.
   Die Aufzählung ist abschließend und wächst nur durch eine Entscheidung unter
   [`decisions/`](decisions/).
3. **Matcher statt Beispielwerte** (`M.integer`, `M.uuid`, `M.eachLike`) — außer wo der Wert selbst
   Teil der Zusage ist: Barcode, `sourceType`, `basisUnit`, `unit`, `tokenType` und `type` in
   `problem+json`. Letzteres ist nach RFC 9457 eine **URI und damit eine Kennung, kein Ort**: sie
   wird nicht abgerufen und ganz verglichen, nicht in Teilen. Die Kennungen stehen an einer Stelle
   ([`../src/api/problems.ts`](../src/api/problems.ts)); der Vertrag liest sie von dort, damit
   Zusage und Vergleich nicht auseinanderlaufen.
4. **Fehlerfälle sind Verträge.** `product-not-found` (404), `invalid-credentials` (401),
   `slot-not-empty` (409) und `concurrency-conflict` (409) steuern Abläufe im UI. `token-expired`
   (401) und `forbidden` (403) steuern keinen Screen und stehen trotzdem in **jedem** Kontext: an
   der 401 hängt die gesamte Erneuerung in [`../src/api/client.ts`](../src/api/client.ts), und ohne
   die 403 dürfte das Backend eine fremde Ressource ausliefern, ohne den Vertrag zu brechen.
   Zugesichert werden sie genauso wie die Erfolgsfälle. Die gemeinsamen Bausteine dafür stehen in
   [`../pact/setup.ts`](../pact/setup.ts) und werden dort benutzt statt daneben nachgebaut.
5. **`given(...)` benennt einen Zustand, den das Backend herstellen kann** — deutsch, kurz, ohne Ids.
6. Neuer Endpunkt in einem Screen ⇒ neuer Pact-Test im selben Commit. Kein `fetch` ohne Vertrag.
7. **Dieses Repo erzeugt Verträge und verifiziert nichts.** `./make.ps1 test` schreibt
   `pacts/*.json`, und damit ist die Seite des Consumers fertig. Kein Ziel startet einen
   Provider, ruft einen auf oder prüft, ob einer den Vertrag hält — wer das feststellt, ist der
   Provider in seinem eigenen Repo. Die versionierte Vertragsdatei ist die Übergabe.
8. **Ein Vertrag ist eine Bestellung, keine Abbildung.** Was ein Screen braucht, steht im
   Vertrag — auch wenn das Backend es heute nicht anbietet und auch wenn seine Spezifikation es
   anders nennt. Weicht beides voneinander ab, wird das abgestimmt, nicht einseitig nachgezogen.
9. **Jede Antwort mit Rumpf trägt den Umschlag** und jede zugesicherte Antwort ihren Status und die
   fachlich relevanten Header — bei geschützten Endpunkten einschließlich `Authorization` an der
   Anfrage und `Cache-Control: no-store` an jeder Antwort mit personenbezogenen Daten. Form,
   Benennung und Begründung stehen in
   [`decisions/2026-08-18-1200-data-meta-umschlag-und-oauth-benennung.md`](decisions/2026-08-18-1200-data-meta-umschlag-und-oauth-benennung.md)
   und
   [`decisions/2026-08-18-1600-auth-und-fehlerfaelle-sind-vertragsvorgabe.md`](decisions/2026-08-18-1600-auth-und-fehlerfaelle-sind-vertragsvorgabe.md);
   ein Vertrag ohne `data`/`meta` ist ein Fehler, kein Sonderfall, und ein Vertrag ohne
   `Authorization` an einem geschützten Endpunkt genauso.
10. **Die Sprache steht an jeder Anfrage und ist ein fester Wert.** Der Server entscheidet allein
    an `Accept-Language`, in welcher Sprache `title`, `detail` und jeder Satz in `errors` kommen;
    die App zeigt sie unverändert und übersetzt nichts. Deshalb nennt jede Interaktion die Sprache,
    in der sie gefragt hat — als Wert, nicht als Matcher —, und jede Fehlerantwort trägt
    `Content-Language`: die Wortlaute selbst sind Matcher, und ein Matcher nimmt jede Sprache an.
    Ohne diesen Header wäre die Aushandlung nicht zugesagt, sondern gehofft. Die Bausteine dafür
    heißen [`../pact/setup.ts`](../pact/setup.ts) `jsonHeadersIn`, `authHeadersIn`,
    `jsonAuthHeadersIn`; eine Form **ohne** Sprache gibt es nicht, weil der Client immer eine nennt.
    Wo eine zweite Sprache etwas zusichert, was eine einzelne Interaktion nicht zeigen kann, steht
    derselbe Fall zweimal — siehe die Registrierung in
    [`../pact/identity.pact.test.ts`](../pact/identity.pact.test.ts).

## HTTP-Schicht

Was hier steht, gilt für [`../src/api/client.ts`](../src/api/client.ts) und alles, was durch sie
hinausgeht. Die Begründung steht in
[`decisions/2026-08-18-1600-auth-und-fehlerfaelle-sind-vertragsvorgabe.md`](decisions/2026-08-18-1600-auth-und-fehlerfaelle-sind-vertragsvorgabe.md).

- **Die Basis-URL ist `https`.** Klartext gilt nur gegen `127.0.0.1`, `localhost`, `[::1]` und
  `10.0.2.2`; jede andere Basis lässt die App beim Start scheitern.
- **Die Sitzung ist ein Datensatz unter einem Schlüssel**, geräteintern abgelegt
  (`WHEN_UNLOCKED_THIS_DEVICE_ONLY`). Kein zweiter Schreibweg daneben, und kein Token wird einzeln
  geschrieben — ein halb geschriebenes Paar ist schlimmer als gar keins.
- **Erneuert wird höchstens einmal gleichzeitig** und vorausschauend, sobald der Access-Token
  abgelaufen ist. Ein zweiter, paralleler Aufruf von `/identity/refresh` mit demselben Token gilt
  beim Server als Wiederverwendung und beendet alle Sitzungen des Nutzers.
- **Nach einem 401 wird nur wiederholt, was der Server zweimal gleich beantwortet**: `GET`, `HEAD`,
  `PUT`, `DELETE` und alles mit `Idempotency-Key`. Ein neuer `POST` ohne Schlüssel ist ein Fehler in
  der Aufrufstelle, nicht ein Sonderfall in der Hülle.
- **Abmelden entwertet den Refresh-Token serverseitig**, bevor lokal gelöscht wird. Scheitert der
  Aufruf, wird trotzdem lokal abgemeldet.
- **Antworten werden geprüft, nicht behauptet.** Ein `as`-Cast auf eine Nutzlast von außen ist keine
  Prüfung; fehlt der Umschlag, ist die Antwort falsch und nicht leer.
- **Die Sprache kommt aus einer Naht, nicht aus einem Literal.**
  [`../src/language.ts`](../src/language.ts) ist die einzige Stelle, die sie bestimmt: gewählte
  Vorliebe vor Gerätesprache, sonst Deutsch. Von dort füllt sie `Accept-Language` an jeder Anfrage
  **und** `locale` beim Anlegen eines Kontos — zwei Quellen dafür liefen auseinander, und das Konto
  trüge dann eine andere Sprache, als der Nutzer liest.
- **Fremde Werte gehören kodiert in den Pfad** (`pathSegment`). Ids kommen aus Deep-Links, Barcodes
  aus der Kamera.

## Prüfliste vor der Abnahme

- [ ] Kein flächig gefüllter Button in der gesamten App.
- [ ] Keine berechnete Zahl mit Nachkommastelle.
- [ ] Navigationsleiste auf jedem Screen sichtbar, kein Zurück-Pfeil vorhanden.
- [ ] Zweimal dasselbe Produkt in dieselbe Mahlzeit ⇒ eine Zeile mit addierten Gramm.
- [ ] Prozentsumme ≠ 100 lässt das Tagesziel stehen und zeigt nur einen Hinweis.
- [ ] Gegenseitig ausschließende Schalter lassen sich in beide Richtungen umschalten.
- [ ] Flugmodus: Eintrag erfassen, App neu starten, Netz einschalten — der Eintrag ist da und wurde genau einmal übertragen. *(hängt am offenen Punkt „Offline-Warteschlange und Sync")*
- [ ] Barcode-Scan bis zum gespeicherten Eintrag in unter 10 Sekunden.
- [ ] Alle Tippziele ≥ 44 pt.
