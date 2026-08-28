# TypeScript Control Flow

> Übersetzt `python-control-flow.md` sinngemäß. Wo die Vorlage `match`/`case` sagt, steht hier
> `switch` über das Unterscheidungsfeld einer Discriminated Union — dasselbe Werkzeug, eine Stufe
> gröber: TypeScript kennt keine Muster über verschachtelte Felder, also übernimmt die Einengung
> das Unterscheidungsfeld und die Bedingung ein Guard davor.

## `switch` über die Union statt `if`/`else if`-Ketten

Bevorzuge ein `switch` über das Unterscheidungsfeld gegenüber langen `if`/`else if`-Ketten. Es ist
kompakter, und der Compiler prüft mit.

**Die Regel gilt für zwei Formen, nicht nur für eine.** Die zweite ist die häufigere und wird leicht
übersehen, weil die Überschrift nur die erste nennt: eine von Hand geschriebene Struktur-Prüfung aus
verschachtelten `if` plus `typeof`/`in`/`instanceof` plus Feldvergleich. Genau dafür ist die Union
da — die Form steht im Feld, die Bedingung im Guard.

Do:
```ts
function discountOf(customer: Customer): number {
  switch (customer.tier) {
    case 'premium':
      return 0.2;
    case 'regular':
      return customer.orderCount > 10 ? 0.1 : 0;
    default:
      return assertNever(customer.tier);
  }
}
```

Don't:
```ts
function discountOf(customer: Customer): number {
  if (customer.tier === 'premium') return 0.2;
  if (customer.orderCount > 10) return 0.1;
  return 0;
}
```

### Die zweite Form: verschachtelte Typprüfungen

Don't:
```ts
if (error instanceof ApiError) {
  if (error.problem && typeof error.problem === 'object' && 'errors' in error.problem) {
    let hasEmail = false;
    for (const field of Object.keys(error.problem.errors ?? {})) {
      if (field === 'email') hasEmail = true;
    }
    if (!hasEmail) return null;
  }
}
```

Do:
```ts
const emailErrors = (error: unknown): readonly string[] =>
  error instanceof ApiError ? (error.errors?.email ?? []) : [];
```

Zwei `typeof`, ein `in`, eine Flag-Schleife und drei Ebenen werden ein Ausdruck. Der Zugriff
beschreibt die **Form**, die optionale Verkettung übernimmt das Fehlen.

## Sammeln als Ausdruck, nicht als Akkumulator

Ein leeres Array, eine Schleife mit `.push()`, danach `if (list.length)` — das ist dieselbe
Handarbeit wie eine Typprüfungskette, nur für Daten statt für Verzweigungen.

Der Abschnitt „Literale statt Aufbau per Schleife" weiter unten deckt diesen Fall **nicht** ab: er
gilt nur, wenn die Werte im Voraus bekannt sind. Gerade wenn sie es nicht sind, gehört das Sammeln
in `map`/`filter`/`flatMap`/`reduce`.

Don't:
```ts
const lines: string[] = [];
for (const slot of day.slots) {
  for (const entry of slot.entries) {
    if (entry.grams > 0) lines.push(`${entry.displayName}: ${entry.grams}`);
  }
}
if (lines.length) {
  let msg = '';
  for (const line of lines) msg += `  ${line}\n`;
  throw new Error(msg);
}
```

Do:
```ts
const lines = day.slots.flatMap((slot) =>
  slot.entries.filter((entry) => entry.grams > 0).map(describe),
);
```

Drei Dinge fallen weg: das veränderliche Array, die zweite Schleife für die Meldung und die
Wiederholung des Ganzen an der nächsten Stelle. Wie eine Zeile aussieht, weiß `describe` — an genau
einer Stelle.

## Vollständige Verzweigung über geschlossene Unions

Für ein `switch` über eine geschlossene Menge von Varianten immer einen werfenden Abschluss
`default: return assertNever(x)` — nie ein stilles `default: break`, das den unbekannten Fall
verschluckt. Die volle Regel steht in
[typescript-error-handling.md](./typescript-error-handling.md) („Jede Verzweigung ist vollständig")
und gilt dort wie hier, ohne Ausnahme.

**Hier ist die Zusage stärker als in der Vorlage.** Python prüft Vollständigkeit ohne Typechecker
gar nicht; `tsc` rechnet sie aus: im `default` ist der Wert `never`, sobald alle Fälle behandelt
sind, und eine neue Variante bricht `./make.ps1 typecheck` — beim Übersetzen, nicht erst im
Betrieb. Der werfende Arm bleibt trotzdem stehen: er ist der Schutz gegen Werte, die von **außen**
kommen und dem Typ nur laut Zusage entsprechen.

Bekannte Fälle werden aufgezählt (eigene `case`-Zeilen oder mehrere `case` übereinander), damit
`default` wirklich nur echte neue Varianten fängt — nie als Sammelbecken für Fälle, die man sich
nicht extra aufgeschrieben hat.

Do:
```ts
switch (job.status) {
  case 'Processing':
    return waiting();
  case 'Failed':
    return failed(job.reason);
  case 'Done':
    return done(job.result);
  default:
    return assertNever(job);
}
```

Don't:
```ts
switch (job.status) {
  case 'Done':
    return done(job.result);
  default:
    return null;   // verschluckt Failed UND jede zukünftige Variante
}
```

## `at`/`slice` statt Indexrechnung

Do:
```ts
const last = items.at(-1);
const firstThree = items.slice(0, 3);
```

Don't:
```ts
const last = items[items.length - 1];
const firstThree = items.filter((_, i) => i < 3);
```

`at(-1)` liefert `T | undefined` und zwingt damit zur Entscheidung, was ein leeres Array bedeutet —
`items[items.length - 1]` behauptet unter `strict` einen Wert, den es nicht gibt.

## Literale statt Aufbau per Schleife

Wenn die Werte im Voraus bekannt sind, direkt als Literal schreiben statt Schritt für Schritt per
`.push()` aufzubauen.

Do:
```ts
const LEGACY_KEYS = ['accessToken', 'refreshToken'] as const;
```

Don't:
```ts
const legacyKeys: string[] = [];
legacyKeys.push('accessToken');
legacyKeys.push('refreshToken');
```
