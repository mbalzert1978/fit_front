# TypeScript Null Safety

> Übersetzt `python-null-safety.md` sinngemäß. „Null Safety" heißt hier: `null` und `undefined` sind
> immer explizit im Typ sichtbar. Das erzwingt `strict` in
> [`tsconfig.json`](../../tsconfig.json) — `strictNullChecks` ist darin enthalten.

## Guards nur an exportierten Grenzen, nicht in modulinternen Funktionen

Prüfe nur an exportierten Einstiegspunkten. Modulinterne Funktionen (nicht exportiert) setzen
gültigen, bereits geprüften Zustand voraus — kein redundanter Guard dort.

Do:
```ts
export function checked(url: string | undefined): string {          // exportierte Grenze
  if (!url) throw new Error('EXPO_PUBLIC_API_URL fehlt (.env)');
  return normalize(url);
}

function normalize(url: string): string {                            // kein zweiter Guard
  return url.endsWith('/') ? url.slice(0, -1) : url;
}
```

Don't:
```ts
function normalize(url: string | undefined): string {
  if (!url) throw new Error('url must not be empty');   // redundant, modulintern
  return url;
}
```

**Abgrenzung: was ein Guard wirft, ist ein Programmierfehler — keine Nutzereingabe.** Er sichert
eine *interne* Grenze gegen einen Aufrufer im selben Code ab; sein `throw` sagt „diese Vorbedingung
ist gebrochen", und die Meldung ist **Diagnose**, die nie auf den Schirm des Nutzers kommt
([typescript-error-handling.md](./typescript-error-handling.md), Abschnitt „Abgrenzung").

Ein Wert, der von außen über die **Systemgrenze** kommt — eine Antwort des Servers, ein
Deep-Link-Parameter, ein gescannter Barcode, ein Feld aus dem Formular —, wird **nicht** so
behandelt: dort ist ungültig ein erwarteter Ausgang, kein Bug. Er endet als typisierter Fall im
Ergebnis, nie als geworfene Ausnahme und nie als fertiger Satz
([typescript-rule-pattern.md](./typescript-rule-pattern.md)).

## Fehlermeldungen benennen das Gemeinte

TypeScript hat kein `nameof`. Der Name in der Meldung ist ein Literal — halte Signatur und Meldung
im selben Funktionskörper, damit eine Umbenennung beim nächsten Edit sofort auffällt, statt in
getrennten Dateien zu verwaisen.

Do:
```ts
throw new Error('EXPO_PUBLIC_API_URL muss https sein (Klartext nur gegen 127.0.0.1/localhost)');
```

Don't:
```ts
throw new Error('value must not be null');   // sagt nicht, welcher Wert
```

## Explizite Nullbarkeit — und `null` ist nicht `undefined`

Fehlende Werte immer explizit annotieren. Für die Einengung an nicht-trivialen Stellen ein
**Typprädikat** (`x is T`) einsetzen statt einer Kette von Zusicherungen ohne Typaussage.

Do:
```ts
const isSupported = (code: string | null | undefined): code is Language =>
  !!code && (supportedLanguages as readonly string[]).includes(code);

let chosen: Language | null = null;
```

Don't:
```ts
let chosen = null;                        // Typ null, jede spätere Zuweisung ein Fehler
const value = data as Product;            // Behauptung statt Prüfung
```

**Die beiden Leerwerte sind nicht dasselbe, und die Naht entscheidet welcher.** In diesem Repo
folgt die Bedeutung dem Vertrag: `null` ist der Wert, den der Server **nennt** (`brand: string |
null` in [`src/api/types.ts`](../../src/api/types.ts) — „es gibt keine Marke"), `undefined` ist das
Feld, das **fehlt** (`saltG?: number | null` — „nicht angegeben"). Wer beides vermischt, verliert
genau diesen Unterschied; deshalb steht in [`src/api/hooks.ts`](../../src/api/hooks.ts) auch
`?? undefined` und nicht `?? null`.

## `as` ist keine Prüfung

Ein Cast auf eine Nutzlast von außen prüft nichts, er schaltet die Prüfung ab. Fehlt der Umschlag,
ist die Antwort **falsch** und nicht leer — so steht es in
[`app/http-schicht.md`](../app/http-schicht.md) und so verhält sich
[`src/api/client.ts`](../../src/api/client.ts).

Erlaubt bleibt der Cast dort, wo er eine **Marke** setzt, die zur Laufzeit nichts ist und deren
Bedingung unmittelbar davor geprüft wurde:

```ts
export function parseDiaryDate(s: string): DiaryDate {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new Error(`Kein Kalendertag: ${s}`);
  return s as DiaryDate;
}
```

Das ist die eine Stelle, an der die Marke entsteht — und der Grund, warum sie überall sonst nicht
mehr behauptet werden muss.
