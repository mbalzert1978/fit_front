# Das Produktfoto-Feld ist das Quadrat, und das Upload-Ziel wird während der Auswahl geholt

## Lage

[`2026-08-18-2000-ocr-und-produktfoto-sind-zwei-wege.md`](2026-08-18-2000-ocr-und-produktfoto-sind-zwei-wege.md)
hat festgelegt, dass das Produktfoto über eine signierte URL geht und das Upload-Ziel geholt wird,
„sobald der Nutzer das Feld öffnet". Was *das Feld öffnen* in der Oberfläche heißt, stand dort
nicht. Ein Wegwerf-Prototyp unter [`.scratch/produktanlage-prototyp.html`](../../.scratch/produktanlage-prototyp.html)
hat den ganzen Entscheidungsbaum durchklickbar gemacht; in seiner ersten Fassung war das Feld eine
eigene Zeile unter der Kopfzeile — ein Knopf „Produktfoto hinzufügen", danach ein Knopf „Bild
wählen" — **neben** dem leeren Kästchen aus `ProductHeader`. Das waren zwei Elemente für dieselbe
Sache, und das Kästchen war das einzige, auf das ein Nutzer tippen wollte. Die zweite Fassung wurde
am Prototyp abgenommen und ist ab hier verbindlich.

## Entscheidung

**Das leere Kästchen in `ProductHeader` ist das Feld.** Ein Tippen darauf öffnet die Bildauswahl.
Es gibt keinen zweiten Knopf daneben und keine eigene Zeile dafür. Ohne Bild trägt das Kästchen die
Beschriftung „Bild hinzufügen"; dass es tippbar ist, zeigt es selbst.

**Das Upload-Ziel wird geholt, während der Auswahldialog offen ist.** Nicht davor — vorher weiß
niemand, ob überhaupt ein Bild kommt — und nicht danach: die Sekunden, die der Nutzer im Dialog
verbringt, gehören dem Netz. Kommt der Nutzer mit seiner Auswahl zuerst, gilt die nächste Regel.

**Zustand des Feldes und Zustand des Ziels sind zwei Dinge.** Das Feld ist `zu`, `auswahl`,
`wartetAufZiel`, `laedt`, `fertig` oder `gescheitert`; das Ziel ist `keins`, `wirdGeholt` oder `da`.
Daraus folgen zwei Fälle, die eine einzige Zustandskette nicht abbilden kann: der Nutzer wählt
schneller, als die signierte URL eintrifft — dann steht das Feld auf `wartetAufZiel` und die Bytes
gehen von selbst los, sobald das Ziel da ist. Und er bricht die Auswahl ab — dann bleibt das
geholte Ziel gültig, und ein zweites Öffnen holt **kein** zweites.

**Der Fortschritt sitzt im Quadrat.** Es füllt sich von unten und trägt die Prozentzahl. Unter der
Kopfzeile steht nur, was einen Ausweg braucht: die laufende Übertragung mit „Abbrechen" und der
Fehlschlag mit „Erneut versuchen" / „Ohne Bild weiter".

**Ein gescheiterter Upload wird über dieselbe signierte URL wiederholt.** Das Quadrat ist dabei
selbst der Wiederholknopf. Ein Produkt ohne Bild bleibt daneben jederzeit anlegbar.

**„Übernehmen" wartet, solange Bytes unterwegs sind** — also bei `laedt` und bei `wartetAufZiel`.
Es geht in dieser Zeit kein `POST` hinaus; der Knopf wird zur Wartemeldung mit dem Ausweg „Ohne
Bild übernehmen". Das ist die Oberfläche zu der schon getroffenen Festlegung, dass das Produkt in
genau einem Aufruf entsteht.

## Begründung

