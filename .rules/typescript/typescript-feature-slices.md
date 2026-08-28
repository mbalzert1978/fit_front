# TypeScript Feature-Slice-Form

> Übersetzt `python-feature-slices.md` sinngemäß — und von allen Dateien am stärksten umgeschrieben.
> Die Vorlage beschreibt einen Server: `domain/`, `application/`, Aggregatwurzel, Handler, Pipeline.
> **Diese App hat keine Domäne** — die liegt beim Provider, und dieses Repo liest sie nicht einmal
> ([`CLAUDE.md`](../../CLAUDE.md)). Übersetzt ist deshalb die **Absicht**: eine Operation wird
> einmal geschnitten, von außen nach innen gebaut, die Naht gehört ihr, und über die Naht wandert
> nur, was zugesichert ist. Jede Stelle, an der die Vorlage von einem Baustein spricht, den es hier
> nicht gibt, ist unten benannt und begründet.

Die Abhängigkeitsrichtung ist strikt einseitig: **`app/` → `src/` → nichts**. Keine Datei unter
`src/` importiert aus `app/`; heute stimmt das für jede.

## Die Schichten einer Operation

| Ort | Inhalt | Erlaubte Abhängigkeiten |
|-----|--------|-------------------------|
| [`pact/`](../../pact/) | die zugesicherte Form: Anfrage, Antwort, Status, Header, Fehlerfälle | nur die öffentliche API-Schicht aus `src/api/` |
| [`src/api/types.ts`](../../src/api/types.ts), [`problems.ts`](../../src/api/problems.ts), [`diaryDate.ts`](../../src/api/diaryDate.ts) | die Formen und Kennungen der Naht | nichts aus `app/` |
| [`src/api/client.ts`](../../src/api/client.ts) | die **eine** Naht: Auth, Erneuerung, Fehlerform, Wiederholung, Sprache | die Formen, `src/language.ts`, `src/i18n/` |
| [`src/api/hooks.ts`](../../src/api/hooks.ts), [`queryKeys.ts`](../../src/api/queryKeys.ts) | je Operation ein benannter Hook samt Cache-Schlüssel und Entwertung | die Naht |
| [`app/**`](../../app/) | der Screen: Darstellung und Bedienung | Hooks, [`src/components/`](../../src/components/), [`src/i18n/`](../../src/i18n/), [`src/theme.ts`](../../src/theme.ts) |

Ein **Bounded Context** ist hier die Vertragsgrenze: ein Pact je Context. Welche das sind und
warum, steht in [`app/vertraege.md`](../app/vertraege.md) (Regel 1).

**Der Fehlertyp folgt dieser Grenze nicht.** Er gehört der **Operation**: jede Antwort trägt die
Kennungen ihrer eigenen erwarteten Ausgänge, nicht einen Sammeltyp über alles, was die App kennt.
Ein Sammeltyp verspricht an jeder Naht alles und zwingt jede Auswertung, Fälle zu behandeln, die
dort nie eintreten — und der `assertNever` dahinter kann „neu dazugekommen" nicht mehr von „gibt es
längst, hat nur niemand behandelt" unterscheiden
([typescript-error-handling.md](./typescript-error-handling.md)).

## Der Vertrag prüft das Ergebnis, nicht den Weg dorthin

Ein Vertragstest sichert zu, was ein Screen wirklich liest — plus das, was als **Form** vorgegeben
ist. Welche Formen das sind, steht abschließend in [`app/vertraege.md`](../app/vertraege.md)
(Regel 2) und nirgends sonst; die Aufzählung wächst nur durch eine Entscheidung unter
[`docs/decisions/`](../../docs/decisions/).

**Viele Eingabefälle sind kein Grund, tiefer zu prüfen.** Vierzig gültige und ungültige Adressen
sind Eingaben, keine neue Testebene. Ein Test gegen eine interne Funktion bindet an deren Namen und
Parameterliste und muss bei jedem Umbau mitwandern; ein Test über die öffentliche Naht sagt „diese
Eingabe wird angenommen / mit `errors.email` abgelehnt" und überlebt jede interne Umstellung.

Der Preis ist geringere Auflösung — sichtbar ist „ungültig", nicht „welche Regel gefeuert hat". Das
ist richtig so: *welche* Regel griff, ist Implementierung. Ein Test neben dem Code ist erst
gerechtfertigt, wenn ein Verhalten über keinen Vertrag erreichbar ist — so wie
[`src/i18n/i18n.test.ts`](../../src/i18n/i18n.test.ts), das eine Zusage über die Sprachschicht
prüft, die keine HTTP-Interaktion zeigen kann.

