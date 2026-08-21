# Die Frist lebt im Cache und hängt am Rumpf

## Lage

`2026-08-21-1329-die-kontoloeschung-nennt-ihre-frist.md` beschreibt den Weg der Kontolöschung in
drei Schritten und sagt, die vorgemerkte Löschung lebe „in der Antwort der Mutation". Genau das war
zu wenig: die Antwort lag im Observer des Einstellungs-Screens, und der Screen wird bei jedem
Routenwechsel abgebaut. Wer nach der angenommenen Löschung einmal weiterschaute, kam auf eine Maske
zurück, die wieder nur den Knopf `Konto löschen` zeigte — die Frist war weg, obwohl sie galt.
Zugleich hing die Erkennung der Annahme an `isSuccess` und der Rumpf wurde separat auf Vorhandensein
geprüft, und die Maske trägt einen vierten Knopf, den 1329 nicht nennt.

## Entscheidung

Die vorgemerkte Löschung lebt unter dem Schlüssel `qk.accountDeletion()` im Mutations-Cache:
`useDeleteAccount` in [`../../src/api/hooks.ts`](../../src/api/hooks.ts) trägt `mutationKey` und
`gcTime: Infinity`, die Oberfläche liest sie über `useMutationState` und nicht über den Observer
eines Screens. Sie erkennt die angenommene Löschung an den **Daten** der Mutation und nicht an
ihrem Status. Und die geöffnete Maske trägt neben dem Feld und dem Löschknopf einen vierten Knopf
`Abbrechen`, der sie schließt.

## Begründung

**Der Cache statt des Observers.** Die naheliegende Alternative wäre ein Zustand im Screen selbst
gewesen — dann hätte er denselben Abbau nicht überlebt, oder er müsste über einen Kontext nach oben
gehoben werden, den außer diesem einen Weg niemand braucht. Der Mutations-Cache führt diesen Zustand
ohnehin; ihn zu benennen kostet einen Schlüssel und hält die Frist so lange, wie die App läuft.
`gcTime: Infinity`, weil eine eingesammelte Mutation dieselbe leere Maske ergäbe wie gar keine.
Einen **Neustart** überlebt sie weiterhin nicht — `GET /identity/me` kennt das Merkmal nicht, und es
dort zu bestellen bleibt Issue #37.

**Ein Wächter statt zweier.** Der Vertrag sichert `deletionEffectiveUtc` als `M.datetime` zu, und
derselbe Vertrag sichert damit den Rumpf zu, in dem es steht. Ein Erfolg ohne Rumpf ist nach diesem
Vertrag kein möglicher Zustand. Zwei Wächter — `isSuccess` und ein Zweig für die fehlende Frist —
prüften dieselbe Zusage zweimal und konnten auseinanderlaufen: der eine sagte „angenommen", der
andere hätte gleich darauf nichts anzuzeigen gehabt. Deshalb hängt die Anzeige an den Daten, und
der frühere Wächter samt seinem Zweig für die fehlende Frist ist entfallen.

**Der vierte Knopf.** Wer das Feld öffnet, muss es auch wieder schließen können, ohne den Weg zu
gehen — sonst wäre das Öffnen selbst schon halb die Entscheidung. `Abbrechen` setzt darüber hinaus
die Mutation zurück: Schließen heißt auch, den letzten Fehlschlag zu vergessen. Sonst stünde beim
nächsten Öffnen „Keine Verbindung" rot unter einem leeren Feld, über einen Versuch, den es in dieser
Runde nie gab.

## Folgen

- Diese Datei löst
  [`2026-08-21-1329-die-kontoloeschung-nennt-ihre-frist.md`](2026-08-21-1329-die-kontoloeschung-nennt-ihre-frist.md)
  **nur in den drei oben genannten Punkten** ab: wo die Frist lebt, woran die Annahme erkannt wird,
  und dass die geöffnete Maske einen vierten Knopf trägt. **Alles Übrige aus 1329 bleibt gültig** —
  die drei Schritte, das getippte Wort statt eines Passworts, der Fristsatz mit `Abmelden` statt
  einer stillen Abmeldung, kein Weg zurück innerhalb der Frist, und alles, was dort über den Vertrag
  und die Sätze in [`../../src/i18n/`](../../src/i18n/) steht. 1329 selbst bleibt unverändert liegen.
- Der Satz aus 1329, die Löschung überlebe einen Neustart nicht, gilt weiter; der Grund dafür ist
  jetzt allein `GET /identity/me` und nicht mehr der Observer eines Screens.
- Was der Vertrag zusichert, bleibt unverändert und steht weiterhin allein in
  [`2026-08-21-1329-die-kontoloeschung-nennt-ihre-frist.md`](2026-08-21-1329-die-kontoloeschung-nennt-ihre-frist.md):
  **202** mit `deletionEffectiveUtc` im Umschlag und kein `Idempotency-Key`.
- `qk.accountDeletion()` in [`../../src/api/queryKeys.ts`](../../src/api/queryKeys.ts) ist ein
  Mutations-Schlüssel und kein Abfrage-Schlüssel; er steht trotzdem dort, damit es für Schlüssel
  keine zweite Stelle gibt.
- Die Kommentare an diesen Stellen schrumpfen nach
  [`2026-08-21-1330-ein-kommentar-traegt-ein-warum-oder-geht.md`](2026-08-21-1330-ein-kommentar-traegt-ein-warum-oder-geht.md)
  auf den Verweis auf diese Datei und auf 1329.
