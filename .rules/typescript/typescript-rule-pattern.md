# TypeScript Rule Pattern

> Übersetzt `python-rule-pattern.md` sinngemäß. Die Vorlage belegt jede Form mit gebautem Code aus
> ihrem Repo. **Hier gibt es diesen Code nicht**, und er wird nicht erfunden: die feldweise
> Begründung kommt heute vom Server als `errors` aus `problem+json`
> ([`app/vertraege.md`](../app/vertraege.md), Regel 4), und der Screen zeigt sie. Was unten steht,
> ist deshalb die **Form, die eine Prüfung hier anzunehmen hat**, sobald eine entsteht — vor dem
> Absenden eines Formulars, beim Lesen eines Deep-Links, beim Prüfen eines gescannten Werts.

Zwei Bausteine decken jede „ist diese Eingabe gültig?"-Frage ab. Beide sind das **Rule Pattern**
(eine Regel ist eine Funktion mit fester Signatur, kein Ad-hoc-`if`); sie unterscheiden sich in der
Fehlerform und darin, wie sie zusammengesetzt werden.

## Zwei Varianten, gewählt nach Fehlerform — nicht nach Gewohnheit

| | Collect-all Rule | Fail-fast Result Rule |
|---|---|---|
| Fehlerform | viele unabhängige Feldfehler, gemeinsam gemeldet | genau ein typisierter Fehler |
| Signatur | `(value: T) => FieldError[]` | `(value: T) => Result<T, E>` |
| Komposition | `allOf(...rules)` — wertet **alle** aus und sammelt alle Befunde | `chain(...rules)` — wertet die nächste nur nach Erfolg aus; der erste Fehler gewinnt |
| Typischer Ort | Formatprüfung an der Eingabegrenze | eine Bedingung, die den Vorgang ganz abbricht |
| Auswertung je Regel | einmal pro Aufruf | genau einmal — das Ergebnis trägt den Fehler schon |

Do — Collect-all:
```ts
export type FieldError = { field: string; code: string; params: Record<string, string | number> };
export type Rule<T> = (value: T) => FieldError[];

export const allOf =
  <T>(...rules: Rule<T>[]): Rule<T> =>
  (value) => rules.flatMap((rule) => rule(value));

const emailRequired: Rule<RegisterForm> = (form) =>
  form.email ? [] : [{ field: 'email', code: 'required', params: {} }];

const passwordRequired: Rule<RegisterForm> = (form) =>
  form.password ? [] : [{ field: 'password', code: 'required', params: {} }];

export const registerRules = allOf(emailRequired, passwordRequired);
// meldet beide leeren Pflichtfelder auf einmal — nicht nur das erste.
```

