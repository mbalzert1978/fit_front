# NutriTrack — App (Expo, iOS zuerst, Android gleicher Code)

Verbindliche Vorgaben: `../handoff/FRONTEND.md` (Oberfläche) und `../handoff/BACKEND.md` (API).
Dieses Verzeichnis ist das vollständige Skelett: Alle elf Screens sind angelegt und
gegen die API verdrahtet, das Designsystem liegt in einer Datei, die Verträge sind
consumer-driven mit Pact zugesichert.

---

## 1. Vor dem ersten Start: drei Umbenennungen

Klammern und eckige Klammern in Ordnernamen sind Expo-Router-Syntax, gingen beim
Anlegen hier aber verloren. Einmal ausführen, dann stimmt der Routenbaum:

```bash
cd frontend
git mv app/-tabs-            "app/(tabs)"
git mv app/product/-id-.tsx  "app/product/[id].tsx"
git mv app/entry/-id-.tsx    "app/entry/[id].tsx"
git mv app/recipe/-id-.tsx   "app/recipe/[id].tsx"
```

Die relativen Importe (`../../src/…`) bleiben dabei gültig — die Verschachtelungstiefe ändert sich nicht.

## 2. Start

```bash
cp .env.example .env        # EXPO_PUBLIC_API_URL setzen
npm install
npm run typecheck
npx expo run:ios            # Kamera und HealthKit brauchen einen Development Build
```

`npx expo start` (Expo Go) reicht für Tagebuch, Rezepte und Einstellungen; Scan und
Foto-Aufnahme brauchen den Development Build.

## 3. Was liegt wo

| Bereich | Dateien |
|---|---|
| Designsystem | `src/theme.ts` (beide Paletten, Standard dunkel), `src/theme/ThemeProvider.tsx` |
| Bausteine (FRONTEND.md §6) | `src/components/*` — diese zwölf und keine weiteren |
| API-Hülle | `src/api/client.ts` (Auth, Sprache, Idempotency-Key, `problem+json` → `ApiError`, 401-Refresh) |
| Typen und Hooks | `src/api/types.ts`, `src/api/hooks.ts`, `src/api/queryKeys.ts` |
| Kalendertag | `src/api/diaryDate.ts` — `DiaryDate` als eigener Typ, nie ein `Date` an die API |
| Navigation | `app/_layout.tsx` (Stack + Modals), `app/(tabs)/_layout.tsx` (vier Ziele, keine Zurück-Pfeile) |
| Screens | siehe Tabelle unten |
| Verträge | `pact/*.pact.test.ts` |

### Screens

| Route | Datei | Stand |
|---|---|---|
| `/login` | `app/login.tsx` | vollständig |
| `/(tabs)/diary` | `app/(tabs)/diary.tsx` | vollständig außer Drag & Drop |
| `/(tabs)/scan` | `app/(tabs)/scan.tsx` | Kamera + Ablauf vollständig, Suchfeld siehe offener Punkt 4 |
| `/(tabs)/recipes` | `app/(tabs)/recipes.tsx` | vollständig |
| `/(tabs)/settings` | `app/(tabs)/settings.tsx` | vollständig außer Health-Verbindung |
| `/product/[id]` | `app/product/[id].tsx` | vollständig |
| `/entry/[id]` | `app/entry/[id].tsx` | vollständig |
| `/capture/not-found` | `app/capture/not-found.tsx` | vollständig |
| `/capture/photo` | `app/capture/photo.tsx` | vollständig |
| `/capture/processing` | `app/capture/processing.tsx` | vollständig |
| `/capture/confirm` | `app/capture/confirm.tsx` | vollständig |
| `/recipe/[id]` | `app/recipe/[id].tsx` | vollständig |

Farbliterale gehören ausschließlich in `src/theme.ts`. Ein Suchlauf nach `#` in
`app/` und `src/components/` muss leer bleiben — einzige Ausnahme sind die beiden
Weißwerte des Kamerarahmens in `CameraFrame`, die über der Vorschau liegen.

## 4. Contract Testing (Pact)

Consumer-driven: die App schreibt den Vertrag, das Backend verifiziert ihn.

```bash
npm run test:pact      # erzeugt ./pacts/*.json
npm run pact:publish   # in CI, gegen PACT_BROKER_BASE_URL
```

Regeln, damit die Verträge tragen:

1. **Ein Pact je Bounded Context** (`nutritrack-identity`, `-catalog`, `-diary`, `-recipes`, `-goals`), nicht einer für die ganze API — so bricht eine Änderung im Catalog nicht die Diary-Verifikation.
2. **Nur prüfen, was ein Screen wirklich liest.** Felder ohne Verwendung gehören nicht in den Vertrag, sonst blockiert jede harmlose Backend-Änderung.
3. **Matcher statt Beispielwerte** (`M.integer`, `M.uuid`, `M.eachLike`) — außer wo der Wert selbst Teil der Zusage ist: Barcode, `sourceType`, `basisUnit`, `unit`, `type` in `problem+json`.
4. **Fehlerfälle sind Verträge.** `product-not-found` (404), `invalid-credentials` (401) und `slot-not-empty` (409) steuern Abläufe im UI und sind genauso zuzusichern wie die Erfolgsfälle.
5. **`given(...)` benennt einen Zustand, den das Backend herstellen kann** — deutsch, kurz, ohne Ids.
6. Neuer Endpunkt in einem Screen ⇒ neuer Pact-Test im selben Commit. Kein `fetch` ohne Vertrag.

