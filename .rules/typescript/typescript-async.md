# TypeScript Async Patterns

> Übersetzt `python-async.md` sinngemäß. Zielstack: Expo/React Native mit `async`/`await`,
> `Promise` und `AbortSignal`; nebenläufig wird über TanStack Query orchestriert
> ([`package.json`](../../package.json)).

## Nicht von Hand warten

Niemals eine Promise „abwarten", ohne sie zu erwarten: keine Schleife, die auf ein Flag pollt, kein
`.then()` in einem `useEffect` ohne Aufräumen, und keine Promise, die niemand entgegennimmt. Immer
`await` — und wo eine Promise absichtlich nicht erwartet wird, sagt `void` das laut.

Do:
```ts
export async function saveEntry(entry: DiaryEntry): Promise<void> {
  await api(endpoints.entries(entry.date), { method: 'POST', body: entry });
  await queryClient.invalidateQueries({ queryKey: qk.diary(entry.date) });
}
```

Don't:
```ts
function saveEntry(entry: DiaryEntry): void {
  api(endpoints.entries(entry.date), { method: 'POST', body: entry });  // niemand fängt den Fehler
  let done = false;
  while (!done) { /* busy wait */ }                                     // blockiert den einen Thread
}
```

Ein unbeobachteter Fehlschlag ist hier besonders teuer: React Native meldet ihn als
`unhandled promise rejection` irgendwo in der Konsole, während der Screen weiterläuft, als wäre
gespeichert worden.

## Abbruch: `AbortSignal`, kein selbstgebautes Flag

**Abweichung von der Vorlage.** Python propagiert einen Abbruch von selbst; JavaScript tut das
**nicht** — hier gilt wieder, was die C#-Urfassung sagte: das Signal wird durchgereicht. Das
Gegenstück zum `CancellationToken` ist `AbortSignal`, und es wird **nicht** nachgebaut: kein
`cancelled`-Flag, kein eigenes Token-Objekt, kein `isMounted`-Boolean.

TanStack Query reicht das Signal in `queryFn` hinein; wer eine eigene Anfrage schreibt, nimmt es als
Parameter entgegen.

Do:
```ts
// Das Signal ist ein Parameter der Naht, kein Feld daneben.
useQuery({
  queryKey: qk.search(query),
  queryFn: ({ signal }) => api<SearchHit[]>(searchPath(query), { signal }),
});
```

Die `Options` in [`src/api/client.ts`](../../src/api/client.ts) kennen `signal` heute nicht. Wer
Abbruch braucht, ergänzt es **dort** — nicht mit einem zweiten `fetch` daneben
([`CLAUDE.md`](../../CLAUDE.md)).

Don't:
```ts
let cancelled = false;                       // handgebautes Token
useEffect(() => {
  void load().then((data) => {
    if (!cancelled) setData(data);           // die Anfrage läuft trotzdem weiter
  });
  return () => { cancelled = true; };
}, []);
```

Ein `AbortSignal` bricht die Anfrage wirklich ab; ein Flag verwirft nur das Ergebnis und lässt Netz,
Batterie und Server-Last stehen.

## `Promise.all` statt Zähler von Hand

Unabhängige Aufrufe laufen nebenläufig, nicht nacheinander — und die Nebenläufigkeit steht als
Ausdruck da, nicht als Zähler mit Callback.

Do:
```ts
const [product, slots] = await Promise.all([
  api<Product>(`/catalog/products/${pathSegment(id)}`),
  api<MealSlot[]>('/diary/slots'),
]);
```

Don't:
```ts
const product = await api<Product>(`/catalog/products/${pathSegment(id)}`);
const slots = await api<MealSlot[]>('/diary/slots');   // wartet ohne Grund
```

`Promise.all` bricht beim ersten Fehlschlag ab — das ist meistens gewollt. Sollen **alle** Ausgänge
gemeldet werden, ist `Promise.allSettled` das Werkzeug; die Wahl zwischen beiden ist dieselbe
Frage wie „ein Fehler oder alle Fehler"
([typescript-rule-pattern.md](./typescript-rule-pattern.md)).

Eine Frist ist ebenfalls ein Ausdruck: `AbortSignal.timeout(30_000)` statt eines `setTimeout`, das
neben dem Aufruf mitgeführt und wieder abgeräumt werden muss.

## `async`/`await` statt Callback- und `.then()`-Ketten

Do:
```ts
async function process(request: OrderRequest): Promise<Order> {
  await validate(request);
  return create(request);
}
```

Don't:
```ts
function process(request: OrderRequest): Promise<Order> {
  return validate(request).then(() => create(request)).catch(() => fallback());
}
```

## Aufräumen gehört in den Scope, nicht ans Ende

Wo andere Sprachen ein `dispose` verlangen, steht hier `try`/`finally` — und in React die
Aufräumfunktion des `useEffect`. Sie läuft auch dann, wenn der Screen verlassen wird, während der
Aufruf noch läuft.

Do:
```ts
useEffect(() => {
  const controller = new AbortController();
  void poll(controller.signal);
  return () => controller.abort();
}, [photoId]);
```

Don't:
```ts
useEffect(() => {
  const id = setInterval(poll, 1500);   // läuft weiter, wenn der Screen weg ist
}, [photoId]);
```

Wiederholtes Nachfragen ist in dieser App ohnehin Sache der Datenschicht und nicht des Screens:
`usePhotoJob` in [`src/api/hooks.ts`](../../src/api/hooks.ts) fragt über `refetchInterval` nach und
hört von selbst auf — ein eigener Timer daneben wäre der zweite Weg.