**Warum das Kästchen und nicht ein Knopf.** Das Kästchen steht ohnehin da und zeigt genau das, was
das Feld füllt. Ein Knopf daneben wäre ein zweiter Weg zu demselben Element — dieselbe Sorte
Doppelung, die [`../regeln.md`](../regeln.md) für den Baukasten verbietet. Am Prototyp war es
außerdem die Stelle, auf die ohne Aufforderung getippt wurde.

**Warum das Ziel während des Dialogs geholt wird und nicht danach.** Die Auswahl dauert beim Nutzer
Sekunden, die signierte URL im Netz ebenfalls. Laufen beide nacheinander, addieren sie sich zu einer
Wartezeit, die niemand braucht; laufen sie nebeneinander, ist das Ziel meistens schon da, wenn die
Wahl feststeht. Vor dem Öffnen zu holen wäre die Alternative, aber dann stünde für jede geöffnete
Maske ein Ziel in der Welt, das nie benutzt wird.

**Warum die beiden Zustände getrennt sind.** Solange Auswahl und Ziel in einer Kette stecken, ist
der schnelle Nutzer ein Sonderfall, der irgendwo abgefangen werden muss. Getrennt ist er kein
Sonderfall mehr, sondern die Kombination `wartetAufZiel` + `wirdGeholt`, und der Start des Uploads
ist eine Regel statt einer Ausnahme.

**Warum der Fortschritt im Quadrat sitzt — und was daran nicht ideal ist.** Er gehört dorthin, wo
das Bild entsteht; ein Balken irgendwo sonst wäre ein zweiter Ort für dieselbe Aussage. Der Preis
ist bekannt: das Quadrat steht oben, der Blick beim Tippen der Nährwerte unten. Der Prototyp hat
gezeigt, dass der laufende Upload dadurch leise ist. Das wird in Kauf genommen, weil die Alternative
— ein zweiter, auffälligerer Fortschritt weiter unten — die Aufmerksamkeit von den Werten wegzieht,
die der Nutzer gerade eintippt, und weil die einzige Stelle, an der die Wartezeit wirklich weh tut,
ohnehin eigenen Text bekommt: der Knopf „Übernehmen".

## Folgen

- `ProductHeader` in [`../../app/capture/confirm.tsx`](../../app/capture/confirm.tsx): aus dem
  leeren `View` wird ein Tippziel (mindestens `theme.hit`), das die sechs Feldzustände darstellt.
  Wird die Fläche an einer zweiten Stelle gebraucht — etwa für das Profilbild —, entsteht **eine**
  Komponente in [`../../src/components/`](../../src/components/) und kein zweiter Weg daneben.
- Der Wartezustand von „Übernehmen" gehört zur Maske und nicht in den Aufruf: der `POST` startet
  erst, wenn die `photoId` feststeht oder der Nutzer auf das Bild verzichtet hat.
- Die Beschriftungen dieser Zustände sind deutsch und stehen im Screen, solange es keine
  i18n-Schicht gibt (Punkt 6 in [`../offene-punkte.md`](../offene-punkte.md)).
- Diese Datei **löst die Entscheidung vom 18.08. nicht ab.** Sie präzisiert genau einen Satz darin
  — wann und wodurch das Upload-Ziel geholt wird — und lässt alles andere dort unberührt: die
  Trennung der beiden Fotos, den Weg der Nährwerttabelle an die eigene API, den einen Aufruf am
  Ende, den `403` am Upload-Ziel.
- **Noch nicht entschieden:** wie ein bereits hochgeladenes Bild *ersetzt* wird. Im Prototyp
  entfernt ein Tippen auf das fertige Bild es, und die Auswahl muss danach neu geöffnet werden. Ob
  das so bleibt oder ein Tippen direkt die Auswahl öffnet, wird beim Bau entschieden und dann hier
  nachgetragen.
- Der Prototyp bleibt Wegwerfcode. Er liegt unter [`../../.scratch/`](../../.scratch/), wird nicht
  nach `src/` oder `app/` übernommen, verifiziert nichts und ersetzt keinen Vertrag. Was er
  festgehalten hat, steht in dieser Datei.
