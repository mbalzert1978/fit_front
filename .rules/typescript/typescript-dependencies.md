# TypeScript Dependency Management

> Übersetzt `python-dependencies.md` sinngemäß. Wo die Vorlage von Konstruktor-Injection spricht,
> stehen hier die Parameter einer Funktion, die Props einer Komponente und die Argumente eines
> Hooks — dieselbe Frage, andere Form.

## Signaturen schmal halten

Viele Parameter signalisieren zu viele Verantwortlichkeiten. Einmal genutzte Abhängigkeiten werden
übergeben, nicht im Zustand gehalten.

Die Grenze ist gemessen und nicht gefühlt: `max-params` steht in
[`eslint.complexity.config.js`](../../eslint.complexity.config.js) auf 5. Wer dagegen läuft, teilt
auf, statt die Regel zu heben.

Do:
```ts
type MacroBarProps = { label: string; value: number; target: number };
export function MacroBar({ label, value, target }: MacroBarProps) { /* … */ }
```

Don't:
```ts
export function MacroBar(
  label: string, value: number, target: number,
  color: string, font: TextStyle, locale: Locale, onPress: () => void,   // zu viel auf einmal
) { /* … */ }
```

Ein Objekt als Parameter umgeht die Zählung nicht: sieben Felder in einem Props-Typ sind dieselben
sieben Verantwortlichkeiten. Der Ausweg ist eine zweite Komponente, nicht ein größeres Objekt.

## Komposition über strukturelle Typen statt Vererbung

Komplexes Verhalten entsteht durch Zusammensetzen fokussierter Typen, nicht durch Erben von einer
Basisklasse. TypeScripts Typsystem ist **strukturell** — was die Form erfüllt, passt; eine
gemeinsame Basis braucht es dafür nie.

Genau so sind die Nähte dieses Repos gebaut: `TimeProvider` in [`src/time.ts`](../../src/time.ts)
und `LanguageProvider` in [`src/language.ts`](../../src/language.ts) sind je ein Typ mit ein bis
zwei Methoden, und die Implementierung dahinter ist austauschbar, ohne dass irgendwer erbt.

Do:
```ts
export type TimeProvider = { now(): Date; timeZoneId(): string };

const deviceTime: TimeProvider = { /* … */ };
export function setTimeProvider(p: TimeProvider) { current = p; }
```

Don't:
```ts
abstract class BaseTimeProvider { abstract now(): Date; }
class DeviceTime extends BaseTimeProvider { /* … */ }   // Basisklasse ohne Nutzen
```

## Protokollieren ist eine Hülle, keine Abhängigkeit im Kern

Fachliche Einheiten — ein Hook, eine Mapper-Funktion, eine Komponente — nehmen keinen Logger
entgegen. Das Anliegen gehört in eine Hülle um die Naht, damit der Kern eine einzige
Verantwortung behält.

Do:
```ts
const withLogging =
  <A extends unknown[], R>(name: string, inner: (...args: A) => Promise<R>) =>
  async (...args: A): Promise<R> => {
    console.warn(`${name}: start`);
    return inner(...args);
  };

export const fetchProduct = withLogging('fetchProduct', (id: string) => api<Product>(`/catalog/products/${pathSegment(id)}`));
```

Don't:
```ts
export const fetchProduct = (id: string, logger: Logger) => {   // Anliegen in den Kern geleakt
  logger.warn('fetchProduct');
  return api<Product>(`/catalog/products/${pathSegment(id)}`);
};
```

## Über Modulgrenzen geht nur, was exportiert ist

TypeScript hat kein `private` für Module: was nicht exportiert ist, ist außerhalb der Datei nicht
erreichbar — das **ist** die Grenze. Braucht eine andere Stelle etwas, wird ein **Typ plus eine
exportierte Naht** angeboten und hineingereicht, nicht die interne Implementierung importiert.

Für den Baukasten ist die Grenze zusätzlich benannt: Komponenten kommen aus
[`src/components/index.ts`](../../src/components/index.ts), nicht aus der Datei dahinter. Wer an der
Sammelstelle vorbei importiert, hängt an einem Dateinamen statt an einer Zusage — und prägt beim
nächsten Umbenennen den zweiten Weg, den [`CLAUDE.md`](../../CLAUDE.md) verbietet.

Do:
```ts
import { Screen, ListRow, MacroBar } from '../../src/components';
```

Don't:
```ts
import { ListRow } from '../../src/components/ListRow';   // an der Sammelstelle vorbei
```

Diese Grenze zu unterlaufen bleibt Tests vorbehalten, die absichtlich auf Internes zugreifen. Der
Regelfall bleibt: was zwei Stellen brauchen, wird exportiert; was eine Stelle braucht, bleibt in
ihrer Datei.

> Der Titel der Vorlage lautet „Dependency Management", ihr Inhalt handelt aber ausschließlich vom
> Hineinreichen von Abhängigkeiten. Das ist hier genauso — über das Aufnehmen neuer Pakete sagt
> diese Datei nichts, weil die Vorlage nichts dazu sagt.
