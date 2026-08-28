# TypeScript Modern Syntax

> Übersetzt `python-modern-syntax.md` sinngemäß. Zwei Abschnitte der Vorlage haben hier kein
> Gegenstück und werden begründet abgewandelt statt geraten: der Walrus-Operator (den JavaScript
> nicht hat) und die verzögerte Formatierung im Logging (die keine Bibliothek dieses Repos
> anbietet). Beides steht unten an seiner Stelle.

## Template-Literale statt Verkettung

Do:
```ts
const message = `Field ${fieldName} is invalid`;
const key = `${server}validation-failed`;
```

Don't:
```ts
const message = 'Field ' + fieldName + ' is invalid';
```

**Abweichung: keine Ausnahme fürs Logging.** Die Vorlage nimmt Logging-Aufrufe aus, weil dort die
Bibliothek den String nur baut, wenn der Level greift. Dieses Repo hat keine solche API — `console`
formatiert sofort. Die Ausnahme entfällt deshalb; die Absicht dahinter bleibt: keine teure
Zeichenkette bauen, die niemand liest. Wo das droht, steht die Prüfung davor, nicht ein zweites
Format.

## Verzweigen über die Form, nicht von Hand prüfen

Wer eine Struktur von Hand prüft — `typeof` plus Feldvergleich plus noch ein `in` eine Ebene
tiefer —, schreibt ein `switch` in der falschen Sprache. Die volle Regel steht in
[typescript-control-flow.md](./typescript-control-flow.md), inklusive Vollständigkeitsprüfung.

## Generics nativ, Typen aus einer Quelle abgeleitet

Ein Typ wird **abgeleitet**, wo er schon existiert, statt ein zweites Mal geschrieben zu werden.
Die Werkzeuge dafür sind `as const`, `typeof`, indizierte Zugriffe und `satisfies`.

Do:
```ts
export type Language = (typeof supportedLanguages)[number];
export type Palette = (typeof palette)[ThemeMode];
type Totals = DiaryDay['totals'];

const EMPTY_DAY = { /* … */ } satisfies Omit<DiaryDay, 'date'>;
```

Don't:
```ts
export type Language = 'de' | 'en';                  // zweite Abschrift derselben Liste
const EMPTY_DAY: Omit<DiaryDay, 'date'> = { /* … */ }; // weitet die Literale auf, prüft nur
```

`satisfies` prüft gegen den Zielvertrag, **ohne** den engeren Typ zu verlieren — genau deshalb
steht es in [`app/(tabs)/diary.tsx`](<../../app/(tabs)/diary.tsx>). Eine Annotation täte das
Gegenteil.

## Ersatzwert per `??`, nicht per `||` und nicht per nachgeschobenem `if`

Soll ein **fehlender** Wert durch einen Ersatz abgelöst werden, ist das ein Ausdruck, keine
Fallunterscheidung.

`??` und `||` sind dabei nicht austauschbar: `||` greift auch bei `0`, `''` und `false`. Bei
Nährwerten, Grammangaben und Zählern ist das ein Fehler, der wie ein Standardwert aussieht.

Do:
```ts
const tag = chosen ?? current.tag();
const etag = response.headers.get('ETag') ?? undefined;
```

Don't:
```ts
const grams = entry.grams || 100;   // 0 g werden stillschweigend zu 100 g

let tag = chosen;                   // dieselbe Aussage auf vier Zeilen
if (!tag) {
  tag = current.tag();
}
```

**Abweichung: kein Walrus.** Die Vorlage verlangt `:=`, wo zugewiesen und unmittelbar geprüft wird.
JavaScript hat das nicht, und eine Zuweisung in der Bedingung (`if ((m = re.exec(s)))`) ist hier
kein Idiom, sondern eine bekannte Fehlerquelle. Die Absicht — der Name existiert genau dort, wo er
gebraucht wird — wird stattdessen mit optionaler Verkettung, früher Rückgabe und einem `const` im
engsten Block erreicht:

```ts
const stored = await SecureStore.getItemAsync(SESSION_KEY);
if (!stored) return null;
```

## IDs entstehen an einer Stelle

IDs werden nicht an der Aufrufstelle erzeugt, sondern kommen aus
[`src/api/ids.ts`](../../src/api/ids.ts) — clientseitig, damit ein offline erfasster Eintrag schon
seine endgültige Id und damit seinen Idempotency-Key hat.

Do:
```ts
const id = newId();
```

Don't:
```ts
const id = `${Date.now()}-${Math.random()}`;   // nicht eindeutig, nicht prüfbar, zweiter Weg
```

**Abweichung: keine sortierbare Version.** Die Vorlage fordert UUIDv7, weil zufällige v4-Werte
Index-Inserts streuen. Dieses Repo erzeugt die Id über `expo-crypto`, und `randomUUID()` liefert
dort Version 4; eine v7 bietet die Bibliothek nicht an. Die Regel bleibt als Anforderung an die
**Gegenseite** bestehen — wo die Sortierbarkeit einer hier erzeugten Id zählt, ist das ein Punkt für
den Vertrag oder eine Entscheidung unter [`docs/decisions/`](../../docs/decisions/), keine Vorgabe
an eine Funktion, die es nicht gibt.

## Lint-Ausnahmen: mit Regelcode **und** Begründung, nie dateiweit

Muss eine ESLint-Regel im Einzelfall unterdrückt werden, geschieht das an genau der betroffenen
Zeile, mit Regelcode und einer Begründung nach `--` — nie ein nacktes `eslint-disable`, das alle
Regeln abschaltet, und nie eins am Dateianfang. Der Kommentar ist verortet, verschwindet mit der
Zeile beim Refactoring und zwingt zu einer sichtbaren Begründung.

Im ganzen Repo steht heute keine einzige Ausnahme. Die nächste ist damit erklärungspflichtig.

Do:
```ts
// eslint-disable-next-line @typescript-eslint/no-require-imports -- flat config is loaded as CommonJS
const tseslint = require('typescript-eslint');
```

Don't:
```ts
/* eslint-disable */
// irgendwo am Dateianfang — unterdrückt die ganze Datei ohne Begründung
```

Und keine Ausnahme, um das Komplexitätsmaß loszuwerden: `complexity`, `max-depth`,
`max-nested-callbacks` und `max-params` stehen in
[`eslint.complexity.config.js`](../../eslint.complexity.config.js) und messen „das ist zu viel auf
einmal". Wer sie abschaltet, beantwortet die Frage nicht, er löscht sie.
