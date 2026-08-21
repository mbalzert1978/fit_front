# Foto-Upload über presigned URL

## Lage

Die fotografierte Nährwerttabelle ging bisher als `multipart/form-data` an die eigene API
(`POST /catalog/photos`), die die Bytes entgegennahm, ablegte und die OCR anstieß. Dafür trug
`src/api/client.ts` ein Feld `Options.formData` mit genau einem Aufrufer, und der Vertrag in
`pact/catalog.pact.test.ts` eine `withRequestMultipartFileUpload`-Interaktion.

Zwischen zwei Mustern war zu wählen: Multipart an die eigene API, oder ein kurzlebiges Upload-Ziel
holen und die Bytes direkt in den Objektspeicher legen. Die Wahl ist getroffen und steht nicht mehr
offen.

## Entscheidung

Der Foto-Upload läuft in drei Schritten. Alle Schritte gegen die eigene API sind `PUT` auf eine
Adresse, die der Client bereits kennt, weil er die `photoId` selbst erzeugt:

1. `PUT /api/v1/catalog/photos/{photoId}` mit `{ contentType, byteSize, barcode? }`
   → `201` (neu) bzw. `200` (erneut) mit `{ photoId, uploadUrl, uploadHeaders, expiresIn }`.
2. `PUT` der Bytes an `uploadUrl` — fremder Origin, ohne `Authorization`, ohne Umschlag.
3. `PUT /api/v1/catalog/photos/{photoId}/upload` ohne Rumpf → `202 { photoId, status: 'Processing' }`.
   Erst diese Meldung stößt die OCR an.

Ab Schritt 3 läuft das bestehende Polling über `GET /catalog/photos/{photoId}` unverändert weiter.
Schritt 2 geht durch `src/api/signedUpload.ts` und nicht durch `src/api/client.ts`.
`Options.formData` entfällt ersatzlos; es gibt keinen `multipart`-Weg mehr in diesem Repo.

## Begründung

**Warum presigned URL.** Die Bytes gehen dorthin, wo sie liegen bleiben, statt einen Rundlauf durch
die eigene API zu nehmen, die sie nur weiterreicht. Der Anwendungsserver hält damit keine
Bildübertragung offen, und die Größenbegrenzung sitzt in der Signatur statt in einer Grenze für den
Anfragerumpf.

**Warum der `PUT` nicht durch `client.ts` läuft.** `CLAUDE.md` verlangt „kein zweiter `fetch`-Weg
daneben". Diese Regel meint den Zugang zur **eigenen** API, und dort gilt sie unverändert:
`client.ts` bleibt der einzige Weg dorthin. Ein signierter Upload an einen fremden Origin ist
kategorisch etwas anderes. Nichts, was `client.ts` tut, ist dort richtig — Basis-URL, `data`/`meta`,
`problem+json` und die Erneuerung nach 401 gelten für den Objektspeicher nicht, und der
`Authorization`-Header wäre nicht bloß überflüssig, sondern falsch: er ginge an einen Dritten.
`client.ts` um einen Modus zu erweitern, der der Reihe nach all seine Eigenschaften abschaltet,
hätte die Regel dem Buchstaben nach erfüllt und ihren Zweck verfehlt.

`signedUpload.ts` ist deshalb bewusst schmal: eine exportierte Funktion, ein Aufrufer
(`src/api/photoUpload.ts`), kein Zugriff auf die Sitzung. Was sie nicht sein darf, steht in ihrem
Kopfkommentar — wächst ein zweiter Endpunkt hinein, wird die Naht neu gezogen und nicht aufgeweicht.

**Warum `PUT` statt `POST` mit `Idempotency-Key`.** Das ist die Stelle, an der die naheliegende Form
nicht funktioniert, und zwar aus dem Mechanismus selbst heraus: ein `Idempotency-Key` heißt, dass
ein zweiter Aufruf mit demselben Schlüssel die **gespeicherte erste** Antwort erneut ausliefert,
statt die Wirkung zu wiederholen. Genau dafür ist er da. Und genau das ist hier schädlich:
wiederholt wird Schritt 1 ausschließlich dann, wenn die Signatur abgelaufen ist — und der Schlüssel
gäbe dann folgsam die abgelaufene `uploadUrl` zurück. Er würde den einzigen Fall verhindern, für den
die Wiederholung existiert.

