# TypeScript Code Organization

> Übersetzt `python-code-organization.md` sinngemäß.

## Aussagekräftige Namen

Namen müssen die Absicht ohne umliegenden Kontext erkennen lassen. Keine Abkürzungen, keine
generischen Namen, keine Typnamen im Bezeichner. Die Annotation an der exportierten Grenze ersetzt
das, wofür andere Sprachen den Typ in den Namen ziehen.

Do:
```ts
export function toDiaryDate(day: Date): DiaryDate;
export const useDiaryDay = (date: DiaryDate) => /* … */;
```

Don't:
```ts
export function conv(d: any, t: number): object;
```

`any` ist hier kein Stilfehler, sondern das Ende der Prüfung: `strict` steht in
[`tsconfig.json`](../../tsconfig.json), und `any` schaltet es für diesen Wert ab. Im ganzen Repo
steht heute kein einziges — das bleibt so.

## Zustand von Verhalten trennen

Typen halten entweder Daten (`type` mit `readonly`-Feldern) oder implementieren Verhalten
(Funktionen), nicht beides zugleich als Klasse mit Mutation.

**Gilt für einfache, nicht-identitätstragende Wertehalter** — Nutzlasten der API, Projektionen,
Ansichtsmodelle. **Nicht** für die Stelle, der eine Operation gehört: ein Hook besitzt seine
Operation samt Cache-Schlüssel und Wiederholung; das ist die bewusste Ausnahme und in
[typescript-feature-slices.md](./typescript-feature-slices.md) beschrieben. Das Beispiel unten ist
absichtlich eine reine Projektion.

Do:
```ts
export type OrderLine = { readonly price: number; readonly quantity: number };
export type OrderSummary = { readonly id: string; readonly lines: readonly OrderLine[] };

export const totalOf = (summary: OrderSummary): number =>
  summary.lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
```

Don't:
```ts
class OrderSummary {
  total = 0;
  constructor(public lines: OrderLine[]) {}
  calculateAndUpdateTotal(): void {
    this.total = this.lines.reduce((s, l) => s + l.price * l.quantity, 0);
  }
}
```

## Reine Funktionen bevorzugen

Funktionen ohne Seiteneffekte sind isoliert testbar und leichter nachvollziehbar. In einem Screen
heißt das: die Rechnung steht als Funktion daneben, nicht im Rumpf der Komponente zwischen zwei
`useEffect`.

Do:
```ts
function dayLabel(date: DiaryDate, txt: Texts): string {
  const prefix = date === today() ? txt.diaryTodayPrefix : '';
  return prefix + format(parseISO(date), txt.dayFormat, { locale: txt.dateLocale }).toUpperCase();
}
```

Don't:
```ts
function updateLabel(): void {
  setLabel(format(parseISO(date), txt.dayFormat));  // Seiteneffekt in der Berechnung vermischt
  void queryClient.invalidateQueries();
}
```

## Der Ort ist Teil der Organisation

Eine Funktion an der falschen Stelle ist auch dann falsch, wenn sie rein und gut benannt ist. Wohin
was gehört, steht in [`CLAUDE.md`](../../CLAUDE.md) und wird hier nicht wiederholt — Farben nach
`src/theme.ts`, Sätze nach `src/i18n/`, Endpunkte und Cache-Schlüssel nach `src/api/`, Elemente in
den Baukasten `src/components/`. Wer eine zweite Stelle für dasselbe prägt, hat die Regel gebrochen,
bevor der Code gelesen wird.
