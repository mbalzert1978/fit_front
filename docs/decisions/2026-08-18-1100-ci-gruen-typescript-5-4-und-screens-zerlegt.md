# `./make.ps1 ci` ist grün: TypeScript 5.4, aufgelöste Theme-Typen, zerlegte Screens

## Lage

`./make.ps1 ci` war bewusst rot (Punkt 7 der offenen Punkte): 33 Typfehler, zwei
Lint-Befunde, sieben Screens über der Komplexitätsgrenze, fünfzehn ungeformte
Dateien. Die Befunde sollten Druck machen; sie haben ihn gemacht.

Bei der Ursachensuche zeigte sich, dass die meisten Typfehler ein einziges,
verdecktes Problem waren: `typescript` war auf `~5.3.3` gepinnt, die installierte
`@tanstack/react-query` (5.101.4) benutzt in ihren Typen aber `NoInfer` — ein
Konstrukt, das es erst ab TypeScript 5.4 gibt. `skipLibCheck: true` aus
`expo/tsconfig.base` verschluckt den Fehler in der Deklarationsdatei, worauf
`useQuery` still zu `any` kollabiert. Jeder `map`-Parameter über Hook-Daten war
dadurch implizit `any`, und ein echter Fehler in `capture/confirm.tsx` blieb
unsichtbar.

## Entscheidung

Der Lauf ist grün und bleibt es. `typescript` steht auf `~5.4.5`. Die
Komplexitätsgrenze von 10 wurde durch Zerlegen der Screens erreicht, nicht durch
Anheben der Schwelle; es gibt keine ESLint-Ausnahme, kein `@ts-ignore` und kein
`any` im Quelltext.

## Begründung

- **TypeScript anheben statt react-query festnageln.** Die Bibliothek ist aktuell,
  der Compiler war es nicht. Ein Downgrade der Bibliothek hätte dieselbe Lücke nur
  in die andere Richtung eingefroren. 5.4.5 ist die kleinste Fassung, die `NoInfer`
  kennt.
- **Schwelle nicht anfassen.** Die Trennung von Lint und Komplexität existiert
  gerade, damit sich das eine nicht mit dem anderen abschalten lässt
  (`eslint.complexity.config.js`). Wer die Grenze hebt, um grün zu werden, hebt sie
  wieder.
- **Zerlegen entlang der Abschnitte, die der Screen ohnehin hat.** Die
  herausgelösten Teile sind dieselben Blöcke, die vorher schon durch
  `SectionHeading` getrennt waren. Sie holen ihre Daten über die vorhandenen
  Query-Hooks selbst, statt durch Props gereicht zu werden — der Cache von
  react-query ist die geteilte Quelle, ein zweiter Weg daneben entstünde sonst.
- **Kein Verhalten geändert.** Wo Vereinfachungen möglich waren (`scaled?.kcal ?? 0`
  → `scaled.kcal`), wurde der Fallback in die Berechnung gezogen, sodass die
  Anzeige dieselbe bleibt.

## Folgen

- Die Screens `diary`, `settings`, `scan`, `capture/confirm`, `entry/[id]`,
  `product/[id]` und `recipe/[id]` enthalten lokale Unterkomponenten. Sie werden
  **nicht exportiert**: `app/` ist der Router-Baum, und ein zweiter Export neben
  `export default` wäre dort eine Route.
- `theme.tabular` ist als `TextStyle` typisiert, statt als `readonly`-Tupel aus dem
  umgebenden `as const` zu fallen. `themes.dark` und `themes.light` tragen beide den
  Typ `Palette`, damit ein Moduswechsel keine zwei unverwandten Theme-Typen erzeugt.
- Das Suchfeld auf dem Scan-Screen ist ein echtes `TextInput` — Punkt 4 der offenen
  Punkte ist damit erledigt und dort entfernt. Ausschlaggebend war nicht die
  Optik, sondern dass `setQuery` sonst ungenutzt blieb und der Lint-Befund ohne
  Eingabefeld nur durch Löschen der Debounce-Logik zu beheben gewesen wäre.
- Punkt 7 der offenen Punkte entfällt. Ein roter Lauf ist ab jetzt ein Befund, kein
  bekannter Zustand.
- `tsconfig.json` setzt `moduleResolution: "bundler"` (mit `module: "esnext"`) und
  überschreibt damit das `node10` aus `expo/tsconfig.base`, das in TypeScript 7
  wegfällt. Überschrieben statt per `ignoreDeprecations` stummgeschaltet: `bundler`
  ist die Auflösung, die Metro ohnehin verwendet, und sie liest das `exports`-Feld
  der Pakete — genau das, woran `node10` bei react-query vorbeigelaufen ist.
- `skipLibCheck` bleibt an (es kommt aus `expo/tsconfig.base`). Wenn eine
  Abhängigkeit wieder still zu `any` kollabiert, ist
  `npx tsc --noEmit --skipLibCheck false` der Weg, das sichtbar zu machen.