## Fremde Bibliotheken werden nicht mitgetestet

Was hinter einer Naht eine **fremde Bibliothek** entscheidet — der Schlüsselbund des Geräts, die
Sprachliste des Systems —, ist deren Zusage, nicht unsere Fachregel. Ein Test, der dafür die echte
Bibliothek verdrahtet, prüft fremden Code und bricht bei deren nächstem Release.

Deshalb ersetzt [`jest.config.js`](../../jest.config.js) genau zwei Module durch Doppel:
`expo-secure-store` und `expo-localization` aus [`pact/stubs/`](../../pact/stubs/). Ein Doppel sagt
ehrlich, was es nicht kann, statt das Verhalten der Bibliothek nachzubauen — ein nachgebautes
prüfte die Zusage gegen sich selbst.

## Über die Naht wandert nur, was zugesichert ist

Primitive leben an der **Naht**: in den Nutzlasten aus [`src/api/types.ts`](../../src/api/types.ts)
und in der URL. Innen bekommt ein Wert mit Bedeutung seinen eigenen Typ, damit kein beliebiger
anderer an seine Stelle passt.

Do:
```ts
export const useDiaryDay = (date: DiaryDate) => /* … */;
```

Don't:
```ts
export const useDiaryDay = (date: string) => /* … */;   // 'gestern' passt genauso
```

Das ist das Gegenstück zur Regel „die Domäne spricht nur Wertetypen" der Vorlage. Die
**Identität** ist dabei ein geprüfter Typ und kein freier `string`: sie entsteht über `parse` und
nicht über einen Cast an der Aufrufstelle
([typescript-error-handling.md](./typescript-error-handling.md)).

> **Abweichung: keine Aggregatwurzel, keine Entität.** Beides setzt eine Domäne mit Identität und
> Lebenszyklus voraus; die liegt beim Provider. Was hier bleibt, ist die Frage dahinter — wem
> gehört eine Operation? Die Antwort steht im nächsten Abschnitt.

## Die Operation gehört dem Hook, nicht dem Screen

Ein Hook besitzt seine Operation: den Pfad, den Cache-Schlüssel, die Bedingung, das Nachfragen und
die Entwertung danach. Der Screen ruft ihn und stellt dar. Das ist die bewusste Ausnahme von der
Zustand/Verhalten-Trennung aus
[typescript-code-organization.md](./typescript-code-organization.md).

Do:
```ts
export const useProduct = (id: string) =>
  useQuery({ queryKey: qk.product(id), queryFn: () => api<Product>(`/catalog/products/${pathSegment(id)}`), enabled: !!id });
```

Don't:
```ts
// im Screen
const [product, setProduct] = useState<Product | null>(null);
useEffect(() => {
  void api<Product>(`/catalog/products/${id}`).then(setProduct);   // Operation im Screen, kein Cache, keine Entwertung
}, [id]);
```

Ergebnisse einer Operation sind **geschlossene Unions**, nie ein `boolean` neben einem optionalen
Wert. Eine Operation, die zwei Fragen in einem Flag beantwortet, ist zwei Operationen.

## Die Naht gehört der Operation — kein Sammel-Gateway

Zwei Operationen, die zufällig dieselbe Quelle brauchen, bekommen **zwei eigene Zusagen**, nie einen
geteilten Universal-Zugriff. Ein geteiltes Gateway koppelt aneinander, was einander nichts angeht,
und wächst zwangsläufig zur Sammelschnittstelle.

Drei Regeln für jede Naht:

1. **Nur was diese Operation wirklich liest** — nicht, was die Quelle anbietet. Felder ohne
   Verwendung gehören nicht in den Vertrag, sonst blockiert jede harmlose Änderung drüben
   ([`app/vertraege.md`](../app/vertraege.md), Regel 2).
2. **Über die Naht wandern nur Primitive und die zugesicherten Formen.** Kein interner Typ, keine
   Anzeigeform, kein Zustand des Screens.
3. **Der Vertrag ist eine Bestellung, keine Abbildung.** Was ein Screen braucht, steht im Vertrag —
   auch wenn das Backend es heute nicht anbietet. Es gibt keine Spezifikation daneben, an der er
   sich zu messen hätte ([`app/vertraege.md`](../app/vertraege.md), Regel 8).

### Eine Frage, die nur die Gegenseite beantworten kann, wird nicht vorab gestellt

Der vierte, leicht zu übersehende Fehler ist eine Naht mit einem **Prüfschritt vor dem
Schreibschritt** — erst „ist diese Adresse frei?", dann anlegen. Die Auskunft des ersten Aufrufs
kann im Moment ihrer Beantwortung schon veraltet sein: dazwischen passt jeder nebenläufige Vorgang.
Der zweite Schritt **macht das Wettrennen erst auf**, das er verhindern soll.

