# TypeScript Types

> Übersetzt `python-types.md` sinngemäß. Ziel: **vollständig typisierter Code**, durchgesetzt von
> `tsc` unter `strict` ([`tsconfig.json`](../../tsconfig.json)) und im Lint von
> `typescript-eslint`. Einen zweiten Typechecker gibt es nicht.

## Annotieren, wo es etwas sagt

Jede **exportierte** Signatur ist vollständig annotiert. Für lokale Werte gilt das Umgekehrte:
annotieren nur, wenn der Typ aus der rechten Seite **nicht** offensichtlich ist — eine redundante
Annotation auf einem Literal fügt nichts hinzu.

Do:
```ts
export function checked(url: string | undefined): string {
  const base = url ?? '';                          // Typ ist evident
  const parsed: URL | null = tryParse(base);       // aus dem Aufruf nicht ersichtlich
  return parsed?.origin ?? base;
}
```

Don't:
```ts
export function checked(url) {                     // implizites any — von tsc geflaggt
  const base: string = '';                         // redundant
  return base;
}
```

## Keine Klassenhierarchie — Komposition statt Vererbung

Die Vorlage markiert Klassen mit `@final`, damit niemand versehentlich erbt. TypeScript kennt kein
`final`; das Gegenstück ist, den Fall gar nicht erst zu schaffen: Verhalten wird als Funktion
geschrieben, Daten als `type`. Eine Klasse steht nur dort, wo die Plattform sie verlangt —
`ApiError extends Error` in [`src/api/client.ts`](../../src/api/client.ts) ist der Fall, weil
`throw`/`instanceof` an `Error` hängen.

Do:
```ts
export class ApiError extends Error {
  constructor(readonly problem: ProblemDetails) {
    super(problem.title);
  }
}
```

Don't:
```ts
class BaseHandler { /* … */ }
class DiaryHandler extends BaseHandler { /* … */ }   // Basisklasse als Wiederverwendung
```

## `readonly` und `as const` für Datentypen

Datencontainer und Wertetypen sind unveränderlich: `readonly` an den Feldern, `readonly T[]` für
Listen, `as const` für Tabellen fester Werte. Eine Klasse mit Methoden nur für Typen mit echtem
Verhalten (siehe [typescript-code-organization.md](./typescript-code-organization.md)).

Do:
```ts
export const supportedLanguages = ['de', 'en'] as const;
export type Language = (typeof supportedLanguages)[number];

export type Customer = { readonly name: string; readonly email: string };
```

Don't:
```ts
export const supportedLanguages = ['de', 'en'];      // string[], jede Zuweisung erlaubt
export class Customer {
  constructor(public name: string, public email: string) {}
}
```

`as const` ist hier keine Kosmetik: es macht aus einer Liste den Typ, gegen den geprüft wird — so
entsteht `Language` in [`src/language.ts`](../../src/language.ts) aus genau einer Quelle.

## Discriminated Unions statt `enum` für Zustand

Zustände, geschlossene Wertemengen und kleine Algebren werden als **Discriminated Union** aus
Objekttypen mit einem Literal-Feld modelliert — nicht als `enum` mit separatem `status`-Feld und
nicht als „Flag-Bag" aus lauter optionalen Feldern. Der Zustand *ist* der Typ.

TypeScripts `enum` bleibt außen vor: es erzeugt Laufzeitcode, ist nominal statt strukturell und
lässt sich nicht mit `as const` aus einer Quelle ableiten. Im Repo steht heute keins — Zustände
sind String-Literal-Unions (`'Product' | 'Recipe'`, `'Curated' | 'Ocr' | 'Manual'` in
[`src/api/types.ts`](../../src/api/types.ts)).

Do:
```ts
export type SyncAction =
  | { kind: 'copy'; path: string }
  | { kind: 'update'; path: string; sizeBytes: number }
  | { kind: 'skip'; reason: SkipReason };
```

Don't:
```ts
enum SyncActionKind { Copy, Update, Skip }

type SyncAction = {
  kind: SyncActionKind;        // Status-Feld statt Typ
  reason?: string;             // optionaler Bag für variantenspezifische Daten
};
```

„Die Fälle tragen keine variantenspezifischen Daten" ist eine Falle: sobald verzweigt wird, tauchen
fast immer Pro-Variante-Felder auf (ein Grund für einen Fehlschlag, Erwartet/Ist bei einer
Abweichung). Auf ein Primitiv abbilden nur an der Protokollgrenze, über ein vollständiges `switch`
(siehe [typescript-control-flow.md](./typescript-control-flow.md)) — innen bleibt es die Union.

## Ein eigener Typ für einen eigenen Wert

Wo eine Zeichenkette eine Bedeutung trägt, bekommt sie einen eigenen Typ, damit keine beliebige
andere an ihre Stelle passt. Das Mittel ist eine Marke (branded type), gebaut zu sehen an
[`src/api/diaryDate.ts`](../../src/api/diaryDate.ts):

```ts
export type DiaryDate = string & { readonly __brand: 'DiaryDate' };
```

Damit nimmt `useDiaryDay(date: DiaryDate)` kein `'gestern'` mehr an — geprüft beim Übersetzen, nicht
zur Laufzeit. Mehr dazu in [typescript-data-access.md](./typescript-data-access.md).
