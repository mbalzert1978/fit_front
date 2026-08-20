# Der Satz zum Vorfall steht in `detail`, und kein Satz geht verloren

## Lage

Nach der Entscheidung von 12:01 kam die Aufforderung, im Provider-Repo nachzusehen, wie die
Fehlerantworten dort wirklich aussehen. Gelesen wurden `src/api/problem_details.py`,
`src/api/identity/register_user_router.py`, die Regeln in
`src/contexts/identity/application/register_user/validators/register_user_rules.py` und der
Textkatalog `src/api/resources/de-DE.json`.

Drei Befunde ändern etwas an dieser Seite:

1. Der 409 trägt **kein** `errors` — der Satz zur vergebenen Adresse steht in `detail`
   („Die E-Mail-Adresse … ist bereits mit einem anderen Konto verknüpft"). Die Zusage von 12:01
   verlangte ihn an einer Stelle, an der er nicht steht und nach RFC 7807 auch nicht hingehört.
2. Die Feldschlüssel sind die camelCase-Namen des Anfrage-Rumpfes (`email`, `password`,
   `displayName`) — und **auch `locale` und `timeZoneId`**. Beide fragt diese Maske nicht ab.
3. Die Sätze sind weit genauer als die Platzhalter im Vertrag: „Die E-Mail-Adresse benötigt genau
   ein @-Zeichen (gefunden: 3)", „Das Passwort muss mindestens 10 Zeichen lang sein (aktuell: 4)".

## Entscheidung

**Der 409 wird an `detail` gelesen, nicht an `errors`.** Der Vertrag sichert `detail` zu; die Maske
zeigt den Satz in der Zeile unter den Feldern und färbt das E-Mail-Feld, weil genau dieses gemeint
ist. `ApiError` reicht `detail` dafür heraus.

**Die Zeile unter den Feldern gehört dem Server.** Reihenfolge: Sätze zu Feldern, die es hier nicht
gibt → `detail` → eigener Satz. Einen eigenen hat die Maske nur noch für den Netzfehler und als
letzten Rückfall.

**Kein Satz verschwindet.** `splitHints` in [`../../app/register.tsx`](../../app/register.tsx)
trennt, was an ein Feld gehört, von dem, was hier kein Feld hat. Eine Begründung zu `locale` oder
`timeZoneId` landet sichtbar in der Zeile, statt ins Leere zu laufen.

**Die Beispielsätze im Vertrag sind echte Sätze.** Nicht „Keine gültige E-Mail-Adresse", sondern der
Wortlaut aus dem Katalog der Gegenseite — er zeigt, welchen Platz die Maske einplanen muss.

## Begründung

**Warum `detail` und nicht `errors` für den 409.** Zwei Gründe fallen zusammen: RFC 7807 hat für den
Satz zu **diesem** Vorfall ein eigenes Feld, und eine vergebene Adresse verstößt gegen keine
Feldregel — sie ist ein Zustand. Eine Bestellung, die `errors` verlangt hätte, wäre nach Regel 8
zulässig gewesen, aber sie hätte eine Änderung drüben erzwungen, um einen Satz an eine unpassende
Stelle zu verschieben. Bestellt wird, was gebraucht wird, nicht was bequem zu lesen ist.

**Warum die stummen Sätze das eigentliche Fundstück sind.** Ohne den Blick ins Regelwerk wäre nie
aufgefallen, dass der Server auch `locale` und `timeZoneId` prüft. Die Maske hätte die Begründung
entgegengenommen, keinem Feld zuordnen können und **nichts** angezeigt: kein roter Rand, kein Satz,
nur ein Knopf, der wieder angeht. Ein stummer Fehlschlag ist der teuerste von allen — er sieht wie
ein Fehler der App aus und ist von außen nicht zu unterscheiden von „nichts passiert".

## Abweichung zur Backend-Spezifikation

Drei Punkte liegen auseinander. Keiner davon wird hier einseitig nachgezogen (Regel 8):

1. **`type` ist dort eine URI** (`https://api.example/errors/validation-failed`), hier ein
   Kurzname (`validation-failed`). Betroffen ist **jeder** Vertrag dieses Repos, nicht nur
   Identity, und Regel 3 nennt `type` ausdrücklich als festen Wert. Die Auflösung ist offen und
   gehört entschieden, bevor irgendein Vertrag verifiziert wird.
2. **Der Erfolgsfall der Registrierung sieht dort anders aus:** `201` mit
   `{userId, email, displayName, locale, timeZoneId, registeredAt}`, **ohne** `data`/`meta`-Umschlag
   und **ohne** Token-Paar. Diese Seite bestellt beides (Entscheidung von 08:43: ein Aufruf, Sitzung
   sofort). `login`, `refresh` und `logout` gibt es dort noch gar nicht — die Bestellung steht also
   noch vollständig aus und ist keine Abweichung im Streit, sondern eine offene Lieferung.
3. **Die Zeitzone muss dort eine bekannte IANA-Id sein**, sonst `validation-failed` mit einer
   Begründung an `timeZoneId`. Diese Seite hat am selben Tag um 09:36 bestellt, dass eine
   Versatz-Kennung wie `GMT+01:00` die Registrierung **nicht** scheitern lässt — und genau die kann
   Android liefern. Beides zugleich geht nicht: entweder nimmt die Gegenseite eine solche Kennung an
   (und bildet sie auf einen festen Versatz ab), oder ein Gerät mit unaufgelöster Zone kann sich
   nicht registrieren, ohne dass ihm jemand eine Zone zu wählen gibt. Das ist die dringendste der
   drei Fragen, weil sie einen Nutzer aussperrt.

## Folgen

- Diese Datei **löst genau einen Punkt** der Entscheidung von 12:01 ab: dass der 409 `errors` trägt.
  Alles andere dort bleibt gültig — `validation-failed` mit `errors`, kein `password-too-weak`,
  `Accept-Language` an den Registrierungs-Interaktionen, die Sätze am Feld.
- Die zugesicherte Interaktion „Registrierung mit einer Versatz-Zone" (201) bleibt vorerst stehen.
  Sie ist die Bestellung, über die Punkt 3 zu führen ist; fällt die Abstimmung anders aus, geht sie
  mitsamt der Entscheidung von 09:36 in eine neue über.
- Was die Gegenseite an Regeln prüft, steht weiterhin **nirgends in diesem Repo**. Gelesen wurde
  dort, um zu verstehen, was ankommt — nicht, um es hier nachzubauen.
