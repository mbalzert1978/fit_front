# Konto und Sitzung sind zwei benannte Teile

## Lage

Die Antwort auf `register` und `login` war ein flaches Token-Paar mit einem angehängten `user.id`.
Das ist weder eine Sitzung noch eine Ressource, sondern beides halb. Sichtbar wurde es, als die
Zone zurückkommen musste (siehe
[`2026-08-20-1230-die-zone-wird-normalisiert-und-kommt-zurueck.md`](2026-08-20-1230-die-zone-wird-normalisiert-und-kommt-zurueck.md)):
es gab keinen Ort, an den sie gehört hätte.

Dazu kam, dass die 201 die erzeugte Ressource nicht benannte. RFC 9110 §15.3.2 sagt, eine 201
**soll** sie über `Location` nennen — und die App hatte ohnehin ein Loch: nach einem Kaltstart
weiß sie nichts über ihren Nutzer außer dem, was im sicheren Speicher liegt. Kein Screen konnte
sagen, auf wessen Daten man schaut.

## Entscheidung

`register` und `login` antworten mit `data: { user, session }`. Die Erneuerung antwortet mit
`data: { session }`. Die 201 trägt `Location: /api/v1/identity/me`, und `GET /identity/me` gibt
dasselbe `user`-Objekt.

```json
{
  "data": {
    "user": { "id": "…", "email": "…", "displayName": "…", "locale": "de", "timeZoneId": "+01:00" },
    "session": { "tokenType": "Bearer", "accessToken": "…", "expiresIn": 900,
                 "refreshToken": "…", "refreshExpiresIn": 5184000 }
  },
  "meta": { "requestId": "…", "timestamp": "…", "apiVersion": "1" }
}
```

## Begründung

**Warum zwei benannte Teile.** `session` heißt damit überall dasselbe — dieselben fünf Felder bei
`register`, `login` und `refresh`, ein Ableser im ganzen Repo (`storeSession`). Und `user` ist die
Repräsentation der erzeugten Ressource, also genau das, was eine 201 bedeutet. Über sie kommt
zurück, was der Server aus `locale` und `timeZoneId` gemacht hat.

**Warum die Erneuerung kein `user` bekommt.** Sie läuft bei jedem Start und nach jedem abgelaufenen
Access-Token. Ein Konto mitzuliefern hieße, auf diesem Pfad jedes Mal den User-Store anzufassen —
dieselbe Überlegung, aus der das Backend die Sprache nicht aus `User.locale` nimmt, sondern aus
`Accept-Language`.

**Warum `registeredAt` nicht bestellt ist.** Kein Screen liest es, und es ist keine Formvorgabe.
Regel 2 gilt auch dann, wenn ein Feld schon geliefert wird und nichts kostet: der Vertrag verlangt
es nicht, der Server darf es senden.

**Warum `Location` auf `/identity/me` zeigt und nicht auf `/identity/users/{id}`.** Die strenge
Lesart wäre eine id-tragende URI. Die gäbe es hier aber nur, damit sie im Header stehen kann — kein
Screen liest je ein fremdes Konto, und keiner wird es. Ein zweiter Name für dieselbe Ressource,
den niemand benutzt, ist schlechter als ein einziger, der stimmt. `Location` zeigt deshalb auf die
Ressource, wie diese API sie kennt.

**Warum `GET /identity/me` einen Aufrufer bekommt und nicht nur einen Vertrag.** Regel 6 verbietet
die Zusage ohne Bedarf. Also gibt es den Bedarf jetzt: eine Kontozeile in
`app/(tabs)/settings.tsx` mit Name und E-Mail. Sie ist klein, sie war überfällig, und sie ist der
Ort, an dem später die Abmelde-Schaltfläche steht (offener Punkt 9).

**Warum die Token-Namen bei camelCase bleiben.** `tokenType`, `accessToken`, `expiresIn`,
`refreshToken` sind RFC 6749 §5.1, nur in camelCase statt snake_case — die ganze API spricht
camelCase, und ein Mischbestand wäre schlimmer als eine benannte Abweichung.
`refreshExpiresIn` ist eine Erweiterung; für die Laufzeit des Refresh-Tokens hat der RFC kein Feld.
Die Laufzeiten bleiben **relativ in Sekunden** und werden keine Zeitstempel: der Client hat eine
eigene Uhr, und die geht falsch.

## Abweichung zur Backend-Spezifikation

Heute antwortet der Server auf die Registrierung mit einem Objekt ohne Umschlag und ohne Token
(`userId`, `email`, `displayName`, `locale`, `timeZoneId`, `registeredAt`); `login`, `refresh`,
`logout` und `me` gibt es dort noch nicht. Der Vertrag bestellt sie. Nach Regel 8 ist das der
vorgesehene Weg, und die Abstimmung darüber hat stattgefunden.

Zwei Punkte weichen bewusst von der wörtlichen Lesart der Norm ab und stehen deshalb hier statt in
einer Fußnote: `Location` zeigt auf eine caller-relative URI (siehe oben), und die Feldnamen der
Sitzung folgen OAuth 2 nur der Bedeutung nach, nicht der Schreibweise.

## Folgen

- [`../../src/api/types.ts`](../../src/api/types.ts): `AuthTokens` ist ersetzt durch `Session`,
  `AccountUser` und `SignIn`.
- [`../../src/api/client.ts`](../../src/api/client.ts): `storeTokens` heißt `storeSession` und nimmt
  nur die Sitzung; die Erneuerung liest `data.session`.
- [`../../src/api/session.ts`](../../src/api/session.ts): `login` und `register` liefern `SignIn`.
- Neu: `useMe()` in [`../../src/api/hooks.ts`](../../src/api/hooks.ts), der Cache-Schlüssel `me` und
  die Kontozeile in `app/(tabs)/settings.tsx`.
- Der Vertrag der Identität hat zwei Interaktionen mehr: `GET /identity/me` und deren 401.
