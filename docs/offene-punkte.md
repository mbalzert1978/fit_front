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

## 4 — Suchfeld auf dem Scan-Screen

Steht derzeit als Anzeige-Zeile im Layout, damit der Screen vollständig aussieht.
Zu ersetzen durch ein echtes `TextInput` mit `value={query} onChangeText={setQuery}`
— die Debounce-Logik (300 ms) und `useSearch` hängen bereits daran. Außerdem ist
`GET /search` in der Backend-Spezifikation noch nicht festgelegt: derzeit nimmt
`src/api/hooks.ts` `/search?query=&take=20` mit `{ items: SearchHit[] }` an.
**Vor dem Bauen mit dem Backend abstimmen und einen Pact dafür schreiben.**

## 5 — Registrierung, Passwort ändern, Konto löschen

Die Backend-Spezifikation hat die Endpunkte (`/identity/register`, `/me/password`,
`DELETE /me`), für die Oberfläche ist kein Screen dafür beschrieben. Offene
Produktentscheidung, kein technisches Thema.

## 6 — Sprache: nur Schalter, keine Übersetzung

Der Segmented-Schalter schreibt `language` nach `/preferences`; alle Beschriftungen
sind deutsch fest verdrahtet. Wenn Englisch wirklich ausgeliefert wird, braucht es
eine i18n-Schicht — dann alle Literale in eine Ressourcendatei, sonst zieht sich
die Umstellung durch jeden Screen.

## 7 — Kleinigkeiten

- `app.json`: Bundle-Id `de.example.nutritrack` und Slug sind Platzhalter.
- `useRecipeToDiary` schickt keinen `Idempotency-Key` — bei Offline-Fähigkeit (Punkt 1) nachziehen.
- Der Themenmodus wird beim Start nicht aus `/preferences` vorbelegt; bis der Wert da ist, gilt dunkel. Ein Vorablesen aus SQLite verhindert das kurze Umschalten.
- Rundungsmodus (`rounding`) wird nur gesetzt, nicht clientseitig angewandt: alle angezeigten Werte kommen ganzzahlig vom Server. So ist es gewollt — nicht „nachrunden" einbauen.
- Kein Test außer den Pacts. Wenn Komponententests dazukommen sollen: `jest.config.js` deckt derzeit bewusst nur `pact/` ab.
