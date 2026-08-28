# Beschriftungen

Sichtbare Sätze gehören ausschließlich nach [`src/i18n/`](../../src/i18n/) und kommen über
`useTexts()` in den Screen — Knöpfe, Überschriften, Platzhalter, Vorlesetexte und die eigenen
Rückfallsätze eingeschlossen. Der Suchlauf, der das belegt, steht als Regel in
[`eslint.config.js`](../../eslint.config.js) und läuft mit `./make.ps1 lint`; er greift für
[`app/`](../../app/) und [`src/components/`](../../src/components/) und lässt nur Einheiten durch.

Deutsch ist vollständig, jede weitere Sprache ein `Partial` davon: fehlt ein Satz, erscheint der
deutsche und niemals ein Schlüssel. Welche Sprache gilt, entscheidet **nicht** diese Schicht,
sondern die Naht [`src/language.ts`](../../src/language.ts) — dieselbe, die `Accept-Language` füllt.
Zwei Quellen liefen auseinander, und der Nutzer läse englische Serversätze in einer deutschen Maske.

Was der **Server** sagt, wird nicht übersetzt: `title`, `detail` und jeder Satz in `errors` kommen
in der Sprache der Anfrage und gehen unverändert auf den Schirm.
