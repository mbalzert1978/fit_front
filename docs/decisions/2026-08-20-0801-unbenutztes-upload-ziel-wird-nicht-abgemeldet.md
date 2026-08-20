# Ein unbenutztes Upload-Ziel wird nicht abgemeldet

## Lage

Seit [`2026-08-19-0813-produktfoto-feld-ist-das-quadrat.md`](2026-08-19-0813-produktfoto-feld-ist-das-quadrat.md)
holt die App das Upload-Ziel für das Produktfoto, während der Auswahldialog offen ist. Damit
entsteht regelmäßig ein Ziel, aus dem nichts wird: der Nutzer bricht die Auswahl ab, er legt das
Produkt ohne Bild an, oder der `PUT` in den Objektspeicher scheitert am Netz. Offen war, ob die App
das dem Backend melden muss.

## Entscheidung

**Die App meldet ein unbenutztes Upload-Ziel nicht ab.** Es gibt keinen Aufruf, der ein Ziel
zurückgibt, freigibt oder für ungültig erklärt — weder nach einem Abbruch der Auswahl noch nach
einem gescheiterten Upload noch beim Verlassen der Maske. Ein ausgestelltes Ziel läuft von selbst
ab.

**Die einzige Pflicht des Clients bleibt die schon festgelegte:** eine `photoId`, deren Upload nicht
fertig ist, reist nicht im Produkt-`POST` mit. Damit kann kein Produkt entstehen, das auf ein Bild
zeigt, das nicht liegt.

**Scheitert die Wiederholung, weil die Signatur abgelaufen ist, holt die App genau einmal ein neues
Ziel** und lädt dorthin. Die alte `photoId` wird dadurch zu Müll und nicht etwa zurückgegeben. Ein
zweiter Fehlschlag führt nicht zu einem dritten Ziel, sondern zu „ohne Bild weiter".

## Begründung

**Eine Abmeldung wäre der dritte Aufruf.** Genau den hat
[`2026-08-18-2000-ocr-und-produktfoto-sind-zwei-wege.md`](2026-08-18-2000-ocr-und-produktfoto-sind-zwei-wege.md)
am OCR-Weg verworfen, und das Argument gilt hier wörtlich: mit ihm entsteht ein Zustand zwischen
„Ziel ausgestellt" und „jemand hat gemerkt, dass nichts daraus wird", an dem eine abgebrochene
Aufnahme hängen bleibt.

**Sie käme ausgerechnet dann nicht an, wenn man sie bräuchte.** Netzfehler, weggewischte App, leerer
Akku — das sind die Fälle, in denen aufgeräumt werden müsste, und in genau diesen Fällen geht auch
die Abmeldung nicht hinaus. Das Aufräumen muss serverseitig also ohne den Client funktionieren.
Tut es das, ist der Aufruf ein zweiter Weg für etwas, das der erste bereits vollständig erledigt.

**Was liegen bleibt, ist billig.** Wird das Ziel nie benutzt, liegt nichts im Objektspeicher, nur
eine Signatur, die abläuft. Bricht der Upload mittendrin ab, liegt ein Objekt, auf das nichts zeigt.
Das teure Ungleichgewicht wäre das umgekehrte — ein Produkt, das auf ein fehlendes Bild zeigt —, und
das ist durch die Pflicht des Clients und die Prüfung beim Anlegen ausgeschlossen. Ein Bild ohne
Produkt kostet Speicher, keine Richtigkeit.

**Warum die abgelaufene Signatur trotzdem ein neues Ziel bekommt.** Das ist keine Abmeldung, sondern
eine neue Bestellung. Der Unterschied ist der Zeitpunkt: das neue Ziel wird geholt, weil gleich
Bytes dorthin gehen, nicht um einen alten Zustand aufzuräumen.

## Folgen

- Der Vertrag in [`../../pact/catalog.pact.test.ts`](../../pact/catalog.pact.test.ts) bekommt für
  das Upload-Ziel **keine** Interaktion zum Freigeben oder Abmelden. Er trägt heute nur die
  Nährwerttabelle; die Interaktionen für das Produktfoto — Ausstellen des Ziels, `403` für eine
  fremde Id, kein Ziel ausstellbar — stehen aus der Entscheidung vom 18.08. noch aus und bleiben
  auf diese drei beschränkt.
- Mitbestellt werden drei Zusagen des Backends. In
  [`../../../fit_back/docs/Draft/BACKEND.md`](../../../fit_back/docs/Draft/BACKEND.md) gibt es das
  Upload-Ziel für das Produktfoto heute überhaupt nicht — dort steht nur die Nährwerttabelle
  (`NutritionPhoto`). Nach Regel 8 in [`../regeln.md`](../regeln.md) ist das kein Widerspruch,
  sondern eine Bestellung; abgestimmt wird sie trotzdem, statt sie hier als gegeben zu behandeln:
  1. Ein nicht benutztes Upload-Ziel läuft von selbst ab und braucht keine Abmeldung.
  2. Ein Objekt, auf das nach einer Frist kein Produkt zeigt, wird serverseitig entfernt.
  3. Der Produkt-`POST` weist eine `photoId` ab, die dem Nutzer nicht gehört oder zu der keine Bytes
     liegen. Diese Prüfung ersetzt das Vertrauen darauf, dass der Client sich an seine Pflicht hält.
- Die Wiederholung mit abgelaufener Signatur ist ein Zustand der Maske: nach dem zweiten Fehlschlag
  bietet das Quadrat nur noch „ohne Bild weiter" an. Ein drittes Ziel wird nicht geholt.
- Diese Datei löst keine ab. Sie beantwortet eine Frage, die
  [`2026-08-19-0813-produktfoto-feld-ist-das-quadrat.md`](2026-08-19-0813-produktfoto-feld-ist-das-quadrat.md)
  offen gelassen hat, und lässt alles andere dort unberührt.
