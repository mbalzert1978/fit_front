# Die Registrierung nennt die vergebene Adresse weiter und prüft die Felder zuerst

## Lage

Seit [`2026-08-22-1100-passwort-vergessen-laeuft-ueber-einen-code-und-antwortet-immer-gleich.md`](2026-08-22-1100-passwort-vergessen-laeuft-ueber-einen-code-und-antwortet-immer-gleich.md)
gilt Aufzählbarkeit in diesem Repo als Mangel: das Anfordern eines Zurücksetzens antwortet auf
bekannte wie unbekannte Adresse mit 204, damit niemand eine Adressliste durchprobieren und zu jeder
erfahren kann, ob sie hier ein Konto hat. Die Registrierung tut genau das Gegenteil — sie antwortet
auf eine vergebene Adresse mit `409 email-already-registered` und nennt die Adresse wörtlich im
`detail` ([`../../pact/identity.pact.test.ts`](../../pact/identity.pact.test.ts)). Ein
Security-Review hat den Widerspruch aufgeschrieben. Ungeklärt war außerdem, in welcher Reihenfolge
der Server Feldregeln und Adresskonflikt prüft.

## Entscheidung

**Die 409 bleibt, mit der Adresse im `detail`.** Die Registrierung sagt weiterhin, dass eine Adresse
schon vergeben ist, und nimmt die Aufzählbarkeit auf diesem Weg in Kauf.

**Vor der Konfliktprüfung stehen die Feldregeln.** Eine Anfrage mit vergebener Adresse *und*
ungültigen Feldern wird mit **422** und feldweiser Begründung beantwortet, nicht mit 409. Der
Vertrag sichert das als eigene Interaktion zu.

**Jede Fehlerantwort trägt `Cache-Control: no-store`**, nicht nur die mit erkennbar
personenbezogenem Rumpf. `problemHeaders` in [`../../pact/setup.ts`](../../pact/setup.ts) trägt den
Header, damit er an jeder `problem()`-Antwort dieses Repos steht.

## Begründung

**Warum die 409 hier bleibt und beim Zurücksetzen nicht.** Die beiden Wege haben nicht denselben
Preis. Wer ein Passwort zurücksetzen will, hat ein Konto und kommt mit „falls es dieses Konto gibt,
ist eine Mail unterwegs" ans Ziel; die verschwiegene Auskunft kostet ihn im schlimmsten Fall einen
zweiten Versuch. Wer sich registriert, kommt ohne die Auskunft **gar nicht** ans Ziel: eine Maske,
die ohne Begründung ablehnt, ist kein Umweg, sondern eine Sackgasse. Die einzige Fassung, die beides
kann — Adresse geheim halten und den Nutzer trotzdem hineinlassen —, ist die, bei der die
Registrierung immer gleich antwortet und das Konto erst mit einem Code aus der Mail entsteht. Sie
verlangt einen Bestätigungsablauf mit eigenem Screen und eigenem Endpunkt und ist damit ein eigener
Vorgang, keine Zeile in einem Hotfix. Bis der gebaut ist, wäre eine halbe Fassung — gleiche Antwort,
aber sofortige Sitzung nur bei freier Adresse — keine Verbesserung, sondern dieselbe Auskunft in
anderer Verpackung: eine Sitzung, die nur im einen Fall kommt, *ist* die Antwort auf „gibt es dieses
Konto".

Damit steht die Rechnung aus
[`2026-08-20-0843-registrierung-legt-konto-und-sitzung-in-einem-aufruf-an.md`](2026-08-20-0843-registrierung-legt-konto-und-sitzung-in-einem-aufruf-an.md)
unverändert — sie hat den Preis dort schon benannt und in Kauf genommen. Neu ist nur, dass er jetzt
gegen eine Gegenentscheidung gehalten und für gültig befunden wurde.

**Warum die Reihenfolge festgenagelt wird.** Ohne Zusage ist sie offen, und das kostet unabhängig
von der Wahl oben. Prüft der Server den Konflikt zuerst, wird das Passwortfeld zum Orakel: wer
`password: "kurz"` schickt, bekommt bei freier Adresse 422 und bei vergebener 409 — und erfährt so,
ob ein Konto existiert, ohne je ein Passwort zu schicken, das ein Konto anlegen könnte. Solange die
409 steht, ist das nur eine bequemere Variante derselben Auskunft; fällt sie später weg, wäre es das
Loch, durch das sie zurückkäme. Die Zusage kostet nichts und schließt es vorab.

**Warum `no-store` an jeder Fehlerantwort steht und nicht nur an ausgewählten.** Die 409 führt die
E-Mail-Adresse im Klartext im Rumpf. Ohne den Header legen NSURLCache und OkHttp sie unverschlüsselt
ins Cache-Verzeichnis, wo ein Backup sie ohne Token liest — dieselbe Begründung, die bei
`privateHeaders` schon steht. Von Fall zu Fall zu entscheiden, welche Fehlerantwort personenbezogen
ist, hieße es am Wortlaut eines `detail` festzumachen, der der Gegenseite gehört und sich ohne
Vertragsbruch ändern darf. Also an allen.

## Folgen

- [`../../pact/setup.ts`](../../pact/setup.ts): `problemHeaders` trägt `Cache-Control: no-store`.
  Das wirkt auf **jede** `problem()`-Antwort und damit auf alle sechs Vertragsdateien unter
  [`../../pacts/`](../../pacts/), nicht nur auf Identity.
- [`../../pact/identity.pact.test.ts`](../../pact/identity.pact.test.ts) trägt eine neue
  Interaktion: vergebene Adresse mit zugleich zu kurzem Passwort und zu kurzem Namen ⇒ **422** mit
  `errors.password` und `errors.displayName`, kein `errors.email`. Sie benutzt den vorhandenen
  Zustand „Nutzer a@b.de existiert mit Passwort geheim123" wörtlich.
- Die 409-Interaktion und der Zweig in [`../../app/register.tsx`](../../app/register.tsx), der auf
  `problems.emailAlreadyRegistered` das E-Mail-Feld markiert, bleiben unverändert.
- Die Aufzählbarkeit der Registrierung ist ab jetzt keine Unachtsamkeit mehr, sondern eine
  festgehaltene Inkaufnahme. Sie fällt weg, wenn der Bestätigungsablauf kommt — siehe
  [`2026-08-22-1520-die-registrierung-liefert-eine-sitzung-ohne-nachweis-ueber-die-adresse.md`](2026-08-22-1520-die-registrierung-liefert-eine-sitzung-ohne-nachweis-ueber-die-adresse.md).
