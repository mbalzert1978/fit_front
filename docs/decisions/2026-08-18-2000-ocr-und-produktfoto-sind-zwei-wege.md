# OCR und Produktfoto sind zwei Wege, nicht einer

## Lage

Der Zweig `foto-upload-presigned-url` hat versucht, die fotografierte Nährwerttabelle über eine
signierte URL in einen Objektspeicher zu legen statt als `multipart/form-data` an die eigene API.
Der Zweig wird nicht übernommen, aber er hat eine Verwechslung sichtbar gemacht, die auch hier
steckt: es gibt zwei Fotos, und der Code kennt nur eines.

Die Nährwerttabelle ist Eingabe für eine Erkennung, die im Backend läuft — die Bytes müssen dorthin,
wo sie gelesen werden. Das Produktfoto ist das Gegenteil: eine Datei, die niemand liest, sondern nur
ablegt und später ausliefert. Ein Feld dafür gibt es in der Oberfläche nicht; in `ProductHeader`
steht ein leeres Kästchen. Stattdessen hängt heute die `photoId` des OCR-Auftrags als Produktfoto
am Produkt (`app/capture/confirm.tsx`).

## Entscheidung

Es gibt zwei getrennte Wege, und sie teilen sich keinen Endpunkt und keine Id.

**Die Nährwerttabelle geht an die eigene API und bleibt dort.** Die Bytes werden an den eigenen
Endpunkt übertragen, der sie im Backend an die Erkennung durchreicht; der Fortschritts-Screen fragt
den Auftrag über `GET /catalog/photos/{photoId}` ab. Das ist der heutige Weg, und er ist ab jetzt
festgelegt und nicht mehr eine Form, die man gelegentlich gegen eine andere tauscht.

**Das Produktfoto geht über eine signierte URL.** Es ist ein optionales Feld beim Anlegen eines
Produkts. Das Upload-Ziel wird geholt, sobald der Nutzer das Feld öffnet — nicht erst, wenn er
gewählt hat; die Bytes laufen in den Objektspeicher, während er die übrigen Felder ausfüllt.
Dasselbe Muster trägt jedes weitere Bild, das nur abzulegen ist, insbesondere das Profilbild des
Nutzers.

**Das Produkt entsteht in genau einem Aufruf.** „Übernehmen" schickt einen `POST` mit den
Produktdaten; die `photoId` des Produktfotos ist zu diesem Zeitpunkt bekannt und reist als Feld mit.
Es gibt keine zwei Aufrufe, die nebeneinander gelingen oder scheitern könnten.

**Das Foto der Nährwerttabelle ist nicht das Produktfoto.** Der OCR-Weg füllt die Maske; ob ein
Produktfoto daran hängt, entscheidet der Nutzer im selben Feld wie bei der Handeingabe. Ab der
ausgefüllten Maske sind beide Wege identisch.

## Begründung

**Warum die Nährwerttabelle nicht über einen Objektspeicher geht.** Eine signierte URL ist das
Muster für Dateien, die das Backend **ablegt**. Muss es sie **lesen**, schickt der Client die Bytes
an einen Dritten und braucht danach ein Protokoll, um dem Backend zu sagen, dass es sie sich dort
abholen kann. Genau daran ist der Zweig gewachsen: aus einem Aufruf wurden drei, und der dritte
existierte nur, weil die Bytes am Empfänger vorbeigelaufen waren. Mit ihm entstand ein Zustand
zwischen „Bytes liegen" und „jemand hat es bemerkt", an dem eine abgebrochene Aufnahme hängen
bleibt. Der direkte Weg hat diesen Zustand nicht.

**Warum das Produktfoto sehr wohl darüber geht.** Dort trifft das Muster: die eigene API hält keine
Bildübertragung offen, die Größenbegrenzung sitzt in der Signatur statt in einer Grenze für den
Anfragerumpf, und die Bytes gehen dorthin, wo sie liegen bleiben. Ein Bild, das nur abgelegt wird,
hat im Anwendungsserver nichts verloren.

