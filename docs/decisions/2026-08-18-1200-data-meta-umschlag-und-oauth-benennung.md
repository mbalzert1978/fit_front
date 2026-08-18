# `data`/`meta`-Umschlag und OAuth-Benennung in der HTTP-Schicht

## Lage

Die Antworten der API waren nackte Nutzlasten: mal ein flaches Objekt, mal ein Array, bei der Suche
ein handgemachter `{ items: [...] }`-Umschlag — drei Formen für dieselbe Sache. Die Anmeldung gab
`userId`, `accessToken`, `refreshToken` und `expiresInSeconds` zurück, ohne Tokentyp und ohne
Laufzeit des Refresh-Tokens. Zugesichert war in den Verträgen nur der Rumpf; Status stand da, Header
nur als `Content-Type`. Damit fehlte jeder Antwort ein Platz für Begleitinformation, und die
Anmeldung wich in der Benennung von der Konvention ab, gegen die jeder Leser sie liest.

## Entscheidung

Jede Antwort mit Rumpf trägt einen Umschlag: die Nutzlast unter `data`, die Begleitinformation unter
`meta` (`requestId`, `timestamp`, `apiVersion`). Auspacken passiert genau einmal, in
[`src/api/client.ts`](../../src/api/client.ts); kein Hook und kein Screen sieht den Umschlag.
Zeitspannen heißen `expiresIn` bzw. `…ExpiresIn` und sind Sekunden — die Einheit steht in der
Zusage, nicht im Feldnamen. Der Tokentyp wird als `tokenType: "Bearer"` übertragen. Identitäten sind
Objekte (`user.id`), keine flachen Felder. Zugesicherte Antworten enthalten `status`, `Content-Type`
und die fachlich relevanten Header: `Cache-Control: no-store` und `X-Request-Id` bei Auth-Antworten,
`ETag` beim Rezeptblatt und beim Speichern. Fehlerantworten bleiben unangetastetes
`application/problem+json` — sie tragen keinen Umschlag.

## Begründung

**Warum ein Umschlag und nicht weiter flach.** Die naheliegende Alternative war, alles zu lassen und
nur die vier Auth-Felder umzubenennen. Sie scheitert daran, dass es keinen Ort für Information gibt,
die zur Antwort gehört, aber nicht die Antwort ist. Eine `requestId` als weiteres Wurzelfeld ist bei
Objekt-Antworten möglich und bei Array-Antworten unmöglich — genau deshalb hatte die Suche schon ihr
eigenes `items`. Der Umschlag macht aus zwei Sonderfällen einen Normalfall: `data` ist Objekt oder
Array, `meta` steht immer daneben. Dass `items` dabei ersatzlos verschwindet, ist der Beweis, dass
der Umschlag keine Schicht hinzufügt, sondern eine vorhandene vereinheitlicht.

**Warum genau einmal ausgepackt wird.** Ein Umschlag, der bis in die Hooks durchschlägt, wäre eine
Verschlechterung: 24 Aufrufer müssten `.data` schreiben, und jeder, der es vergisst, bekommt einen
Laufzeitfehler statt eines Typfehlers. `api<T>()` gibt weiterhin `T` zurück; `apiWithMeta<T>()`
daneben gibt Nutzlast, `meta` und Header — beide gehen durch dieselbe `fetch`-Hülle, es gibt
weiterhin genau einen Weg nach draußen.

**Warum OAuth-Benennung.** `expiresInSeconds` trägt die Einheit im Namen. Das liest sich
selbsterklärend, ist aber genau die Stelle, an der ein Umbau auf Millisekunden später schweigend
schiefgeht — der Name lügt dann, statt zu brechen. `expiresIn` mit einer Zusage „Sekunden" ist
brüchiger im Wortlaut und robuster in der Sache. `tokenType` explizit zu übertragen kostet ein Feld
und erspart, dass `Bearer ` im Client fest verdrahtet steht. `user.id` statt `userId` schafft den
Platz, an den E-Mail oder Anzeigename später wachsen, ohne dass ein zweites flaches Feld daneben
entsteht.

**Warum der ETag in den Header zieht.** Er stand im Rumpf und ging als `If-Match` zurück — fachlich
richtig, an der falschen Stelle. `ETag` ist der Header, den Zwischenspeicher und Proxys verstehen;
im Rumpf ist er für sie unsichtbar. Die Verträge sichern ihn jetzt dort zu, wo er hingehört, und
`useRecipe` heftet ihn ans Rezept, damit der Speichern-Pfad im Screen unverändert bleibt.

**Warum `meta` nur locker zugesichert wird.** [`docs/regeln.md`](../regeln.md) Regel 2 sagt: nur
prüfen, was ein Screen wirklich liest. Kein Screen liest `meta`. Zugesichert ist deshalb nur, dass
es da ist und aus drei Zeichenketten besteht — mit Typ-Matchern, ohne festen Wert. So bricht eine
andere ULID oder ein anderer Zeitstempel keine Verifikation, und die Regel bleibt heil.

## Abweichung zur Backend-Spezifikation

`../fit_back/docs/Draft/BACKEND.md` kennt **keinen** dieser Punkte. Die Identity-Contracts geben
flach `{ "userId", "accessToken", "refreshToken", "expiresInSeconds" }`; ein `data`/`meta`-Umschlag,
`tokenType`, `expiresIn`, `refreshExpiresIn` und `user.id` kommen dort nirgends vor. Die Abweichung
betrifft alle fünf Punkte oben und alle Kontexte, nicht nur Identity.

Das ist bewusst so und deckt sich mit [`docs/regeln.md`](../regeln.md) Regel 8: der Vertrag ist eine
Bestellung, keine Abbildung. Was hier steht, ist die Form, die die App braucht; das Backend zieht
nach oder widerspricht bei der Verifikation im eigenen Repo. Von hier aus wird `BACKEND.md` gelesen
und nicht geändert.

Ein Detail wurde dabei **nicht** aus dem Auftragsbeispiel übernommen: dort steht
`refreshExpiresIn: 2592000` (30 Tage), `BACKEND.md` §8 nennt 60 Tage. Der Vertrag führt 5 184 000 —
die Spezifikation hat recht, wo es keinen Grund gibt, von ihr abzuweichen, und der Wert selbst ist
ohnehin nur Beispiel hinter einem `M.integer`.

## Folgen

- `src/api/types.ts` trägt `Meta`, `Envelope<T>` und `AuthTokens`. Der frühere `Session`-Typ in
  `src/api/session.ts` ist damit hinfällig und entfernt.
- `api<T>()` liefert unverändert `T`. Wer `meta` oder einen Header braucht, nimmt `apiWithMeta<T>()`
  — nicht `fetch`.
- `GET /search` liefert die Trefferliste direkt unter `data`. `{ items: [...] }` gilt nicht mehr;
  `app/(tabs)/scan.tsx` liest die Liste direkt.
- `recipe.etag` bleibt als Feld am Typ, kommt aber aus dem `ETag`-Header. Wer ein Rezept über einen
  anderen Weg als `useRecipe`/`useSaveRecipe` lädt, bekommt kein `etag` und kann nicht speichern.
- Ungültig wird jede Annahme, eine Antwort sei ihr eigener Rumpf. Neue Endpunkte antworten im
  Umschlag; ein Vertrag ohne `data`/`meta` ist ab jetzt ein Fehler, kein Sonderfall.
- Offen bleibt die Zustimmung der Gegenseite. Bis sie da ist, ist dieser Umschlag eine Bestellung,
  die noch niemand angenommen hat.
