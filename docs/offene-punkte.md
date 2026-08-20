# Offene Punkte

Nach Gewicht sortiert. Jeder Punkt ist bewusst offen gelassen, nicht vergessen.
Wird einer davon gebaut, verschwindet er hier — und was dabei entschieden wurde,
kommt nach [`decisions/`](decisions/).

## 1 — Offline-Warteschlange und Sync

Nicht angelegt. Schreibende Aktionen gehen derzeit direkt an die API; bei
Netzwerkfehler wirft die Hülle `OfflineError` und die Mutation schlägt fehl,
statt in eine Warteschlange zu laufen.

Zu bauen: SQLite-Schema mit Drizzle (`outbox`: `opId`, `type`, `payload`,
`createdAt`, `attempts`), ein Hintergrundprozess gegen `POST /sync/batch`,
optimistische Anzeige und die dezente Zeile „Nicht synchronisiert" am Eintrag.
Die Client-Ids und `Idempotency-Key` sind dafür schon vorbereitet
(`src/api/ids.ts`, `api(..., { idempotencyKey })`), `opId` = Eintrags-Id.

## 2 — Drag & Drop im Tagebuch

Die Verschiebe-Mutation existiert (`useMoveEntry` → `PATCH …/entries/{id}/slot`),
die Gestik nicht. Zu bauen mit `react-native-gesture-handler` +
`react-native-reanimated`: Drop-Ziel ist der Mahlzeitenblock, beim Ablegen kurzes
haptisches Feedback (`expo-haptics`). Das Verschmelzen zweier Zeilen desselben
Produkts erledigt das Backend — der Client stellt nur die Antwort dar.

## 3 — HealthKit / Health Connect

Die Einstellungs-Zeilen sind gebaut und lesen `GET /health/consent`, aber
„Verbinden" und die drei Schalter haben noch keine Wirkung (`onChange={() => {}}`).
Zu bauen: `@kingstinct/react-native-health` einbinden, Freigabe anfordern,
Aktivitäten nach `PUT /health/activity/{date}` schreiben. Lesend für Aktivität;
die Schreib-Freigabe für Ernährung bleibt davon getrennt.

## 4 — `GET /search` ist bestellt, nicht vorhanden

`GET /search` steht in der Backend-Spezifikation nicht; der Vertrag dazu
(`pact/catalog.pact.test.ts`) ist deshalb die Bestellung, nicht die Abbildung eines
bestehenden Endpunkts. Genau so ist consumer-driven gemeint: was die App braucht,
steht im Vertrag, auch wenn es das Backend noch nicht gibt.

Das Eingabefeld selbst ist gebaut (`TextInput` mit Debounce, 300 ms). Offen ist nur
noch die Gegenseite.

## 5 — Passwort ändern, Passwort vergessen, Konto löschen

Die **Registrierung ist gebaut** (`app/register.tsx`, Vertrag in
`pact/identity.pact.test.ts`); was dabei entschieden wurde, steht in
[`decisions/2026-08-20-0843-registrierung-legt-konto-und-sitzung-in-einem-aufruf-an.md`](decisions/2026-08-20-0843-registrierung-legt-konto-und-sitzung-in-einem-aufruf-an.md).

Offen bleiben drei Wege am selben Konto. Passwort ändern und Konto löschen sind
offene Produktentscheidungen, kein technisches Thema. **Passwort vergessen** ist
der drängendere Punkt: seit es eine Registrierung gibt, entstehen Konten in der
App, und wer sein Passwort verliert, kommt an keiner Stelle wieder hinein. Der
Weg dorthin braucht einen Kanal außerhalb der App (E-Mail), den es bisher nicht
gibt — deshalb ist er aufgeschoben und nicht nebenbei gebaut.

## 6 — Sprache: nur Schalter, keine Übersetzung

Der Segmented-Schalter schreibt `language` nach `/preferences`; alle Beschriftungen
sind deutsch fest verdrahtet. Wenn Englisch wirklich ausgeliefert wird, braucht es
eine i18n-Schicht — dann alle Literale in eine Ressourcendatei, sonst zieht sich
die Umstellung durch jeden Screen.

## 7 — Kein Vertrag für das Verschieben eines Eintrags

`useMoveEntry` (`PATCH /diary/days/{date}/entries/{id}/slot`) ist der einzige Hook ohne
Pact-Test: kein Screen ruft ihn auf, weil die Gestik fehlt (Punkt 2). Ein Vertrag dafür
wäre eine Zusage, die kein ViewModel einfordert. Kommt Drag & Drop, kommt der Vertrag im
selben Commit.

