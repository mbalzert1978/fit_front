# Der Idempotency-Key hängt am ganzen Rumpf

## Lage

`2026-08-20-1242-die-registrierung-traegt-einen-idempotency-key.md` legt fest: „derselbe Rumpf ist
derselbe Schlüssel, ein geänderter Rumpf ein neuer." Abgeleitet wurde er aber nur aus den getippten
Feldern — `email`, `password`, `displayName`. Hinaus ging mehr: `locale` und `timeZoneId`, die
`register()` selbst aus den Nähten zog. Wechselt zwischen zwei Versuchen die Sprache oder die Zone —
Sprachumstellung in den Einstellungen, ein Flug, ein Grenzübertritt —, geht ein **anderer** Rumpf
unter dem **alten** Schlüssel hinaus. Das ist genau der Fall, den derselbe ADR `idempotency-key-reused`
nennt: kein Wiederholen, sondern ein Fehler.

## Entscheidung

Der Rumpf der Registrierung entsteht an genau einer Stelle, `registrationRequest()` in
[`../../src/api/session.ts`](../../src/api/session.ts), und der `Idempotency-Key` wird aus eben
diesem Rumpf abgeleitet. `register()` nimmt ihn fertig entgegen und schickt ihn, ohne noch etwas
hinzuzufügen.

## Begründung

**Warum nicht einfach Sprache und Zone in die Ableitung aufnehmen.** Das hätte die eine Zeile
repariert und die Ursache stehen lassen: zwei Stellen, an denen derselbe Rumpf gebildet wird, eine
für den Schlüssel, eine für die Anfrage. Sie können auseinanderlaufen, ohne dass es jemand merkt,
und das nächste Feld, das die Anfrage mitbringt, läuft in denselben Fehler. Eine Stelle kann das
nicht.

**Warum die Maske den Schlüssel weiter selbst zieht.** Der Grund aus dem ADR von 12:42 gilt
unverändert: nur die Maske weiß, was ein Versuch ist. Sie bildet jetzt zuerst den Rumpf und hängt
den Schlüssel daran — die Reihenfolge ändert sich, die Zuständigkeit nicht.

**Warum `registrationRequest()` in der Maske und nicht vor dem `try` steht.** `time.timeZoneId()`
wirft, wenn die Zone nicht zu ermitteln ist. Der Aufruf steht deshalb im `try` der Maske, wo dieser
Wurf als Fehler ankommt wie jeder andere — davor hätte er den Bildschirm ohne Hinweis verlassen.

## Folgen

- `register(request: RegistrationRequest, idempotencyKey)` nimmt den fertigen Rumpf; der Typ
  `Registration` bleibt, was er war: das, was der Nutzer tippt.
- Von `2026-08-20-1242-die-registrierung-traegt-einen-idempotency-key.md` wird **ein Punkt der
  Folgen abgelöst** — die Signatur `register(r, idempotencyKey)` und die Aussage, `useIdempotencyKey()`
  halte den Schlüssel an den getippten Daten fest. Alles Übrige dort gilt unverändert weiter,
  besonders die Entscheidung selbst und ihre Begründung.
- Kein Vertrag ändert sich: der Rumpf, der hinausgeht, ist derselbe wie zuvor. Die fünf
  Registrierungs-Interaktionen in [`../../pact/identity.pact.test.ts`](../../pact/identity.pact.test.ts)
  rufen `registrationRequest()` mit auf, damit der Test dieselbe Naht nimmt wie die Maske.
- Offener Punkt 11 — die fehlende Zusage über einen wiederverwendeten Schlüssel mit abweichendem
  Rumpf — bleibt offen. Er wird durch diese Änderung seltener gebraucht, nicht überflüssig.