Wo eine Bedingung von der Gegenseite **durchgesetzt** wird, fragt die App sie nicht vorher, sondern
liest ihr Urteil aus dem Ergebnis der eigentlichen Operation — die vergebene Adresse kommt als
Fehlerfall der Registrierung zurück, der doppelte Versuch stirbt am `Idempotency-Key`. Eine
vorgelagerte Abfrage ist nur legitim, wenn sie etwas beantwortet, das sich währenddessen nicht
ändern kann.

## Naht, Operation und Darstellung sind verschiedene Dinge

Die Rollen werden **nie** in einer Datei vermischt.

| Rolle | Was sie ist | Was sie NICHT tut |
|-------|-------------|-------------------|
| **Naht** (`client.ts`) | trägt Auth, Erneuerung, Fehlerform, Sprache und Wiederholung; packt den Umschlag aus | kennt keinen Screen, keine Anzeigeform, keinen Satz |
| **Operation** (ein Hook) | Orchestrierung: Pfad, Cache-Schlüssel, Bedingung, Entwertung | kein `try`/`catch`, keine Darstellung, kein Layout |
| **Mapper** (`withEtag` und Geschwister) | übersetzt Nutzlast → Anzeigeform, 1:1, ohne Seiteneffekt | keine Fachentscheidung, kein Aufruf |
| **Screen** (`app/**`) | Darstellung und Bedienung | kein `fetch`, kein Cache-Schlüssel, keine Farbe, kein Satz |

Damit kreuzt **keine Anzeigeform** die Naht und **kein Transportwissen** den Screen:

```text
Screen ─► Hook ─► Naht (client.ts) ─► HTTP
Screen ◄─ Anzeigeform ◄─ Mapper ◄─ Nutzlast ◄─ Naht
```

### Ein Mapper pro Richtung, nicht einer pro Operation

Hinein und heraus sind zwei Funktionen. Sie teilen weder Zustand noch Hilfsmittel; sie stehen nur
zufällig an derselben Naht. Kein Mapper bedient mehrere Operationen — auch dann nicht, wenn zwei
heute dieselbe Form haben; die Antwort gehört der Operation, und identische Form heißt nicht
identische Bedeutung.

## Querschnittliches ist eine Schicht, kein `if` im Screen

Die Vorlage steckt den Kern in eine Kette von Behaviors, damit Validierung, Transaktionsklammer und
Messung je einen Ort haben statt „ein Absatz mehr". **Hier ist diese Kette die Naht selbst:**
`Authorization`, die vorausschauende Erneuerung, die Wiederholung nur bei wiederholbaren Verfahren,
`Accept-Language` an jeder Anfrage und die Fehlerform sitzen in
[`src/api/client.ts`](../../src/api/client.ts) — an **einer** Stelle, für **jede** Anfrage
([`app/http-schicht.md`](../app/http-schicht.md)).

Zwei Zusagen folgen daraus, und beide sind zu halten:

- **Ein Fehlerkanal.** Ein Screen hat genau eine Stelle, die aus einem Fehler macht, was zu sehen
  ist — nicht einen Zweig für Feldfehler und einen zweiten für alles andere. Zwei Kanäle erzwingen
  zwei Auswertungen in dieselbe Anzeige; die zweite sieht dann nur, was die erste übrig ließ, und
  muss trotzdem alles behandeln.
- **Kein zweiter Weg daneben.** Wer eine Anfrage an der Naht vorbei schickt, umgeht alle fünf
  Zusagen auf einmal.

## Die Prüfbarkeit ist Teil der Auslieferung, nicht des Testordners

Die App wird an ihren **äußersten** Nähten austauschbar gemacht und nirgendwo sonst:
`useBaseUrl(...)` in der Naht, `setTimeProvider(...)` in [`src/time.ts`](../../src/time.ts),
`setLanguageProvider(...)` in [`src/language.ts`](../../src/language.ts). Nichts dazwischen wird
ersetzt. Die gemeinsamen Bausteine der Verträge stehen in
[`pact/setup.ts`](../../pact/setup.ts) — `pact(...)`, `against(...)`, `jsonHeadersIn`,
`authHeadersIn` — und werden dort benutzt statt daneben nachgebaut.

| Phase | Läuft über |
|-------|------------|
| **Arrange** | `given(...)` — ein Zustand, den das Backend herstellen kann; deutsch, kurz, ohne Ids |
| **Act** | die **echte** Funktion aus `src/api/` gegen den Mock-Server |
| **Assert** | die **echte** Antwortform samt Status und Headern |