Abgedeckt: Identity (Login 200/401), Catalog (Barcode 200/404), Diary (Tagesansicht, Eintrag anlegen, `slot-not-empty`), Recipes (Liste, Portionen ins Tagebuch), Goals (Ziele lesen).

---

## 5. Offene Punkte

Nach Gewicht sortiert. Jeder Punkt ist bewusst offen gelassen, nicht vergessen.

### 1 — Offline-Warteschlange und Sync (FRONTEND.md §4, Schritt 9)

Nicht angelegt. Schreibende Aktionen gehen derzeit direkt an die API; bei
Netzwerkfehler wirft die Hülle `OfflineError` und die Mutation schlägt fehl,
statt in eine Warteschlange zu laufen.

Zu bauen: SQLite-Schema mit Drizzle (`outbox`: `opId`, `type`, `payload`,
`createdAt`, `attempts`), ein Hintergrundprozess gegen `POST /sync/batch`,
optimistische Anzeige und die dezente Zeile „Nicht synchronisiert" am Eintrag.
Die Client-Ids und `Idempotency-Key` sind dafür schon vorbereitet
(`src/api/ids.ts`, `api(..., { idempotencyKey })`), `opId` = Eintrags-Id.

### 2 — Drag & Drop im Tagebuch (§3.1, Schritt 6)

Die Verschiebe-Mutation existiert (`useMoveEntry` → `PATCH …/entries/{id}/slot`),
die Gestik nicht. Zu bauen mit `react-native-gesture-handler` +
`react-native-reanimated`: Drop-Ziel ist der Mahlzeitenblock, beim Ablegen kurzes
haptisches Feedback (`expo-haptics`). Das Verschmelzen zweier Zeilen desselben
Produkts erledigt das Backend — der Client stellt nur die Antwort dar.

### 3 — HealthKit / Health Connect (§3.11, Schritt 10)

Die Einstellungs-Zeilen sind gebaut und lesen `GET /health/consent`, aber
„Verbinden" und die drei Schalter haben noch keine Wirkung (`onChange={() => {}}`).
Zu bauen: `@kingstinct/react-native-health` einbinden, Freigabe anfordern,
Aktivitäten nach `PUT /health/activity/{date}` schreiben. Lesend für Aktivität;
die Schreib-Freigabe für Ernährung bleibt davon getrennt.

### 4 — Suchfeld auf dem Scan-Screen

Steht derzeit als Anzeige-Zeile im Layout, damit der Screen vollständig aussieht.
Zu ersetzen durch ein echtes `TextInput` mit `value={query} onChangeText={setQuery}`
— die Debounce-Logik (300 ms) und `useSearch` hängen bereits daran. Außerdem ist
`GET /search` in `BACKEND.md` noch nicht spezifiziert: derzeit nimmt
`src/api/hooks.ts` `/search?query=&take=20` mit `{ items: SearchHit[] }` an.
**Vor dem Bauen mit dem Backend abstimmen und einen Pact dafür schreiben.**

### 5 — Registrierung, Passwort ändern, Konto löschen

`BACKEND.md` hat die Endpunkte (`/identity/register`, `/me/password`,
`DELETE /me`), `FRONTEND.md` beschreibt keinen Screen dafür. Offene
Produktentscheidung, kein technisches Thema.

### 6 — Sprache: nur Schalter, keine Übersetzung

Der Segmented-Schalter schreibt `language` nach `/preferences`; alle Beschriftungen
sind deutsch fest verdrahtet. Wenn Englisch wirklich ausgeliefert wird, braucht es
eine i18n-Schicht — dann alle Literale in eine Ressourcendatei, sonst zieht sich
die Umstellung durch jeden Screen.

### 7 — Kleinigkeiten

- `app.json`: Bundle-Id `de.example.nutritrack` und Slug sind Platzhalter.
- `useRecipeToDiary` schickt keinen `Idempotency-Key` — bei Offline-Fähigkeit (Punkt 1) nachziehen.
- Der Themenmodus wird beim Start nicht aus `/preferences` vorbelegt; bis der Wert da ist, gilt dunkel. Ein Vorablesen aus SQLite verhindert das kurze Umschalten.
- Rundungsmodus (`rounding`) wird nur gesetzt, nicht clientseitig angewandt: alle angezeigten Werte kommen ganzzahlig vom Server. So ist es gewollt — nicht „nachrunden" einbauen.
- Kein Test außer den Pacts. Wenn Komponententests dazukommen sollen: `jest.config.js` deckt derzeit bewusst nur `pact/` ab.

---

## 6. Prüfliste vor der Abnahme

Aus `FRONTEND.md` §8, hier als Arbeitskopie:

- [ ] Kein flächig gefüllter Button in der gesamten App.
- [ ] Keine berechnete Zahl mit Nachkommastelle.
- [ ] Navigationsleiste auf jedem Screen sichtbar, kein Zurück-Pfeil vorhanden.
- [ ] Zweimal dasselbe Produkt in dieselbe Mahlzeit ⇒ eine Zeile mit addierten Gramm.
- [ ] Prozentsumme ≠ 100 lässt das Tagesziel stehen und zeigt nur einen Hinweis.
- [ ] Gegenseitig ausschließende Schalter lassen sich in beide Richtungen umschalten.
- [ ] Flugmodus: Eintrag erfassen, App neu starten, Netz einschalten — der Eintrag ist da und wurde genau einmal übertragen. *(hängt an offenem Punkt 1)*
- [ ] Barcode-Scan bis zum gespeicherten Eintrag in unter 10 Sekunden.
- [ ] Alle Tippziele ≥ 44 pt.
