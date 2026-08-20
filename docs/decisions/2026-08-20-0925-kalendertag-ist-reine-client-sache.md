# Der Kalendertag ist reine Client-Sache

## Lage

[`2026-08-20-0907-registrierung-traegt-name-sprache-zone-zeit-aus-einer-naht.md`](2026-08-20-0907-registrierung-traegt-name-sprache-zone-zeit-aus-einer-naht.md)
hat eine Frage offen gelassen: Die App bestimmt ihren Kalendertag lokal, schickt seit der
Registrierung aber eine `timeZoneId` mit. Leitet die Gegenseite daraus **ebenfalls** einen Tag ab,
liegt derselbe Eintrag je nach Betrachter auf zwei Tagen, sobald das Gerät die Zone wechselt oder
die Zone am Konto veraltet.

Die Abstimmung ist erfolgt. Der Tag wird drüben nicht gerechnet: die Zeitzone bleibt Stammdatum für
Zeitpunkte und geplante Läufe, die Vorwärtsgrenze für Einträge misst gegen UTC mit einem Tag
Spielraum, und `isFuture` verlässt den Vertrag.

## Entscheidung

**Welcher Tag „heute" ist, entscheidet allein das Gerät.** `today()` in
[`../../src/api/diaryDate.ts`](../../src/api/diaryDate.ts) ist die einzige Quelle dafür, und sie
liegt hinter der Naht [`../../src/time.ts`](../../src/time.ts).

**`isFuture` steht nicht mehr im Vertrag und nicht mehr im Typ.** Ob ein Tag in der Zukunft liegt,
ist der Vergleich zweier `yyyy-MM-dd` — `date > today()` in
[`../../app/(tabs)/diary.tsx`](../../app/(tabs)/diary.tsx). Aus
[`../../pact/diary.pact.test.ts`](../../pact/diary.pact.test.ts) und aus `DiaryDay` in
[`../../src/api/types.ts`](../../src/api/types.ts) ist das Feld entfernt.

**Die vierzehn Tage nach vorn setzt der Client.** Das Datumsfeld reicht 30 Tage zurück und 14 nach
vorn; der Server misst dieselbe Spanne gegen UTC und lässt einen Tag Spielraum. Damit fällt kein
Gerät durch, nur weil seine Zone der UTC voraus- oder nachläuft.

**`timeZoneId` bleibt, wofür es gedacht war.** Zeitpunkte und Läufe, die zu einer Uhrzeit gehören —
nicht der Tagebuchtag. Die Registrierung schickt es unverändert weiter.

## Begründung

**Warum der Client und nicht der Server.** Ein Tagebuchtag ist das, was der Nutzer als seinen Tag
erlebt: was er um 23:50 einträgt, gehört auf den Tag, den seine Uhr zeigt. Käme der Tag vom Server,
hinge er an einer Zone, die am Konto gespeichert ist und nach einer Reise falsch sein kann — und
zwar still. Ein `isFuture` aus der Antwort wäre genau dieser stille Widerspruch gewesen: der Screen
hätte „Geplanter Tag" angezeigt oder verschwiegen, ohne dass die Zeile zum Datum darüber passt.

**Warum ein Feld weniger, obwohl es schon zugesichert war.** Regel 2 in
[`../regeln.md`](../regeln.md) lässt nur in den Vertrag, was ein Screen wirklich liest. Der Screen
liest das nicht mehr — er rechnet es. Ein Feld, das beide Seiten berechnen, ist eine zweite
Wahrheit; zwei Wahrheiten über denselben Tag sind schlimmer als eine, die man selbst herleitet.

**Warum keine Fehlerzusage für einen zu weit entfernten Tag.** Die Maske gibt nur Tage aus ihrer
Spanne heraus, der Server toleriert diese Spanne, und zu einer Ablehnung hätte der Screen nichts
Eigenes zu sagen. Wird sie drüben doch gebraucht, ist sie eine Interaktion und ein Satz — dann hier
nachtragen. Dieselbe Linie wie beim unzulässigen Namen in der Entscheidung von 09:07.

## Folgen

- Die offene Abstimmung aus der Entscheidung von 09:07 ist erledigt, ihr letzter Punkt in `Folgen`
  damit beantwortet. Alles andere dort bleibt gültig.
- Der erzeugte Vertrag `pacts/nutritrack-app-nutritrack-diary.json` fordert `isFuture` nicht mehr.
  Die Gegenseite darf das Feld weiter senden; gelesen wird es nicht.
- [`../../src/components/DayPickerOverlay.tsx`](../../src/components/DayPickerOverlay.tsx) holt
  „heute" jetzt aus der Naht statt aus einem eigenen `new Date()`. Damit greift kein Screen mehr
  direkt auf die Uhr zu.
- Offen bleibt allein, was bei `timeZoneId = null` gilt. Der Tagebuchtag hängt nicht mehr daran; die
  Frage betrifft nur noch Zeitpunkte und geplante Läufe und ist damit kleiner geworden.
