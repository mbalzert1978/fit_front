# Die Form der Zonenkennung steht als Matcher, die Versatz-Zone als eigene Interaktion

## Lage

[`2026-08-20-0936-zeitzone-scheitert-schnell-und-reist-wie-das-geraet-sie-nennt.md`](2026-08-20-0936-zeitzone-scheitert-schnell-und-reist-wie-das-geraet-sie-nennt.md)
hat bestellt, dass eine unbekannte Zone die Registrierung nicht scheitern lässt — aber nur in
Prosa. Das Provider-Repo liest diese Datei nicht; es liest den erzeugten Vertrag. Die Frage war,
ob sich „nicht leerer String, im Regelfall `Europe/Berlin`, im Randfall `GMT+01:00`" überhaupt in
Pact ausdrücken lässt.

## Entscheidung

**Die Form steht als Matcher am Rumpf.** `timeZoneId` in
[`../../pact/identity.pact.test.ts`](../../pact/identity.pact.test.ts) ist
`M.regex('^[A-Za-z0-9_+:/-]+$', 'Europe/Berlin')` — nicht leer, kein Leerzeichen, nichts außerhalb
dieser Zeichen. Der Matcher steht an allen drei Registrierungs-Interaktionen.

**Die Versatz-Zone steht als eigene Interaktion mit `201`.** „Registrierung mit einer Versatz-Zone"
schickt `GMT+01:00` und erwartet ein Konto. Hier steht der Wert selbst und kein Matcher: er **ist**
die Zusage.

**Sie wird über die Naht gefahren, nicht von Hand in den Rumpf geschrieben.** Der Test besetzt
`setTimeProvider` und ruft `register()`; danach `resetTimeProvider()` im `finally`.

## Begründung

**Warum ein weiter Matcher und keine enge IANA-Form.** Der erste Versuch war
`Bereich/Ort` oder `GMT±HH:MM`. Das wäre eine Zusage gewesen, die der Client nicht halten kann:
`UTC` ist eine gültige Kennung ohne Schrägstrich, und normalisieren kann er nichts — er hat keine
zweite Quelle, die es besser wüsste. Ein Vertrag, der mehr verspricht als der Absender einhält, ist
schlechter als einer, der wenig verspricht.

**Warum zusätzlich eine ganze Interaktion für einen Randfall.** Ein Matcher an einer Anfrage bindet
den Provider nicht: die Verifikation spielt den Beispielwert ein, hier also `Europe/Berlin`. Nur
eine eigene Interaktion mit `GMT+01:00` zwingt ihn, auf genau diese Kennung mit `201` zu antworten.
Das ist der einzige Weg, aus „darf nicht scheitern" eine prüfbare Zusage zu machen. Regel 3 in
[`../regeln.md`](../regeln.md) erlaubt den festen Wert genau dort, wo er selbst das Versprechen ist.

**Warum über die Naht.** Ein Rumpf, im Test von Hand zusammengesetzt, sichert zu, was jemand
hineingeschrieben hat. Über `setTimeProvider` sichert er zu, was die App wirklich schickt — dieselbe
Linie wie bei den übrigen Registrierungs-Interaktionen, die `register()` fahren statt `api()`.

## Folgen

- Was Pact hier **nicht** kann, bleibt offen und ist auch nicht zu schließen: „jede beliebige
  IANA-Zone wird angenommen" lässt sich nicht zusichern. Verifiziert wird nur, was als Beispiel im
  Vertrag steht — zwei Kennungen, nicht die Menge aller möglichen.
- Der erzeugte `pacts/nutritrack-app-nutritrack-identity.json` hat eine Interaktion mehr; der
  Zustandssatz „Keine Registrierung mit a@b.de vorhanden" trägt sie mit, ein neuer ist nicht nötig.
- Beim Schreiben des Matchers ging ein `\d` zwischen Werkzeug und Datei verloren; im Vertrag stand
  `GMT[+-]d{2}:d{2}`. Aufgefallen ist es erst am erzeugten JSON, nicht am grünen Test — der Matcher
  wurde ja nur gegen `Europe/Berlin` gefahren. Daraus die Regel für hier: **ein Matcher wird am
  erzeugten Vertrag nachgesehen, nicht am Testlauf geglaubt.** Die Zeichenklasse kommt heute ohne
  Backslash aus.
