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
   vorgegeben ist** statt aus heutigem Bedarf abgeleitet: der `data`/`meta`-Umschlag und die
   Auth-Antwort nach OAuth 2 (`tokenType`, `expiresIn`, `refreshExpiresIn`, `user.id`) stehen im
   Vertrag, auch wo kein Screen sie liest — die Ausnahme ist abschließend und wächst nur durch
   eine Entscheidung unter [`decisions/`](decisions/).
3. **Matcher statt Beispielwerte** (`M.integer`, `M.uuid`, `M.eachLike`) — außer wo der Wert selbst Teil der Zusage ist: Barcode, `sourceType`, `basisUnit`, `unit`, `tokenType`, `type` in `problem+json`.
4. **Fehlerfälle sind Verträge.** `product-not-found` (404), `invalid-credentials` (401) und `slot-not-empty` (409) steuern Abläufe im UI und sind genauso zuzusichern wie die Erfolgsfälle.
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
   fachlich relevanten Header. Form, Benennung und Begründung stehen in
   [`decisions/2026-08-18-1200-data-meta-umschlag-und-oauth-benennung.md`](decisions/2026-08-18-1200-data-meta-umschlag-und-oauth-benennung.md);
   ein Vertrag ohne `data`/`meta` ist ein Fehler, kein Sonderfall.

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
