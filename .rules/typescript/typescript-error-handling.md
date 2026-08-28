# TypeScript Error Handling

> Übersetzt `python-error-handling.md` sinngemäß. Eine Abweichung gilt für die ganze Datei und
> steht deshalb vorn: **dieses Repo hat keinen `Result`-Typ und bekommt hier keinen erfunden.** An
> der HTTP-Naht ist der Fehlerkanal die abgelehnte Promise — `ApiError` und `OfflineError` aus
> [`src/api/client.ts`](../../src/api/client.ts) —, weil TanStack Query genau darauf gebaut ist:
> `isError` und `error` eines Hooks kommen aus dem `reject`, nicht aus einem Rückgabewert. Diese
> Naht ist die begründete Ausnahme. Überall sonst gilt die Regel der Vorlage unverändert: ein
> erwarteter Fehlschlag ist ein **Wert**, kein `throw`.

## Rückgabe statt Ausnahme für erwartete Fälle

Nutze `undefined`, optionale Verkettung und `??` für Operationen, deren „Nicht-Erfolg" ein normales
Ergebnis ist. Ausnahmen bleiben für wirklich Unerwartetes reserviert.

Do:
```ts
const entry = entries.find((e) => e.id === id);
if (entry) process(entry);

const etag = response.headers.get('ETag') ?? undefined;
```

Don't:
```ts
try {
  process(byId(entries, id));   // wirft bei fehlendem Eintrag
} catch {
  // erwarteter Fall — find() wäre die richtige Wahl
}
```

## Ein erwarteter Fehlschlag ist ein Fall, kein `throw`

Don't:
```ts
async function loadProduct(id: string): Promise<Product> {
  const found = await repository.find(id);
  if (!found) throw new NotFoundError(id);   // erwarteter Fall — jeder Aufrufer müsste fangen
  return found;
}
```

Do:
```ts
type ProductLookup = { kind: 'found'; product: Product } | { kind: 'missing'; id: string };

async function loadProduct(id: string): Promise<ProductLookup> {
  const found = await repository.find(id);
  return found ? { kind: 'found', product: found } : { kind: 'missing', id };
}
```

## Eine Form für „Wert oder Fehlschlag" — eigene Unions für echte Algebren

Jeder Ausgang der Form „Erfolg mit einem Wert, oder Fehlschlag mit einer Nutzlast" bekommt
**dieselbe** Form, nicht jedes Mal eine neue:

```ts
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
```

Das deckt das Prüfen eines Eingabewerts ebenso ab wie „gefunden oder mit der nicht getroffenen
Anfrage fehlgeschlagen" — der Fehlerfall trägt die Anfrage als typisierte Daten, nicht als Text. Es
gilt **nicht** für einen Ausgang mit mehr als zwei, unabhängig geformten *Erfolgs*fällen (eine
echte Algebra) — das bleibt eine eigene Union, wie jede andere geschlossene Wertemenge
([typescript-types.md](./typescript-types.md)).

Zwei Regeln dazu:

- **Einmal definiert, nicht je Stelle neu.** Eine zweite Zwei-Fall-Union mit `ok`/`error` unter
  anderem Namen ist eine Kopie, keine Wiederverwendung.
- **Ausgepackt wird an einer Stelle je Aufruf, nicht an jeder.** Die Vorlage nennt das den
  Eliminator: eine Funktion nimmt je einen Arm für beide Ausgänge und liefert einen Wert. In
  TypeScript ist das ein `switch` über `ok` in genau *einer* Funktion — nicht ein `if (!r.ok)` an
  jeder Fundstelle.

```ts
const fold = <T, E, R>(r: Result<T, E>, onOk: (value: T) => R, onError: (error: E) => R): R =>
  r.ok ? onOk(r.value) : onError(r.error);
```

## Die Fehlernutzlast ist ein typisierter Fall, nie ein fertiger Satz

Das `E` sagt, **was** der Fall ist — nicht, **wie er heißt**. Jeder Fehlschlag, dessen Formulierung
je einen Menschen erreichen kann, ist ein eigener Fall mit typisierter Nutzlast, zusammengefasst zu
einer geschlossenen Union. Ein `string` als `E` ist an dieser Stelle ein Regelverstoß.

Do:
```ts
type PasswordError =
  | { kind: 'tooShort'; actualLength: number; minimum: number }
  | { kind: 'noDigit' };
```