**Warum das Upload-Ziel schon beim Öffnen des Feldes geholt wird.** Der Nutzer wählt danach noch ein
Bild und tippt danach noch Werte. Diese Zeit gehört dem Upload und nicht einer Wartezeit hinter dem
Knopf „Übernehmen".

**Warum ein Aufruf am Ende und nicht zwei nebeneinander.** Zwei Aufrufe können einzeln scheitern.
Danach steht entweder ein Produkt ohne sein Bild in der Welt oder ein Bild ohne sein Produkt, und
irgendwer muss aufräumen. Ist das Bild vorher fertig, ist der Produkt-`POST` die einzige Stelle, an
der etwas entsteht: er gelingt oder er gelingt nicht.

**Warum das OCR-Bild nicht als Produktfoto durchgereicht wird.** Ein Foto einer Nährwerttabelle ist
kein Produktbild. Es zeigt eine Rückseite im Regallicht, es wird nach der Erkennung nicht mehr
gebraucht, und es stünde sonst in jeder Produktliste. Die beiden haben verschiedene Zwecke und
verschiedene Lebensdauern; sie an eine Id zu binden, hieße, sie gemeinsam zu löschen oder gemeinsam
zu behalten.

## Folgen

- Der Zweig `foto-upload-presigned-url` wird **nicht** übernommen. Was er an Begründung erarbeitet
  hat — warum die signierten Header vom Server kommen und unverändert hinausgehen, warum der Upload
  an einen Objektspeicher `PUT` ist und nicht das formularbasierte `POST`, warum `expo-file-system`
  und nicht `fetch`, und warum ein Upload-Ziel ohne `https://` abzubrechen ist — gilt hier weiter,
  aber für das Produktfoto. Seine Entscheidungsdateien liegen nicht auf diesem Zweig; diese Datei
  löst keine ab.
- `Options.formData` in [`../../src/api/client.ts`](../../src/api/client.ts) behält seinen Aufrufer
  und bleibt.
- Der Upload des Produktfotos an den Objektspeicher geht **nicht** durch `client.ts`: fremder
  Origin, kein `Authorization`-Header, kein Umschlag, kein `problem+json`. Den Bearer-Token dorthin
  mitzuschicken wäre nicht überflüssig, sondern falsch. Er bekommt eine eigene, schmale Datei mit
  genau einem Aufrufer; [`../../CLAUDE.md`](../../CLAUDE.md) und [`../regeln.md`](../regeln.md)
  nennen sie als benannte Ausnahme zu „kein zweiter `fetch`-Weg daneben" und zu Regel 6. Wächst ein
  zweiter Endpunkt hinein, wird die Naht neu gezogen und nicht aufgeweicht.
- Der Vertrag in [`../../pact/catalog.pact.test.ts`](../../pact/catalog.pact.test.ts) bekommt eine
  Interaktion für das Upload-Ziel des Produktfotos. Was der Objektspeicher danach tut, steht in
  keinem Vertrag: er ist kein Provider dieses Repos, und ein Mock dafür wäre keine Zusage an ihn,
  sondern an uns selbst. Die Zusage endet sichtbar beim Upload-Ziel.
- **Zum Upload-Ziel gehört ein `403`.** Steht eine Id im Pfad, die der Client kennt, verlangt Regel 4
  in [`../regeln.md`](../regeln.md) die Zusage, dass eine fremde Id abgewiesen wird — sonst dürfte
  das Backend eine fremde Ressource ausliefern, ohne den Vertrag zu brechen. Dazu der Fall, dass der
  Objektspeicher nicht erreichbar ist und ein Upload-Ziel deshalb nicht ausgestellt werden kann.
- `app/capture/confirm.tsx` schickt heute fest `source: 'Ocr'`, auch wenn der Nutzer die Werte von
  Hand eingetragen hat. Das ist falsch und wird mit der Trennung der beiden Wege richtiggestellt:
  die Quelle folgt dem Weg, über den die Werte in die Maske gekommen sind.
- Das Produkt trägt die `photoId` des **Produktfotos**, nicht die des OCR-Auftrags. Ein Produkt ohne
  Bild bleibt ein vollständiges Produkt; das leere Kästchen in `ProductHeader` wird das Feld dafür.
