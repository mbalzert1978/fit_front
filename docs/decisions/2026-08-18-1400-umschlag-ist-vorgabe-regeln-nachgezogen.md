# Der Umschlag ist Vorgabe, nicht Ableitung — Regeln nachgezogen

## Lage

Ein Review des Zweigs `data-meta-umschlag` gegen `main` hat den `data`/`meta`-Umschlag und die
OAuth-Benennung mehrfach gegen die geschriebenen Regeln laufen sehen: `meta`, `tokenType`,
`expiresIn`, `refreshExpiresIn` und `user.id` stehen im Vertrag, ohne dass ein Screen sie liest
(Regel 2); `tokenType: "Bearer"` ist ein exakter Wert, den die abschließende Aufzählung in Regel 3
nicht kennt; die Entscheidungsdatei von 12:00 Uhr führt einen fünften Abschnitt, den das Format in
[`README.md`](README.md) nicht vorsah; und Regel 9 kam in `regeln.md` hinzu, ohne dass irgendeine
Entscheidung sie als Folge nennt.

Keiner dieser Punkte ist ein Fehler im Code. Der Code hat recht — die Regeln waren jünger als er.

## Entscheidung

Die Form der Antwort ist **Vorgabe**, nicht Ableitung aus dem heutigen Bedarf eines Screens: der
Umschlag und die Auth-Antwort nach OAuth 2 stehen im Vertrag, unabhängig davon, ob heute jemand
sie liest. Die Regeln werden dem Code nachgezogen, nicht der Code den Regeln. `apiWithMeta<T>()`
gibt die Antwort-Header vollständig heraus, und ein Umschlag geht an genau einer Stelle im Repo
auf.

## Begründung

**Warum die Regel weicht und nicht der Vertrag.** Regel 2 hält Verträge klein, damit eine harmlose
Backend-Änderung nicht die Verifikation bricht. Das Argument trägt für Nutzlast-Felder, die aus
einem Screen stammen. Es trägt nicht für die Hülle selbst: `meta` und die Auth-Felder sind nicht
zufällig da, sie sind die bestellte Form. Fielen sie aus dem Vertrag, wäre genau das nicht
zugesichert, was die App vom Backend verlangt — die Regel würde ihren eigenen Zweck verfehlen. Die
Ausnahme ist deshalb abschließend aufgezählt und wächst nur über eine weitere Entscheidung.

**Warum `tokenType` ein exakter Wert bleibt.** `M.string('Bearer')` würde jeden Tokentyp
durchlassen, auch einen, den die Hülle nicht bauen kann. Der Wert *ist* hier die Zusage, wie bei
`sourceType` und `basisUnit` — Regel 3 nennt ihn jetzt mit.

**Warum `apiWithMeta` alle Header gibt.** Die Entscheidung von 12:00 Uhr versprach „Nutzlast, `meta`
und Header"; herausgegeben wurde ein einzelnes Feld `etag`. Damit war `meta.requestId` gegen einen
`X-Request-Id` zugesichert, an den kein Aufrufer herankam — eine Zusage ohne Prüfmöglichkeit. Mit
`headers: Headers` fällt das Sonderfeld weg: es gibt eine Wahrheit für den `ETag` statt zwei.

**Warum der Umschlag an genau einer Stelle aufgeht.** „Genau einmal ausgepackt" war zweimal
geschrieben — in `apiWithMeta` und noch einmal in `renew()`. Beide gehen jetzt durch `unwrap()`.
Der Satz stimmt damit wörtlich und nicht mehr nur ungefähr.

## Folgen

- [`../regeln.md`](../regeln.md) Regel 2 trägt die abschließende Ausnahme für Umschlag und
  Auth-Antwort; Regel 3 nennt `tokenType`. Diese beiden Fassungen **lösen** die Fassungen aus
  [`2026-08-18-1200-data-meta-umschlag-und-oauth-benennung.md`](2026-08-18-1200-data-meta-umschlag-und-oauth-benennung.md)
  ab, soweit dort „Warum `meta` nur locker zugesichert wird" sich auf Regel 2 in ihrer alten
  Fassung beruft. Alles Übrige jener Entscheidung bleibt unverändert gültig.
- Regel 9 (`Jede Antwort mit Rumpf trägt den Umschlag`) ist die Regel zu jener Entscheidung und
  wird hiermit nachgetragen — sie stand bisher in keiner `Folgen`-Liste.
- [`README.md`](README.md) erlaubt den fünften Abschnitt `## Abweichung zur Backend-Spezifikation`
  und sagt, wie eine Ablösung sich schreibt. Die Datei von 12:00 Uhr ist damit formatkonform.
- `ApiResponse<T>` trägt `headers: Headers` statt `etag: string | null`. Wer den ETag braucht,
  liest `r.headers.get('ETag')` — `useRecipe`/`useSaveRecipe` tun das über `withEtag`.
- `unwrap()` in [`../../src/api/client.ts`](../../src/api/client.ts) ist die einzige Stelle, die
  `data`, `meta` und `headers` zusammensetzt; `renew()` packt nicht mehr selbst aus.
- Die Gleichheit von `X-Request-Id` und `meta.requestId` prüft der Consumer-Test gegen den Mock.
  Zusichern kann Pact sie nicht — das steht als Punkt in
  [`../offene-punkte.md`](../offene-punkte.md).
- Der ETag beim Speichern (POST/PUT `recipes`) wird im Vertragstest gelesen und protokolliert.
  Eine Zusage, die kein Aufrufer anfasst, merkt niemand, wenn sie bricht.
- Die fehlenden Auth-Header am 401 der Anmeldung bleiben hier offen: sie gehören in die laufende
  Sicherheitsprüfung und werden dort behoben.