`PUT` auf eine Adresse, die der Client kennt, löst das ohne Zusatzmechanik: der Aufruf bedeutet
„dieses Foto, dieser Zustand" und darf beliebig oft dasselbe bedeuten, jedes Mal mit frischer
Signatur. Damit ist zugleich alles erfüllt, was `docs/regeln.md` unter „HTTP-Schicht" verlangt: alle
drei Aufrufe stehen in der Menge, die nach einem 401 ohne weitere Vorkehrung wiederholt wird. Ein
`Idempotency-Key` steht an keinem von ihnen, und `docs/regeln.md` Regel 2 verlangt ihn auch nicht —
keiner ist ein nicht wiederholbarer Schreibaufruf.

**Warum `uploadHeaders` vom Server kommt und der Client sie nicht selbst baut.** Ein Objektspeicher
signiert einen Teil der Header mit; weicht auch nur einer ab, antwortet er mit einer
Signaturabweichung statt mit einem Hinweis, was fehlt. Welche Header das sind, weiß nur die Stelle,
die signiert hat. Der Client gibt sie deshalb unverändert zurück, statt `Content-Type` selbst zu
setzen und zu hoffen.

**Warum es kein `uploadMethod` gibt.** Naheliegend wäre, den Server die Methode nennen zu lassen.
Der Client kann sie aber nicht allgemein befolgen: `FileSystem.uploadAsync` kennt `POST`, `PUT` und
`PATCH`, und die formularbasierte POST-Policy der Objektspeicher ist kein Binärupload, sondern ein
eigenes Verfahren mit eigenem Rumpf. Eine Angabe, die der Client nur für einen Wert einlösen kann,
ist keine Flexibilität, sondern ein Loch im Vertrag. `PUT` steht deshalb fest; alle gängigen
Objektspeicher können es.

**Warum `expo-file-system` und nicht `fetch`.** `fetch` kennt in React Native keinen Rumpf aus einem
`file://`-URI. Die Bytes müssten erst als Base64 durch den JS-Speicher, nur um danach verworfen zu
werden. `FileSystem.uploadAsync` mit `uploadType: BINARY_CONTENT` streamt die Datei nativ und lässt
zugleich zu, die signierten Header exakt zu setzen. Das Paket lag bereits als transitive Abhängigkeit
in `node_modules`; es steht jetzt ausdrücklich in `package.json`, weil es direkt importiert wird.

**Wo die Vertragszusage endet.** Verträge gelten zwischen diesem Consumer und dem Provider
`nutritrack-catalog`. Der Objektspeicher ist kein Provider dieses Repos — nichts, was über ihn im
Vertrag stünde, würde je verifiziert. Zugesichert sind deshalb Schritt 1 und Schritt 3; Schritt 2
steht in keinem Vertrag. Das ist keine Lücke, die ein Mock-Provider schließt: der wäre kein Vertrag,
sondern eine Zusage an uns selbst. Die Zusage endet sichtbar bei `uploadUrl` und `uploadHeaders` —
dass der Objektspeicher die Bytes dann annimmt, sichert dieser Vertrag nicht zu. Ein Kommentar im
Vertragstest sagt das an Ort und Stelle.

**Sicherheit.** Die Upload-URL trägt ihre Autorisierung in sich und ist damit ein Geheimnis auf
Zeit. Daraus folgt clientseitig: `signedUpload.ts` bricht ab, wenn `uploadUrl` nicht mit `https://`
beginnt — ein Foto der Nährwerttabelle geht nicht im Klartext hinaus, auch nicht, wenn die eigene
API eine `http`-Adresse nennt. Ein `SignedUploadError` ist das ausdrücklich **nicht**: ein frisches
Ziel von derselben Quelle wäre genauso falsch, und die Wiederholung darf hier nicht greifen. Die
Sitzung berührt dieser Weg nicht; er liest sie nicht einmal.

