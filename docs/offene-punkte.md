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

## 5 — Registrierung, Passwort ändern, Konto löschen

Die Backend-Spezifikation hat die Endpunkte (`/identity/register`, `/me/password`,
`DELETE /me`), für die Oberfläche ist kein Screen dafür beschrieben. Offene
Produktentscheidung, kein technisches Thema.

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

## 8 — Kleinigkeiten

- `app.json`: Bundle-Id `de.example.nutritrack` und Slug sind Platzhalter.
- `useRecipeToDiary` schickt keinen `Idempotency-Key` — bei Offline-Fähigkeit (Punkt 1) nachziehen.
- Der Themenmodus wird beim Start nicht aus `/preferences` vorbelegt; bis der Wert da ist, gilt dunkel. Ein Vorablesen aus SQLite verhindert das kurze Umschalten.
- Rundungsmodus (`rounding`) wird nur gesetzt, nicht clientseitig angewandt: alle angezeigten Werte kommen ganzzahlig vom Server. So ist es gewollt — nicht „nachrunden" einbauen.
- Kein Test außer den Pacts. Wenn Komponententests dazukommen sollen: `jest.config.js` deckt derzeit bewusst nur `pact/` ab.
- `NODE_EXTRA_CA_CERTS` zeigt in manchen Sitzungen auf einen Platzhalterpfad; `make.ps1` fängt das ab (Nutzer-Einstellung, sonst `--use-system-ca`). Behoben ist es damit nicht, nur umgangen.