**Eine Regel meldet einen Code, nie einen fertigen Satz.** `string[]` wäre hier falsch: der Text
hängt an der geltenden Sprache und entsteht in [`src/i18n/`](../../src/i18n/) über `useTexts()`,
während `FieldError` trägt, was sprachunabhängig ist — Feld, Code, Parameter
([typescript-error-handling.md](./typescript-error-handling.md), „Die Fehlernutzlast ist ein
typisierter Fall"). Dieselbe Trennung hält der Server ein: er schickt den Satz in der Sprache der
Anfrage, und die App zeigt ihn unverändert, statt einen zweiten daneben zu bauen.

**Und eine Regel beantwortet ihre Frage selbst.** Delegiert sie an ein `parse`, gehört die
Fallunterscheidung über dessen Fehler-Union **in die Regel** — nicht in einen generischen Helfer,
dem man den passenden Konverter hereinreicht. Ein solcher Helfer muss seine Signatur über alle
Fehlertypen spannen, die er bedient, und wird dabei erst weit (`unknown`) und dann unwahr. Der Preis
der ausgeschriebenen Arme ist Länge; der Preis des Helfers ist eine Annotation, die nicht mehr
stimmt.

Do — Fail-fast mit einem typisierten Fehler:
```ts
export type ResultRule<T, E> = (value: T) => Result<T, E>;

export const chain =
  <T, E>(...rules: ResultRule<T, E>[]): ResultRule<T, E> =>
  (value) => rules.reduce<Result<T, E>>((acc, rule) => (acc.ok ? rule(acc.value) : acc), { ok: true, value });
```

Das `E` gehört der Prüfung: die Union der Ausgänge **dieser einen** Frage, kein Sammeltyp über
alles, was die App kennt ([typescript-feature-slices.md](./typescript-feature-slices.md)).

### Don't: Collect-all auf einen Fail-fast-Fall zwingen

```ts
const allTrue = <T>(...checks: ((v: T) => boolean)[]) => (v: T) => checks.every((c) => c(v));

if (!allTrue(oldValueMatches, targetIsFree)(input)) {
  if (!oldValueMatches(input)) return err('oldValue');   // zweite Auswertung — Geruch
  return err('target');
}
```

Muss eine Regel nach einem Fehlschlag ein zweites Mal laufen, nur um herauszufinden, *welche*
fehlgeschlagen ist, wurde die falsche Komposition gewählt. `chain` existiert genau deshalb: das
Ergebnis trägt den einen aufgetretenen Fehler bereits in sich.

### Don't: Ein zweites, gleich geformtes Regel-Interface daneben

```ts
type CheckRule<T> = { isSatisfied(value: T): boolean; messages(value: T): FieldError[] };
```

Braucht eine Stelle „etwas, das entscheidet und begründet", ist das `Rule`/`ResultRule` aus dem
gemeinsamen Modul — nicht ein strukturell gleicher Typ unter anderem Namen. Echte Wiederverwendung
heißt, dass der Code vom gemeinsamen Typ abhängt, nicht dass er ihm ähnelt.

## Strukturelle Typisierung ersetzt Varianz-Annotationen

Andere Sprachen brauchen eine Markierung, damit eine Regel für mehrere Eingabetypen taugt.
TypeScript braucht das nicht: eine Regel, die gegen einen **schmalen** Typ geschrieben ist — nur die
Felder, die sie wirklich liest —, passt auf jeden Wert, der diese Felder hat.

```ts
type HasEmail = { email: string };
const emailRequired = <T extends HasEmail>(value: T): FieldError[] => /* … */;
```

Nur einsetzen, wenn zwei *verschiedene* Eingaben wirklich dieselbe Frage über dieselben Felder
stellen (Anmeldung und Registrierung über dieselbe Adresse) — nicht, um Unverwandtes in ein
gemeinsames Regelwerk zu zwingen.

## Eine Regel darf warten

Manche Fragen sind ohne Aufruf nicht zu beantworten. Als synchrone `Rule<T>` sind sie nicht
formulierbar und wandern sonst in den Screen, wo sie niemand mehr als Regel wiederfindet. Dafür
steht dieselbe Form mit Wartezeit:

```ts
export type AsyncRule<T> = (value: T) => Promise<FieldError[]>;

export const allOfAsync =
  <T>(...rules: AsyncRule<T>[]): AsyncRule<T> =>
  async (value) => (await Promise.all(rules.map((rule) => rule(value)))).flat();

export const asAsync = <T>(rule: Rule<T>): AsyncRule<T> => async (value) => rule(value);
```

Zwei Dinge daran sind Regel, nicht Geschmack:

- **Eine synchrone Regel wird gehoben, nicht `async` umgeschrieben.** `asAsync` macht sie
  anschlussfähig; sie ohne Aufruf als `async` zu schreiben ist eine Zusage, die sie nicht einlöst.
- **Kein selbstgebautes Abbruch-Flag daneben.** Der Abbruch reist als `AbortSignal`
  ([typescript-async.md](./typescript-async.md)).

## ODER: `anyOf`, wenn ein Wert in mehr als einer Form gültig ist

`chain` kann nur UND. Ist ein Wert in mehreren, einander ausschließenden Formen gültig — eine
Zeitzone ist eine IANA-Kennung **oder** ein fester Versatz —, ist der Kombinator `anyOf`: der erste
Zweig, der Erfolg meldet, gewinnt; die folgenden laufen gar nicht mehr.

Drei Dinge daran sind Regel, nicht Geschmack:

- **Die Reihenfolge ist eine fachliche Aussage.** Wer zuerst steht, entscheidet, als was ein
  mehrdeutiger Wert gelesen wird.
- **Der überlebende Fehler ist keiner.** Scheitern alle Zweige, trägt das Ergebnis den Fehler des
  letzten — beliebig. Der Aufrufer übersetzt ihn in den einen ehrlichen Fall („diese Angabe ist
  keine der beiden Formen"). Kein `sonst`-Parameter am Kombinator.
- **Die erste Regel ist ein eigener Parameter.** ODER hat kein neutrales Element: `allOf()` darf mit
  null Regeln „alles gültig" bedeuten, `anyOf()` hätte keinen Fehler zu melden.

## Wer die Frage schon beantwortet, wird nicht zweimal gefragt

Prüft eine Stelle ein Feld bereits über dessen `parse`, steht dieselbe Frage **nicht** noch einmal
als Regel davor — sonst laufen beide Wege auseinander, und der Nutzer sieht zwei Meinungen über
dieselbe Eingabe. Der Ausweg ist nicht, das `parse` blind zu machen, sondern die Befunde
**sammeln** zu lassen und alle auf einmal zu melden.

Und die stärkste Form davon: **eine Frage, die nur die Gegenseite beantworten kann, wird gar nicht
gestellt.** Ob eine Adresse vergeben ist, weiß der Server; die App fragt das nicht vorher ab,
sondern liest das Urteil aus der Antwort auf den Schreibaufruf
([typescript-feature-slices.md](./typescript-feature-slices.md)).

## Review-Checkliste

- [ ] Fehlerform entscheidet die Variante: viele unabhängige Feldfehler ⇒ Collect-all; genau ein typisierter Fehler ⇒ Fail-fast. Nie die Komposition der einen Form dem Anwendungsfall der anderen aufzwingen.
- [ ] Eine Regel meldet Feld, Code und Parameter, nie einen fertigen Satz — der Text entsteht in `src/i18n/` oder kommt vom Server.
- [ ] Die Fallunterscheidung über die Fehler-Union eines `parse` steht **in der Regel**, nicht in einem generischen Helfer mit Konverter. Sobald eine Signatur `unknown` oder `any` trägt, um mehrere Fehlertypen zu bedienen, ist die Zwischenschicht der Fehler — nicht die Länge der ausgeschriebenen Arme.
- [ ] Keine Regel wird nach einem Fehlschlag ein zweites Mal ausgewertet, nur um herauszufinden, welche Teilregel griff.
- [ ] Kein zweiter, strukturell gleicher Regel-Typ neben dem gemeinsamen.
- [ ] Eine über mehrere Eingaben geteilte Regel stellt wirklich dieselbe Frage über dieselben Felder, ausgedrückt über einen schmalen Typ.
- [ ] Keine Regel wird zweimal gestellt: was ein `parse` schon prüft, steht nicht noch einmal davor; die Befunde werden gesammelt und gemeinsam gemeldet.
- [ ] Was die Gegenseite durchsetzt, wird nicht vorab gefragt, sondern aus ihrer Antwort gelesen.
- [ ] Eine Regel ist nur dann `AsyncRule`, wenn sie wirklich wartet; eine synchrone wird mit `asAsync` gehoben, nicht umgeschrieben.
- [ ] Ein Wert, der in mehreren einander ausschließenden Formen gültig ist, wird mit `anyOf` ausgedrückt, nicht mit einer `if`-Kette — und „keine der Formen" kommt vom Aufrufer, nicht vom Kombinator.
- [ ] **Jede** Prüfung steht als benannte Funktion und wird als `RULE`/`RULES` deklariert — auch die einzelne. `parse` verdrahtet nur noch; ein `if` oder ein `try` in seinem Rumpf ist der Befund.
- [ ] Wandelt die Prüfung den Typ (`string` → `DiaryDate`), ist sie **trotzdem eine Regel**, nur keine verkettbare: `chain` und `anyOf` setzen gleiche Ein- und Ausgangsform voraus.
- [ ] Kein `raw.trim()` neben den Regeln. Trimmen ist die erste Regel der Kette, nicht eine Vorbereitung davor — sonst sieht jede folgende Regel einen Wert, den sie erneut anfassen müsste.