Was der Server beim Signieren tut, kann kein Vertrag zusichern — es steht weder in der Anfrage noch
in der Antwort, sondern in der Signatur. Als Bestellung im Klartext gehört es trotzdem hierher:
kurze Laufzeit, Signatur auf genau ein Objekt und genau die `photoId` des anfragenden Nutzers,
`contentType` und Größe mitsigniert. `byteSize` geht in Schritt 1 mit, damit ein zu großes Bild
abgelehnt werden kann, **bevor** die Bytes fließen — im Multipart-Weg fiel das erst nach der
Übertragung auf.

## Folgen

- **Diese Datei hat keinen Abschnitt `Abweichung zur Backend-Spezifikation`, und das ist Absicht.**
  Maßgeblich ist der Vertrag unter [`../../pacts/`](../../pacts/); er beschreibt den Ablauf nicht,
  er legt ihn fest. Die Interaktion `Nährwerttabelle hochladen` ist darin durch die drei neuen
  ersetzt, und damit ist der Multipart-Upload nicht „abweichend", sondern weg. Was der Provider
  einlöst, entscheidet sich bei seiner Verifikation, nicht an einem Dokument daneben.
- Ob Schritt 3 nötig ist oder der Objektspeicher die Verarbeitung per Event auslöst, ist damit
  ebenfalls entschieden: der Vertrag kennt Schritt 3, also gibt es ihn. Ein Client, der nach dem
  `PUT` direkt ins Polling ginge, wüsste sonst nie, ob überhaupt jemand die Bytes bemerkt hat.
- `src/api/signedUpload.ts` und `src/api/photoUpload.ts` sind neu. `signedUpload.ts` ist der einzige
  HTTP-Weg neben `client.ts` und bleibt es; ein weiterer Aufrufer ist ein Anlass, diese Entscheidung
  abzulösen, nicht die Datei zu erweitern.
- `Options.formData` und der zugehörige Zweig in `src/api/client.ts` sind entfernt. Es gibt keinen
  `multipart`-Weg mehr; `endpoints.photoUpload` ist dazugekommen.
- `pact/fixtures/naehrwerttabelle.jpg` ist entfernt, weil der einzige Test, der sie las, ersetzt
  wurde. Die Zeile `*.jpg binary` in `.gitattributes` zeigte danach ins Leere und ist mit entfernt.
  Der Rest von `.gitattributes` bleibt unberührt.
- `expo-file-system` steht jetzt ausdrücklich in `package.json`.
- `app/capture/photo.tsx` fängt einen gescheiterten Upload ab und zeigt den Hinweis, den der
  Fortschritts-Screen schon benutzt. Das ist die einzige Änderung an der Oberfläche und folgt aus
  dem Ablauf: aus einem Aufruf sind drei geworden, von denen jeder für sich scheitern kann; ohne
  diesen Zweig stünde der Nutzer vor einer wieder freigegebenen Kamera, die nichts dazu sagt.
- **Der Fortschrittsbalken bleibt geschätzt.** `FileSystem.createUploadTask` liefert echten
  Upload-Fortschritt (`totalBytesSent`), und der neue Ablauf hätte damit erstmals eine belastbare
  Zahl. Das umzustellen ist nicht beauftragt und wird nicht nebenbei mitgemacht; es steht als
  Issue #31.
- Issue #2 (Karte: Offline-Warteschlange) hält jetzt fest, an welcher Stufe eine unterbrochene
  Aufnahme wieder ansetzt.
- Von `2026-08-18-1200-data-meta-umschlag-und-oauth-benennung.md` und
  `2026-08-18-1600-auth-und-fehlerfaelle-sind-vertragsvorgabe.md` bleibt alles stehen. Der Umschlag
  gilt für Schritt 1 und Schritt 3 unverändert; Schritt 2 fällt nicht darunter, weil er nicht an die
  eigene API geht.