> **Abweichung: keine Test-API je Use Case.** Die Vorlage liefert je Use Case eine Bedienoberfläche
> mit In-Memory-Fakes aus, weil ihr Slice ohne Infrastruktur vollständig sein muss. Hier ist die
> Infrastruktur die Gegenseite, und ihr Doppel ist der Pact-Mock-Server — er **ist** die Test-API
> und wird nicht zusätzlich nachgebaut. Die Stubs unter `pact/stubs/` decken den Rest.

## Baureihenfolge: die Vertragsform zuerst, der Screen zuletzt

Eine Operation wird **von außen nach innen** entworfen:

1. **Der Vertragsausschnitt** unter [`pact/`](../../pact/) — Anfrage, Antwort, Status, Header,
   Fehlerfälle. Die Antwortform steht damit fest, bevor etwas dahinter existiert.
2. **Die Formen** in `src/api/types.ts` und die Kennungen in `src/api/problems.ts`.
3. **Die Operation** als Hook samt Cache-Schlüssel.
4. **Der Screen** mit Komponenten aus dem Baukasten, Sätzen aus `src/i18n/` und Werten aus
   `src/theme.ts`.

Wer den Screen baut, bevor die Vertragsform feststeht, rät — und rät an einer Stelle, an der er
selbst entscheiden dürfte. Umgekehrt gilt: neuer Endpunkt in einem Screen ⇒ neuer Vertragstest im
**selben Commit**, kein `fetch` ohne Vertrag ([`app/vertraege.md`](../app/vertraege.md), Regel 6).

## Keine Ausnahme als Kontrollfluss — auch nicht in der Naht

Gilt unverändert: gefangen wird nur in der IO-Naht, deren Vertrag den Fehlschlag erklärt; Hooks,
Mapper und Screens fangen nie ([typescript-error-handling.md](./typescript-error-handling.md)).

## Unmögliche Zustände unmöglich machen

Ergebnisse als geschlossene Union statt `boolean` plus optionalem Wert, statt „leer plus Meldung"
oder einer Ausnahme für einen erwarteten Fall ([typescript-types.md](./typescript-types.md)). Der
deklarative Stil gilt auch in einem Screen
([typescript-control-flow.md](./typescript-control-flow.md)).

## Review-Checkliste

- [ ] Die Richtung stimmt: `app/` hängt an `src/`, `src/` nie an `app/`.
- [ ] **Ein Pact je Bounded Context**; der Fehlertyp gehört der Operation, nicht dem Context.
- [ ] **Die Naht gehört der Operation**: eigene, schmale Zusage statt Sammel-Gateway; nur was dieser Screen liest, plus die vorgegebene Form.
- [ ] **Kein `fetch` neben `src/api/client.ts`** und kein Cache-Schlüssel neben `src/api/queryKeys.ts`.
- [ ] **Keine vorgelagerte Prüfung, wo die Gegenseite die Bedingung durchsetzt** — kein „ist das frei?" vor dem Schreiben.
- [ ] Innen stehen eigene Typen (`DiaryDate`, Kennungen), Primitive nur an der Naht und in der URL — fremde Werte kodiert (`pathSegment`).
- [ ] Die Operation gehört dem Hook: Pfad, Schlüssel, Bedingung, Entwertung. Der Screen ruft und stellt dar.
- [ ] **Querschnittliches sitzt in der Naht**, nicht als Absatz im Screen; **ein** Fehlerkanal, **eine** Stelle, die daraus Anzeige macht.
- [ ] **Mapper je Richtung eine eigene Funktion**, keiner für mehrere Operationen.
- [ ] Kein `try`/`catch` in Hook, Mapper oder Screen; erwartete Fehlschläge sind Fälle im Vertrag.
- [ ] **Baureihenfolge eingehalten**: Vertrag → Formen → Hook → Screen; neuer Endpunkt und neuer Vertragstest im selben Commit.
- [ ] Verträge prüfen die Antwortform, nicht den inneren Weg; ein Test neben dem Code nur, wo kein Vertrag hinreicht.
- [ ] Nur die äußersten Nähte werden ausgetauscht (`useBaseUrl`, `setTimeProvider`, `setLanguageProvider`); nichts dazwischen wird ersetzt.
- [ ] Ergebnisse als geschlossene Union; kein `boolean` plus optionaler Wert für einen Zustand.
- [ ] Kein Satz, keine Farbe und kein Maß im Screen — `src/i18n/` und `src/theme.ts` sind die Orte ([`app/beschriftungen.md`](../app/beschriftungen.md), [`app/farben-und-masse.md`](../app/farben-und-masse.md)).
