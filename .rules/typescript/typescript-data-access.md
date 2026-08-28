# TypeScript Data Access

> Übersetzt `python-data-access.md` sinngemäß. **Überschreibt das generische Repository-Pattern aus
> [`../common/patterns.md`](../common/patterns.md)** — dieselbe Begründung wie in der Vorlage: eine
> generische Abstraktion verliert mehr (Ausdruckskraft der Anfrage, Testbarkeit an der richtigen
> Stelle), als sie an Wiederverwendung gewinnt.
>
> „Datenzugriff" heißt hier die **HTTP-Naht**: dieses Repo hat keine eigene Datenbank im Einsatz.
> `drizzle-orm`, `drizzle-kit` und `expo-sqlite` stehen in [`package.json`](../../package.json),
> werden aber von keiner Datei unter `src/` oder `app/` benutzt. Der Abschnitt zu den Grenzen einer
> Engine bleibt deshalb bewusst abstrakt und nennt keine Bibliothek — sobald lokal gespeichert
> wird, gehört hier ein lauffähiges Beispiel her.

## Kein generischer Zugriff und kein Sammel-Gateway

Kein generisches `useResource<T>(url)` und kein `gateway.get(SomeType)`-Locator. Jede Operation wird
über einen **benannten, schmalen Hook** mit fachlicher Bezeichnung erreicht. Der eine gemeinsame
Weg nach draußen ist [`src/api/client.ts`](../../src/api/client.ts) — er trägt Auth, Fehlerform und
Wiederholung, und daneben steht kein zweiter `fetch`
([`../app/http-schicht.md`](../app/http-schicht.md)).

Do:
```ts
export const useDiaryDay = (date: DiaryDate) =>
  useQuery({ queryKey: qk.diary(date), queryFn: () => api<DiaryDay>(endpoints.diaryDay(date)) });

export const useSlots = () =>
  useQuery({ queryKey: qk.slots(), queryFn: () => api<MealSlot[]>('/diary/slots') });
```

Don't:
```ts
export const useResource = <T>(path: string, key: unknown[]) =>      // sagt nichts über die Fachlichkeit
  useQuery({ queryKey: key, queryFn: () => api<T>(path) });

export const useAnything = (type: 'diary' | 'slots' | 'goals') => /* … */;   // Locator
```

Ein generischer Zugriff wrappt meist etwas, das die Bibliothek schon bereitstellt, und verliert
dabei genau das, was den Unterschied macht: den Cache-Schlüssel, die Bedingung (`enabled`), das
Nachfrage-Intervall, die Entwertung nach dem Schreiben. Unterschiedliche Ressourcen haben bewusst
unterschiedliche Zugriffsformen — genau da schadet eine gemeinsame Abstraktion am meisten.

## Der Cache-Schlüssel ist Teil des Zugriffs und steht an einer Stelle

Ein Schlüssel, der an der Aufrufstelle gebaut wird, driftet gegen den, mit dem entwertet wird — und
der Nutzer sieht danach alte Zahlen. Deshalb stehen alle Schlüssel in
[`src/api/queryKeys.ts`](../../src/api/queryKeys.ts) und werden von dort geholt.

Do:
```ts
queryClient.invalidateQueries({ queryKey: qk.diary(date) });
```

Don't:
```ts
queryClient.invalidateQueries({ queryKey: ['diary', date] });   // zweite Abschrift desselben Schlüssels
```

## Ein Kalendertag ist ein eigener Typ, kein `Date`

Die Vorlage hält Zeitpunkte als Unix-Sekunden in einem eigenen Wertetyp, damit die Domäne
speichernah und frei von Zeitzonen-Mehrdeutigkeit bleibt. Das Gegenstück hier ist
[`src/api/diaryDate.ts`](../../src/api/diaryDate.ts): ein Tagebuchtag hat **keine** Uhrzeit und
**keine** Zone, also ist er ein markierter `string` im Format `yyyy-MM-dd` und niemals ein `Date`.

Do:
```ts
export type DiaryDate = string & { readonly __brand: 'DiaryDate' };
export const today = () => toDiaryDate(time.now());
```

Don't:
```ts
export const useDiaryDay = (date: Date) => /* … */;   // trägt Uhrzeit und Zone in eine Frage, die keine hat
```

Dieselbe Regel gilt für Fristen: die Sitzung nennt ihre Lebensdauern **relativ in Sekunden**
(`expiresIn`, `refreshExpiresIn` in [`src/api/types.ts`](../../src/api/types.ts)), weil die Uhr des
Geräts falsch geht. Einen Zeitpunkt daraus macht genau eine Stelle —
[`src/api/client.ts`](../../src/api/client.ts) —, und nur für den eigenen Gebrauch.

Und die Uhr selbst kommt aus der Naht [`src/time.ts`](../../src/time.ts): kein `new Date()` an der
Aufrufstelle, sonst kann kein Test einen Tag setzen.

## Grenzen der Gegenseite bei großen Mengen

Jede Engine begrenzt, wie viele Werte ein Aufruf tragen kann — eine Datenbank die Zahl der
gebundenen Parameter, ein HTTP-Endpunkt die Länge der URL. Eine Anfrage, die je Element einen
eigenen Parameter erzeugt, skaliert nicht auf große, potenziell unbegrenzte Kandidatenmengen und
scheitert irgendwann mit einer Meldung, die niemand erwartet hat.

Für einen **unbegrenzten** Vergleich gehört die Menge als **eine** serialisierte Nutzlast über die
Naht — in einem Rumpf, nicht als wachsende Liste von Parametern —, und die Gegenseite packt sie
aus. Das gehört hinter den Hook, nie in einen Screen.

Entsteht so ein Fall, ist er zuerst ein **Vertragspunkt**: die Form steht im Pact unter
[`pact/`](../../pact/), bevor sie im Code steht ([`app/vertraege.md`](../app/vertraege.md), Regel 6).
Dann gehört hier ein lauffähiges Beispiel her, samt einem Test, der eine Menge oberhalb der Grenze
abdeckt.
