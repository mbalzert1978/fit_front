# TypeScript Rules — Index

Alle Dateien sind sinngemäße Übersetzungen der sprachspezifischen Schicht der Vorlage (dort
Python, davor C#) auf **den Stack dieses Repos**: Expo/React Native mit **TypeScript ~5.4** unter
`strict` ([`tsconfig.json`](../../tsconfig.json)), **ESLint** (Flat Config, `typescript-eslint`) für
Lint und — mit eigener Konfiguration — für das Komplexitätsmaß, **Prettier** für die Formatierung,
**jest** mit `ts-jest` für Tests und **Pact** für die Verträge
([`package.json`](../../package.json)). Der Typechecker ist `tsc --noEmit`
(`./make.ps1 typecheck`); einen zweiten gibt es nicht.

Übersetzt wurde die **Absicht** jeder Regel, nicht ihr Wortlaut. Wo das TypeScript-Idiom gegen die
Vorlage steht, steht die Abweichung an Ort und Stelle in der jeweiligen Datei und begründet sich.

Empfohlene Lesereihenfolge für Neueinsteiger:innen: erst die Querschnittsregeln (1–6), dann die
Architektur-Klammer (7), dann die Spezialthemen (8–12).

| # | Datei | Thema |
|---|-------|-------|
| 1 | [typescript-code-organization.md](./typescript-code-organization.md) | Namen, Zustand vs. Verhalten, reine Funktionen |
| 2 | [typescript-types.md](./typescript-types.md) | Annotation, `readonly`, keine Vererbung, Discriminated Unions |
| 3 | [typescript-modern-syntax.md](./typescript-modern-syntax.md) | Template-Literale, `??`, `as const`/`satisfies`, IDs, Lint-Ausnahmen |
| 4 | [typescript-control-flow.md](./typescript-control-flow.md) | `switch` über Unions, Vollständigkeit, `slice`/`at`, Literale |
| 5 | [typescript-null-safety.md](./typescript-null-safety.md) | Guards an exportierten Grenzen, `null` vs. `undefined`, Typprädikate |
| 6 | [typescript-error-handling.md](./typescript-error-handling.md) | Ergebnis-Unions, Fehler als typisierter Fall statt Satz, `parse`/`hydrate`, Fangen nur an der IO-Naht |
| 7 | [typescript-feature-slices.md](./typescript-feature-slices.md) | Schichten, Naht, Hook/Mapper/Screen, Baureihenfolge, Review-Checkliste |
| 8 | [typescript-rule-pattern.md](./typescript-rule-pattern.md) | Collect-all-`Rule` vs. Fail-fast-`ResultRule` |
| 9 | [typescript-factories.md](./typescript-factories.md) | Fachlich benannte Factories, `parse`/`hydrate`, ein Verdrahtungspunkt |
| 10 | [typescript-dependencies.md](./typescript-dependencies.md) | Schmale Signaturen, strukturelle Komposition, Protokollierung als Hülle |
| 11 | [typescript-data-access.md](./typescript-data-access.md) | Kein generisches Repository, Kalendertag und Fristen als eigener Typ |
| 12 | [typescript-async.md](./typescript-async.md) | Kein Warten von Hand, `AbortSignal`, `Promise.all`, Aufräumen im Scope |

Bei Widersprüchen zwischen zwei Dateien gilt die spezifischere: die Naht-Regel in
`typescript-feature-slices.md` schlägt die generische Zustand/Verhalten-Trennung aus
`typescript-code-organization.md` (dort explizit vermerkt).

Und über allem steht [`../app/`](../app/): wo es um Literale, Beschriftungen, Verträge oder die
HTTP-Schicht **dieser App** geht, entscheidet diese Schicht, nicht die hier.