## 8 — `X-Request-Id` und `meta.requestId` sind nur im Consumer-Test aneinander gebunden

Beide bezeichnen denselben Aufruf und müssen denselben Wert tragen — sonst führt der Faden, an dem
sich ein Anmeldeversuch nachverfolgen lässt, ins Leere. Zusichern kann Pact das nicht: ein Matcher
kennt nur sein eigenes Feld, eine Gleichheit über Header- und Rumpfgrenze hinweg lässt sich in
keiner Matcher-Form ausdrücken.

Was geht, ist getan: `apiWithMeta` gibt die Header heraus, und `pact/identity.pact.test.ts` prüft
die Gleichheit gegen den Mock. Gegenüber dem Provider bleibt sie eine Bitte im Klartext. Feste
Werte statt Matcher wären die Alternative — sie scheitern daran, dass eine echte ULID je Aufruf
neu ist. Aufzulösen ist das erst bei der Verifikation im Provider-Repo, nicht von hier aus.

## 9 — Keine Abmelde-Schaltfläche in der Oberfläche

`signOut()` entwertet den Refresh-Token jetzt serverseitig und räumt Cache und Navigation auf, aber
ausgelöst wird es nur von der Hülle selbst, wenn eine Erneuerung scheitert. Ein Nutzer, der sich von
Hand abmelden will, hat keinen Weg dazu.

Zu bauen wäre eine Zeile in `app/(tabs)/settings.tsx`, die `signOut()` ruft. Dass sie fehlt, ist
keine technische Lücke mehr, sondern eine Produktentscheidung: die App hat bewusst keinen
Konto-Bereich (siehe Punkt 5), und eine einzelne Abmelde-Zeile ohne ihn stünde etwas verloren da.

## 10 — Keine Obergrenze für `take` im Vertrag

`GET /diary/recent?take=10` und `GET /search?take=20` schicken die Zahl hinaus, aber kein Vertrag
sagt, was bei `take=100000` passiert. Ein Backend, das die Zahl ungeprüft übernimmt, hält jeden
Vertrag dieses Repos ein und lässt sich über einen einzigen Aufruf zum Ausliefern des gesamten
Bestands bewegen.

Zu bestellen wäre eine zugesicherte Obergrenze — entweder `400` bei Überschreitung oder stilles
Kappen mit einer Angabe in `meta`. Welche der beiden Formen richtig ist, hängt daran, wie
Paginierung insgesamt aussehen soll, und die ist nirgends beschrieben. Deshalb aufgeschoben statt
halb entschieden.

## 11 — Kein Vertrag für einen wiederverwendeten `Idempotency-Key`

`BACKEND.md` §Idempotenz speichert neben dem Key einen `RequestHash`, sagt aber nicht, was bei
gleichem Key und **abweichendem** Rumpf geschieht. Zugesichert ist heute nur der Wiederholungsfall
mit identischem Rumpf. Solange die Outbox (Punkt 1) nicht steht, kommt der Fall in der App nicht
vor; mit ihr kommt er, und dann gehört er in den Vertrag.

## 12 — Kleinigkeiten

- `app.json`: Bundle-Id `de.example.nutritrack` und Slug sind Platzhalter.
- Der Themenmodus wird beim Start nicht aus `/preferences` vorbelegt; bis der Wert da ist, gilt dunkel. Ein Vorablesen aus SQLite verhindert das kurze Umschalten.
- Bestehende Installationen melden sich einmalig neu an: die Sitzung liegt jetzt unter einem
  Schlüssel statt unter zweien. Die alten Schlüssel werden beim Abmelden mit gelöscht, eine
  Migration des alten Paares gibt es bewusst nicht — sie hätte genau den halben Zustand
  wiederhergestellt, den die Änderung abschafft.
- Rundungsmodus (`rounding`) wird nur gesetzt, nicht clientseitig angewandt: alle angezeigten Werte kommen ganzzahlig vom Server. So ist es gewollt — nicht „nachrunden" einbauen.
- Kein Test außer den Pacts. Wenn Komponententests dazukommen sollen: `jest.config.js` deckt derzeit bewusst nur `pact/` ab.
- `NODE_EXTRA_CA_CERTS` zeigt in manchen Sitzungen auf einen Platzhalterpfad; `make.ps1` fängt das ab (Nutzer-Einstellung, sonst `--use-system-ca`). Behoben ist es damit nicht, nur umgangen.
