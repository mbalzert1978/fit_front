# Der Mock-Server wählt seinen Port

## Lage

Die Vertragstests liefen auf einem festen Mock-Server-Port (8991, in `pact/mockPort.ts`). Unter
`jest --runInBand` fiel je Lauf ein bis drei Mal der jeweils erste Test einer Testdatei aus, mit
wechselnden Opfern (mal healthsync/recipes/goals, mal diary/catalog). Einzeln lief jede Suite grün.

Gemessene Ursache: der Fetch scheitert mit `ECONNRESET` bzw. `UND_ERR_SOCKET other side closed`.
Node hält seit 18.10 HTTP-Keep-Alive-Verbindungen in einem prozessweiten Pool. Der Pool lebt auf
`globalThis` und überlebt den Wechsel der Testdatei; der Mock-Server nicht, der stirbt am
Dateiende. Die erste Anfrage der nächsten Datei greift den toten Socket zum selben
`127.0.0.1:8991`.

Bekannt in pact-js: <https://github.com/pact-foundation/pact-js/issues/1066> ("Pact Consumer tests
are failing starting with node 18.10 and 19"). Zitat eines Contributors dort: "one of the breaking
changes in 19.x is that `Keep-Alive` is set to true on http connections. This is a problem on
repeated tests, as at some point you will pick up a connection that is due to be closed soon."

Die offizielle Doku (<https://docs.pact.io/implementation_guides/javascript/docs/consumer>) nennt
`port` optional: "defaults to a random machine assigned available port", und zeigt als Muster die
Injektion der Basis-URL aus dem Testlauf: "Note we configure the DogService API client
dynamically to point to the mock service Pact created for us, instead of the real one".

Kein offizielles Beispiel setzt einen Port: geprüft wurden pact-foundation/pact-js
(regression/v3/todo-consumer), pact-foundation/pact-workshop-js
(consumer/src/api.pact.spec.js) und pact-foundation/jest-pact (src/v3/index.ts). Alle drei
reichen stattdessen `mockserver.url` in den Client.

Der Kommentar in `pact/mockPort.ts` begründete den festen Port damit, dass
[`../../src/api/client.ts`](../../src/api/client.ts) die Basis-URL beim Import in eine Konstante
liest, eine spätere Zuweisung also zu spät käme. Das stimmt; der Schluss daraus war falsch, denn
Pact behandelt genau diese eingefrorene Konstante als das, was sich ändern muss.

## Entscheidung

Der Mock-Server wählt seinen Port selbst; die Basis-URL des Clients wird pro Testlauf aus dem
Mock-Server gesetzt, statt beim Import festzustehen.

## Begründung

Die naheliegende Alternative wäre gewesen, nur den Keep-Alive-Pool je Testdatei zu erneuern. Das
hätte zwei Zeilen gekostet und den Fehler zum Schweigen gebracht, aber die Ursache stehen lassen:
ein prozessweiter Zustand (der Verbindungspool) und ein prozessweiter fester Port, die einander nur
zufällig nicht in die Quere kommen. Ein zufällig vergebener Port pro Testlauf lässt gar keinen
Socket entstehen, der wiederverwendet werden könnte.

Zweitens hätte diese Abkürzung den Testlauf an `undici` als Paket gebunden, das hier nur als
indirekte Abhängigkeit liegt und niemandem zugesichert ist.

Fowler taugt hier nicht als Kronzeuge: sein Beispiel in "The Practical Test Pyramid" benutzt
selbst einen festen Port (8089). Der Unterschied liegt nicht am Port, sondern daran, dass dort
kein prozessweiter Verbindungspool zwischen den Tests steht.

## Folgen

- `pact/mockPort.ts` entfällt; `pact/setup.ts` übergibt keinen Port mehr.
- [`../../src/api/client.ts`](../../src/api/client.ts) bekommt mit `useBaseUrl(url)` eine benannte
  Naht, über die die Basis-URL gesetzt werden kann; die Prüfung, dass Klartext nur gegen
  127.0.0.1/localhost erlaubt ist, gilt unverändert auch für die gesetzte Adresse.
- Die Vertragstests rufen den Mock-Server über `against(p, ...)` aus
  [`../../pact/setup.ts`](../../pact/setup.ts) auf statt über `p.executeTest(...)`; der Helfer
  reicht die Adresse des laufenden Mock-Servers in den Client. `pact/env.ts` setzt nur noch einen
  Platzhalter, damit der Client beim Import eine gültige Adresse vorfindet.
- `--runInBand` bleibt: es schützt das Schreiben der Vertragsdatei, nicht die Verbindung. Beleg aus
  der README von pact-foundation/jest-pact: "If you have more than one file with pact tests for the
  same consumer/provider pair, you will also need to add `--runInBand` ... This avoids race
  conditions with the mock server writing to the pact file."
- Von keiner bestehenden Entscheidung wird etwas ungültig.
