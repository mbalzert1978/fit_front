# TypeScript Factories

> Übersetzt `python-factories.md` sinngemäß. Die Vorlage schützt den rohen Konstruktor über
> Konvention, weil Python kein `private` kennt. Hier ist der Schutz stärker und einfacher: was eine
> Datei nicht exportiert, gibt es außerhalb nicht — das Modul **ist** die Grenze.

## Fachlich benannte Erzeugungsfunktionen statt generischer Konstruktion

Werte und Zustände entstehen über eine **Funktion mit fachlichem Namen** — nie über `new()`,
`create()` oder `build()`. Der rohe Aufbau bleibt in der Datei und wird nicht exportiert; die
Funktion ist der einzige vorgesehene Weg und hält die Zusicherung an einer Stelle.

Do:
```ts
// diaryDate.ts
export function toDiaryDate(day: Date): DiaryDate;
export function parseDiaryDate(raw: string): DiaryDate;
export const today = () => toDiaryDate(time.now());
```

Don't:
```ts
// an der Aufrufstelle zusammengebaut, an der Zusicherung vorbei
const date = format(new Date(), 'yyyy-MM-dd') as DiaryDate;
```

Der Cast im zweiten Beispiel ist der ganze Befund: die Marke behauptet eine Prüfung, die hier nie
gelaufen ist. Wo sie läuft, steht in
[typescript-error-handling.md](./typescript-error-handling.md) („`parse` und `hydrate`").

## Eigene Mapper-Funktionen für alles, was nicht der Wert selbst ist

Konstruktionslogik, die nicht zum Typ selbst gehört — das Zusammenlegen einer Antwort mit einem
Header, das Übersetzen einer Nutzlast in eine Anzeigeform —, lebt als eigene Funktion **neben** dem
Typ, nicht als Methode darauf. Der Typ bleibt eine Datenform; der Mapper liegt dort, wo die fremde
Form herkommt.

Do:
```ts
// hooks.ts — die Naht kennt den Header, der Typ nicht
const withEtag = (r: ApiResponse<Recipe>): Recipe => ({ ...r.data, etag: r.headers.get('ETag') ?? undefined });
```

Don't:
```ts
type Recipe = {
  /* … */
  static fromResponse(r: ApiResponse<Recipe>): Recipe;   // Transportwissen im Datentyp
};
```

## Eine Funktion als einziger Verdrahtungspunkt

Für Zusammenbau eine dedizierte Funktion nutzen, auch wenn sie nur ein einzelnes Objekt baut. Sie
ist die eine Stelle, die bei einer Änderung angepasst wird. Eine solche Funktion nicht als „dünner
Wrapper ohne Wert" markieren — das Zentralisieren **ist** der Wert
([`../common/patterns.md`](../common/patterns.md), Anti-Corruption Layer).

Genau das leisten im Repo `qk` in [`src/api/queryKeys.ts`](../../src/api/queryKeys.ts) (jeder
Cache-Schlüssel), `endpoints` in [`src/api/client.ts`](../../src/api/client.ts) (jeder Pfad),
`problems` in [`src/api/problems.ts`](../../src/api/problems.ts) (jede Fehlerkennung) und
`useIdempotencyKey` in [`src/api/idempotency.ts`](../../src/api/idempotency.ts) (jeder Schlüssel
einer Schreibanfrage). Vier Sammelstellen, vier Themen — und keine davon wird an einer Aufrufstelle
nachgebaut.

Hier wird auch das Protokollieren verdrahtet — als Hülle um den Kern, nie als Feld darin
([typescript-dependencies.md](./typescript-dependencies.md)).

Do:
```ts
const key = useIdempotencyKey();
await register(body, key(body));
```

Don't:
```ts
await register(body, newId());   // an jeder Aufrufstelle neu — zwei Versuche, zwei Konten
```

Der Unterschied ist hier kein Stil: der Schlüssel hängt am **Rumpf**, nicht am Tastendruck
(`docs/decisions/2026-08-21-1104-der-schluessel-haengt-am-ganzen-rumpf.md`). Wer ihn an der
Aufrufstelle erzeugt, hat diese Regel gebrochen, ohne es zu sehen.
