# Die Registrierung trägt Name, Sprache und Zeitzone — und die Zeit kommt aus einer Naht

## Lage

[`2026-08-20-0843-registrierung-legt-konto-und-sitzung-in-einem-aufruf-an.md`](2026-08-20-0843-registrierung-legt-konto-und-sitzung-in-einem-aufruf-an.md)
hat die Registrierung auf E-Mail und Passwort beschränkt, mit dem Argument, dass kein Screen einen
Anzeigenamen liest. Aus dem Provider-Repo kam daraufhin ein Einwand mit neuen Tatsachen: die Domäne
dort verlangt einen `DisplayName` (1–60, nicht leer), eine Zeitzone und eine Sprache, und das
Ereignis `UserRegistered` reicht Sprache und Zone an Goals und Diary weiter. Zusätzlich stand die
Frage, warum der Vertrag bei `/register` nicht einmal `Accept-Language` zusichert.

Zwei Feststellungen dazu aus diesem Repo: `Accept-Language` **geht** an jeder Anfrage hinaus
(`raw()` in [`../../src/api/client.ts`](../../src/api/client.ts)), es war nur nicht zugesichert —
wie bei `login`, `refresh` und `logout` auch. Und eine Zeitzone kannte die App bisher **gar nicht**:
[`../../src/api/diaryDate.ts`](../../src/api/diaryDate.ts) hält ausdrücklich fest, dass ein
Tagebuchtag weder Uhrzeit noch Zone hat.

## Entscheidung

**Die Registrierungsmaske fragt einen Namen ab.** Erstes Feld, 1–60 Zeichen, Pflicht; der Knopf
bleibt aus, bis er steht. Damit ist die Invariante der Gegenseite erfüllt, ohne sie um Nachsicht zu
bitten.

**`locale` und `timeZoneId` reisen im Rumpf, nicht in einer Kopfzeile.** `Accept-Language` verhandelt
**diese eine Antwort**; beim Anlegen eines Kontos entsteht dagegen ein Merkmal, das am Konto bleibt.
Hinge es am Header, hinge ein gespeichertes Attribut an einer Transportentscheidung. `locale` kommt
aus `defaultLanguage` in `client.ts` — derselben Quelle, aus der auch `Accept-Language` gespeist wird,
damit nicht zwei fest verdrahtete `'de'` auseinanderlaufen.

**Externe Quellen für Zeit und Zone stehen hinter einer Naht.** [`../../src/time.ts`](../../src/time.ts)
beschreibt `TimeProvider` mit `now()` und `timeZoneId()`; die Umsetzung für das Gerät benutzt
`expo-localization` und fällt auf `Intl` zurück. Kein Screen und kein Hook fasst `new Date()` oder
`expo-localization` selbst an — `today()` in `diaryDate.ts` geht ab jetzt ebenfalls über die Naht.
`setTimeProvider` besetzt sie in Tests und Prototypen.

**Ist die Zone nicht zu ermitteln, geht `null` hinaus.** Kein erfundenes `UTC`. Eine still falsche
Zone ist schlimmer als eine unbekannte, weil niemand sie je bemerkt.

**Der Vertrag wird von `register()` selbst gefahren.** Die drei Interaktionen in
[`../../pact/identity.pact.test.ts`](../../pact/identity.pact.test.ts) rufen die Hülle aus
`src/api/session.ts` auf statt `api()` mit einem von Hand gebauten Rumpf. Damit ist zugesichert, was
die App wirklich schickt, und nicht, was jemand im Test hineingeschrieben hat.

## Begründung

**Warum der Name in die Maske kommt und nicht abgeleitet wird.** Die Alternative wäre gewesen, die
Gegenseite zu bitten, eine Domänenregel weicher zu fassen, oder die E-Mail als Namen zu schicken.
Das erste kostet dort mehr, als es hier spart; das zweite würde die Adresse überall dort sichtbar
machen, wo später ein Name steht. Ein Feld in einer Maske, die ohnehin ausgefüllt wird, ist der
kleinste Preis — und mit ihm hat der spätere Einstellungs-Screen etwas zu zeigen.

**Warum eine Naht und nicht ein direkter Aufruf.** Die Zeit ist die einzige Eingabe, die sich nicht
wiederholen lässt: ein Test, der sie nicht setzen kann, prüft an jedem Tag etwas anderes. Und die
Herkunft der Zonenkennung ist eine Plattformfrage, die sich ändern darf, ohne dass ein Screen davon
weiß — heute `expo-localization`, morgen etwas anderes. Beides sind Gründe für dieselbe eine Datei.

**Warum die Zone trotzdem eine offene Frage an die Gegenseite lässt.** Der Client bestimmt seinen
Kalendertag lokal (`format(time.now(), 'yyyy-MM-dd')`). Leitet das Backend aus `timeZoneId`
**ebenfalls** einen Tag ab, können beide auseinanderlaufen, sobald das Gerät die Zone wechselt oder
die Zone am Konto veraltet — derselbe Eintrag läge dann je nach Betrachter auf zwei Tagen. Wird die
Zone dagegen für Zeitpunkte, Auswertungen oder Erinnerungen gebraucht, ist sie unproblematisch. Das
ist abzustimmen; das Feld zu liefern, ist davon unabhängig richtig.

## Folgen

- Diese Datei **löst genau einen Punkt** der Entscheidung von 08:43 ab: „Kein Anzeigename". Alles
  andere dort bleibt gültig — ein Aufruf, Sitzung sofort, Mindestlänge zehn Zeichen, die beiden
  Fehlerfälle mit eigenem `type`.
- Neue Abhängigkeit: `expo-localization`. Sie hat **einen** Aufrufer, `src/time.ts`; im Vertragslauf
  ersetzt sie der Stub `pact/stubs/expoLocalization.ts`, eingetragen in
  [`../../jest.config.js`](../../jest.config.js) nach dem Muster von `expo-secure-store`.
- `Accept-Language` bleibt bei den Identity-Interaktionen unzugesichert, weil `locale` jetzt im Rumpf
  steht und die Antwort dort nicht sprachabhängig ist. Wo die Antwort es ist — Catalog, Diary —,
  steht der Header weiter im Vertrag (`germanAuthHeaders`).
- Ein eigener Fehlerfall für einen unzulässigen Namen ist **nicht** bestellt: die Maske lässt nur
  1–60 Zeichen zu, und der Screen hätte zu einer Ablehnung nichts Eigenes zu sagen. Wird er drüben
  gebraucht, ist er eine Interaktion und ein Satz — dann hier nachtragen.
- Offen und abzustimmen: wozu Goals und Diary die Zone rechnen (siehe Begründung), und was gilt, wenn
  `timeZoneId` als `null` ankommt.
