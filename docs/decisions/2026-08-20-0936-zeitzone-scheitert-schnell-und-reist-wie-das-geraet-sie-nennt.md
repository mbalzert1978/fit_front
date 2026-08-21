# Die Zeitzone scheitert schnell — und reist so, wie das Gerät sie nennt

## Lage

[`2026-08-20-0925-kalendertag-ist-reine-client-sache.md`](2026-08-20-0925-kalendertag-ist-reine-client-sache.md)
ließ einen Punkt offen: was gilt, wenn `timeZoneId` als `null` bei der Gegenseite ankommt. Die Frage
davor war, wann das überhaupt eintritt. Nachgesehen an der Quelle:

- **iOS** liefert `Locale.current.calendar.timeZone.identifier`, **Android**
  `Calendar.getInstance().timeZone.id` — beides über `expo-localization`, beides immer besetzt.
- **Web** kann dort `null` liefern; dafür greift der Rückfall `Intl.DateTimeFormat()
  .resolvedOptions().timeZone`, der im Browser immer antwortet.

`null` verlangt also, dass das native Modul **und** `Intl` gleichzeitig schweigen. Das ist kein
Nutzerfall, sondern ein kaputter Build.

## Entscheidung

**Ohne Zone gibt es keine Registrierung.** `timeZoneId()` in
[`../../src/time.ts`](../../src/time.ts) wirft, statt `null` zurückzugeben; der Typ ist `string`.
Der Fehler fällt dort an, wo der Wert gebraucht wird — in `register()` —, nicht beim Start der App.

**Die Kennung reist unverändert, so wie das Gerät sie nennt.** Der Regelfall ist eine IANA-Kennung
in der Form `Bereich/Ort` (`Europe/Berlin`, `America/Argentina/Buenos_Aires`). Daneben ist auf
Android eine Versatz-Kennung möglich (`GMT+01:00`), wenn das System keine benannte Zone auflösen
kann. Der Client normalisiert nichts: er weiß es nicht besser als das Gerät.

**Bestellt wird: eine unbekannte Zone lässt die Registrierung nicht scheitern.** Kann die Gegenseite
mit der Kennung nichts anfangen, entsteht das Konto trotzdem und sie setzt ihren eigenen Vorgabewert.
Ein eigener Fehlerfall dafür wird **nicht** bestellt.

## Begründung

**Warum werfen und nicht `null` senden.** `null` hätte die Gegenseite gezwungen, eine Regel für
einen Fall zu erfinden, der nicht eintreten kann — und jedes Konto, das so entsteht, trüge still
eine Zone, die niemand gewählt hat. Ein Fehler an dieser Stelle ist laut, und laut ist genau richtig
für einen Build, dem eine Plattformfähigkeit fehlt.

**Warum beim Gebrauch und nicht beim Start.** Ein Abbruch beim Start nähme einem längst
angemeldeten Nutzer das Tagebuch weg, obwohl der Wert dort nichts entscheidet — seit 09:25 ist der
Kalendertag reine Client-Sache. Betroffen ist allein, wer ein Konto anlegt, und genau dort schlägt
es fehl.

**Warum keine Prüfung auf die Form der Kennung.** Eine Ablehnung von `GMT+01:00` im Client hätte
keinen zweiten Wert zur Hand — es gibt nur diese eine Quelle. Sie würde also eine Registrierung
verhindern, um eine Zone zu schützen, die für Zeitpunkte durchaus taugt und nur bei der Sommerzeit
ungenau ist. Der Nutzer kann für sein System nichts; die Gegenseite kann den Wert einordnen oder
verwerfen.

**Warum kein Fehlerfall im Vertrag.** Regel 2 in [`../regeln.md`](../regeln.md): zugesichert wird,
was ein Screen liest. Die Registrierungsmaske hätte zu „unbekannte Zeitzone" nichts zu sagen, das
der Nutzer beheben könnte. Deshalb ist die Bestellung das Gegenteil eines Fehlerfalls — sie verlangt,
dass es keinen gibt.

## Folgen

- Diese Datei **löst genau einen Punkt** der Entscheidung von 09:07 ab: „Ist die Zone nicht zu
  ermitteln, geht `null` hinaus." Alles andere dort bleibt gültig, die Begründung gegen ein
  erfundenes `UTC` erst recht.
- Die letzte offene Frage aus 09:25 ist damit beantwortet und keine Rückfrage mehr, sondern eine
  Bestellung: unbekannte Zone → Konto entsteht trotzdem.
- Neu offen und in [`../offene-punkte.md`](../offene-punkte.md) als Punkt 12 aufgenommen: die Zone
  wird genau einmal gestellt und kann veralten.