Don't:
```ts
// Die Sprache ist damit dort entschieden, wo niemand weiß, wer fragt —
// und das Minimum ist aus dem Satz nicht mehr herauszuholen.
type PasswordError = string;
```

Vier Dinge hängen daran, und in dieser App sind sie keine Theorie:

1. **Die Sprache wird spät entschieden.** Der Text entsteht dort, wo bekannt ist, wer liest — in
   [`src/i18n/`](../../src/i18n/) über `useTexts()`, oder er kommt fertig vom Server, der ihn an
   `Accept-Language` festgemacht hat ([`app/beschriftungen.md`](../app/beschriftungen.md)).
   Ein Fehlerwert, der einen Satz trägt, ist einsprachig, egal welcher Sprachschalter davorsteht.
2. **Die Vollständigkeit wird bewacht.** Das `switch` ohne Auffangzweig, das den Fall formuliert,
   meldet beim nächsten neuen Fall, dass die Meldung dafür fehlt
   ([typescript-control-flow.md](./typescript-control-flow.md)). Über Zeichenketten kann das
   niemand prüfen.
3. **Die Nutzlast überlebt bis zur Formulierung.** Das Minimum einer Textvorlage wird aus dem
   Fehlerwert gefüllt, nicht aus einem Satz rekonstruiert. Deutsch und Englisch dürfen die Zahl
   verschieden platzieren, ohne dass der Fehlerwert davon weiß.
4. **Der Fall wird der stabile Vertrag.** Genau so ist es an der Naht gebaut: die Kennungen in
   [`src/api/problems.ts`](../../src/api/problems.ts) sind der Fehlercode, `title` und `detail`
   sind Kosmetik darüber. Ein umformulierter Satz ist damit keine Vertragsänderung
   ([`app/vertraege.md`](../app/vertraege.md), Regel 3).

Die Nutzlast trägt genau das, was die Formulierung braucht — nichts, das niemand liest, und nichts,
das nach außen nie preisgegeben werden darf.

**Abgrenzung.** Ein `string` bleibt richtig, wo die Zeichenkette **Diagnose** ist und nie zu einer
Nutzermeldung wird: die Meldung eines geworfenen `Error` in der Naht, ein Log-Text, der Grund eines
Infrastruktur-Fehlschlags. Faustregel: erreicht die Formulierung je einen Bildschirm, ist sie ein
typisierter Fall.

**Und was der Server sagt, wird nicht übersetzt.** `title`, `detail` und jeder Satz in `errors`
kommen in der Sprache der Anfrage und gehen unverändert auf den Schirm
([`app/beschriftungen.md`](../app/beschriftungen.md)). Dort einen eigenen Satz danebenzustellen wäre die
zweite Quelle, die diese Regel gerade verhindert.

## Jede Verzweigung ist vollständig — der Abschluss wirft

**Ein `switch` über eine geschlossene Union endet nie offen.** Der letzte Zweig fängt entweder einen
echten Restfall ab oder wirft; fehlt beides, ist das ein Fehler, kein Stil.

Der Abschluss ist ein `assertNever`:

```ts
export function assertNever(value: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(value)}`);
}
```

Er trägt doppelt: `tsc` meldet einen nicht behandelten Fall **beim Übersetzen**, weil der Wert im
`default` dann nicht `never` ist; und zur Laufzeit wirft er mit dem unerwarteten Wert in der
Meldung. Ein `default: return null` kann keines von beidem.

**Damit `tsc` die Zusage einlösen kann, wird flach über das Unterscheidungsfeld verzweigt** — nie
verschachtelt. Ein `switch` über `ok` mit einem zweiten `switch` darin kostet zwei `assertNever` je
Funktion und eine Einrückungsebene, ohne mehr zuzusichern: der Eliminator packt den Fehlerwert aus,
der Arm verzweigt flach darüber.

**Immer `assertNever`, auch wo der Rest nicht streng `never` ist.** Es gibt Fälle, die typmäßig
gültig sind und trotzdem nie ankommen, weil eine Stufe davor sie ausschließt. Eine eigene, sprechend
benannte Ausnahme dafür ist dieselbe Mechanik unter anderem Namen und kauft nur eine Sonderregel
ein, die jedes Review erst auseinanderhalten muss. Ein Zweig, eine Form, keine Abwägung an der
Schreibstelle.

**Auch bei fremden Fallmengen — keine Ausnahme.** Naheliegender Einwand: verzweigt der Code über
eine Menge aus **fremder Hand** — die `type`-Kennungen des Servers, ein Statuscode —, sei ein neuer
Fall doch eine Änderung drüben und kein Programmierfehler; ein freundlicher Auffangzweig sei besser
als ein Absturz. Der Einwand trägt nicht: eine Änderung, die niemand adressiert hat, ist ebenso ein
Bruch, und der freundliche Zweig federt den Fehler nicht ab, er verdeckt ihn — er zeigt dem Nutzer
einen Satz zu einem Fall, den niemand geprüft hat.

**Der Einwand, der richtig bleibt:** ein Wurf trifft den Nutzer, nicht die Abnahme. Deshalb gehört
zu einer fremden Fallmenge eine Prüfung davor — und die gibt es hier bereits: die Kennungen stehen
an genau einer Stelle ([`src/api/problems.ts`](../../src/api/problems.ts)), und die Vertragstests
unter [`pact/`](../../pact/) lesen sie von dort, statt sie ein zweites Mal hinzuschreiben
([`app/vertraege.md`](../app/vertraege.md), Regel 3). Der Vertrag **misst** damit die Fallmenge,
statt sie zu behaupten; `assertNever` ist die letzte Instanz dahinter, nicht die erste.

> Die Vorlage sichert das zusätzlich mit einem Test ab, der den Quelltext liest. Hier tut das
> `tsc --noEmit` in `./make.ps1 typecheck` für jede geschlossene Union — ein eigener Suchlauf würde
> nur wiederholen, was der Compiler ohnehin meldet, und wird deshalb nicht gebaut.

## Zwei Wege in einen Wert: fallibles `parse`, infallibles `hydrate`

Ein Wertetyp, dessen Gültigkeit nicht schon aus seinem Typ folgt, bekommt **zwei** Erzeugungswege —
nie nur einen:

- **`parse(raw)`** — der fallible Einstieg für einen Wert, der tatsächlich fehlerhaft sein könnte:
  Formulareingabe, Deep-Link-Parameter, Barcode, Antwortfeld. Alles, was eine Vertrauensgrenze
  überquert.
- **`hydrate(raw)`** — die infallible Rekonstruktion für einen Wert, dessen Form bereits
  bekannt-gültig ist, weil ein `parse` früher in derselben Kette gelaufen ist oder die Quelle
  vertrauenswürdig ist. `hydrate` prüft **nicht neu**, sondern ruft `parse` und wirft im
  unmöglichen Fall.

Ein Fehlschlag in `hydrate` ist ein Programmierfehler, nie ein erwarteter Ausgang — genau deshalb
wirft es.

Do:
```ts
export const parseBarcode = (raw: string): Result<Barcode, BarcodeError> =>
  /^\d{8,14}$/.test(raw)
    ? { ok: true, value: raw as Barcode }
    : { ok: false, error: { kind: 'malformed', raw } };

export function hydrateBarcode(raw: string): Barcode {
  const parsed = parseBarcode(raw);
  if (!parsed.ok) throw new Error(`unreachable: ${raw} was validated upstream`);
  return parsed.value;
}
```

Don't:
```ts
export function hydrateBarcode(raw: string): Barcode {
  if (!/^\d{8,14}$/.test(raw)) throw new Error('unreachable');   // Prüfung neu implementiert
  return raw as Barcode;
}
```

## Nur an der IO-Naht fangen — sonst laut scheitern

`try`/`catch` lebt an genau einer Stelle: in der Naht zur Außenwelt, deren Vertrag „das kann
fehlschlagen" erklärt. In dieser App ist das [`src/api/client.ts`](../../src/api/client.ts) — dort
wird der Netzfehler zu `OfflineError` und die Fehlerantwort zu `ApiError`. Überall sonst — Hooks,
Screens, Komponenten — wird nie gefangen; ein Hook liest `isError` und `error`, ein Screen zeigt,
was dort steht.

Do:
```ts
// client.ts — die eine Naht
try {
  response = await fetch(url, init);
} catch {
  throw new OfflineError();          // erwarteter Ausgang, benannt
}
```

Don't:
```ts
// im Screen
try {
  await save();
} catch (e) {
  setError(String(e));               // verschluckt jeden unerwarteten Fehler als Anzeigetext
}
```

Ist eine Naht **nicht** als fehlbar erklärt, wird nicht gefangen — sie darf werfen. Einen
unerwarteten Fehler als normalen Fehlschlag zu maskieren versteckt Bugs.
