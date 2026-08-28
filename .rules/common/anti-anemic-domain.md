# Kein blutarmes Domänenmodell

## Grundsatz (KRITISCH)

Objekte erledigen ihre Arbeit selbst. Orchestrierende Stellen orchestrieren, sie führen nicht aus.

Eine **blutarme Domäne** behandelt Objekte als passive Datenbehälter — die aufrufende Stelle fragt
Ports ab, liest rohe Felder aus und erledigt die Logik selbst.
Eine **reiche Domäne** legt die Logik dorthin, wo die Daten liegen — das Objekt ruft den Port und
liefert ein aussagekräftiges Ergebnis.

```text
// Pseudocode
FALSCH:  wenn !port.IstBereit(objekt) → zurück; wenn !port.IstBereit(objekt.Geschwister) → zurück; ergebnis = Typ.Bilde(objekt.a, objekt.b)
RICHTIG: ergebnis = objekt.LöseAuf(port)   // das Objekt entscheidet, was „bereit" heißt und wie es sich bildet
```

## Verantwortung eines Orchestrators

Ein Orchestrator darf nur:

- eine Anfrage entgegennehmen
- Abhängigkeiten (Ports, Nähte) an die besitzenden Einheiten durchreichen
- das Ergebnis festschreiben (schreiben, melden, zurückgeben)

Ein Orchestrator darf nie:

- Ports wiederholt aufrufen, um Bedingungen zu rekonstruieren, die die besitzende Einheit kennt
- rohe Felder auslesen, um sie in freistehende Erzeugungsaufrufe zu füttern
- „Ist dieses Objekt bereit?" in `if`-Ketten kodieren
- Aufrufe wiederholen, die eine Invariante duplizieren

## Muster: das Objekt ruft den Port

`objekt.operation(port)` ist `port.operation(objekt)` vorzuziehen.

Das Objekt besitzt die Invariante. Es weiß, welche Aufrufe es braucht und was deren Ergebnisse
bedeuten. Der Port ist eine hineingereichte Abhängigkeit — eine Naht, kein Entscheider.

```ts
// RICHTIG — das Objekt treibt, der Port ist die Naht
const outcome = await entry.attachTo(diary, slot);
if (outcome.kind === 'pending') return outcome;

// FALSCH — der Aufrufer treibt, das Objekt ist passive Daten
if (!(await diary.hasSlot(slotId))) return { kind: 'pending' };
if (!(await diary.isEditable(date))) return { kind: 'pending' };
const line = buildLine(entry.sourceId, entry.grams, entry.kcal);
await diary.markUsed(entry.sourceId);
await diary.markUsed(line.id);
```

## Was die besitzende Einheit besitzt

Sie besitzt:

- die Entscheidung, ob eine Operation möglich ist
- wie sie sich bildet oder in einen anderen Zustand übergeht
- die Benennung ihrer eigenen Wertbegriffe
- die Iteration über ihre eigenen Mitglieder

Sie besitzt nicht:

- IO (die Naht wird hineingereicht, nicht konstruiert)
- das Melden nach außen (der Orchestrator meldet, was sie erzeugt hat)
- Fehleraufbereitung oder Protokollierung

## Diese Regel in einer Client-App

Die eigentliche Domäne dieser App liegt beim Server; hier ist die besitzende Einheit die Stelle,
der eine Operation gehört — der Hook in [`src/api/hooks.ts`](../../src/api/hooks.ts), die Naht in
[`src/api/client.ts`](../../src/api/client.ts), der Wertetyp in
[`src/api/diaryDate.ts`](../../src/api/diaryDate.ts). Ein Screen, der dieselbe Frage über mehrere
Aufrufe zusammensetzt, statt sie einmal zu stellen, ist derselbe Befund wie oben. Die ausführliche
Form steht in [`../typescript/typescript-feature-slices.md`](../typescript/typescript-feature-slices.md).

## Checkliste

Bevor eine Arbeit als fertig gilt:

- [ ] Kein Orchestrator hat mehrstufige Abfragen, die einen Zustand rekonstruieren, den die
      besitzende Einheit kennt
- [ ] Freistehende Erzeugungsaufrufe stehen bei der besitzenden Einheit, nicht beim Aufrufer
- [ ] Operationen über Mitglieder sind ein Aufruf auf dem Ganzen, nicht N Aufrufe beim Aufrufer
- [ ] Der Rumpf des Orchestrators passt in etwa 10 Zeilen (nur Orchestrierung)
- [ ] Jede Verzweigung über fachlichen Zustand steht bei der besitzenden Einheit, nicht in
      `if`-Ketten beim Aufrufer
