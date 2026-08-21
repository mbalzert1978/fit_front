# Die `Location` gilt, wo die Ressource einen festen Ort hat

## Lage

Regel 2 in [`../regeln.md`](../regeln.md) führt seit `a30f26c` „`Location` an jeder `201`" in der
abschließenden Liste der Formvorgaben. Zugesichert ist sie an zwei von sieben `201` — den beiden
Registrierungs-Interaktionen in [`../../pact/identity.pact.test.ts`](../../pact/identity.pact.test.ts).
Ohne sie sind [`../../pact/catalog.pact.test.ts`](../../pact/catalog.pact.test.ts),
[`../../pact/diary.pact.test.ts`](../../pact/diary.pact.test.ts) (zwei Stellen) und
[`../../pact/recipes.pact.test.ts`](../../pact/recipes.pact.test.ts) (zwei Stellen). Da `regeln.md`
Regeln enthält und keine Zustandsbeschreibung, war das kein Rückstand, sondern ein Widerspruch —
derselbe Fall wie bei der 403, siehe
[`2026-08-21-1047-die-403-gilt-wo-eine-ressource-einen-eigentuemer-hat.md`](2026-08-21-1047-die-403-gilt-wo-eine-ressource-einen-eigentuemer-hat.md).

## Entscheidung

Die `Location` steht dort im Vertrag, wo die erzeugte Ressource einen **festen Ort** hat. Trägt ihre
Adresse eine erzeugte Id, nennt der Rumpf sie, und der Screen liest sie von dort. Regel 2 trägt ab
jetzt diesen Wortlaut.

## Begründung

Regel 2 nimmt die Form von der Lese-Regel aus mit einer Begründung, die sie selbst nennt: „eine
fehlende Formzusage macht unsicheres Verhalten vertragskonform". Das trägt für jeden anderen
Eintrag der Liste. Ohne `Authorization` darf eine Anfrage ungeschützt hinausgehen, ohne
`Cache-Control: no-store` dürfen Gesundheitsdaten im Cache liegen bleiben, ohne `Idempotency-Key`
darf ein Schreibaufruf zweimal wirken. Eine fehlende `Location` erlaubt nichts davon. Sie war in
eine Liste geraten, deren Begründung sie nicht erfüllt.

Die engere Fassung steht bereits in
[`2026-08-20-1236-konto-und-sitzung-sind-zwei-benannte-teile.md`](2026-08-20-1236-konto-und-sitzung-sind-zwei-benannte-teile.md):
„Ein zweiter Name für dieselbe Ressource, den niemand benutzt, ist schlechter als ein einziger, der
stimmt." Dort führte das zu `Location: /api/v1/identity/me` statt einer id-tragenden URI. Genau
dieselbe Überlegung gilt an den übrigen fünf Stellen — nur fällt sie dort gegen die `Location`
insgesamt aus: der Ort der neuen Ressource trägt eine erzeugte Id, die Id steht ohnehin im Rumpf,
und von dort holt der Screen sie: [`../../app/recipe/[id].tsx`](../../app/recipe/[id].tsx) schaltet
nach dem Speichern mit `saved.id` auf die neue Route um. Zugesichert würde ein Pfad, den kein
Aufrufer je liest — ein Matcher gegen Regel 2 Satz 1.

Den Ausschlag gibt `POST /recipes/{id}/portions-to-diary`. Die Antwort ist eine `201` mit
`entryId`: die erzeugte Ressource liegt unter einem **Tagebuch**-Pfad, den dieser Endpunkt nicht
besitzt. Eine `Location` dort zuzusichern hieße, dem Backend eine Pfadstruktur über eine
Kontextgrenze hinweg vorzuschreiben — mehr, als ein Consumer über einen fremden Kontext wissen darf.

Nachgezogen wird die Regel und nicht der Vertrag: die zwei bestehenden Zusagen sind richtig, und
fünf weitere anzulegen kostete Kopplung ohne Leser.

## Folgen

- Regel 2 in [`../regeln.md`](../regeln.md) nennt die Bedingung, unter der die `Location` gilt.
- Kein Vertrag ändert sich. Die beiden Registrierungs-`201` behalten ihre `Location`, die übrigen
  fünf bleiben ohne, und beides ist jetzt regelkonform statt geduldet.
- Wer eine `201` hinzufügt, deren Ressource einen festen Ort hat, sichert die `Location` zu — wie
  `/identity/register` auf `/identity/me`.
- [`2026-08-20-1236-konto-und-sitzung-sind-zwei-benannte-teile.md`](2026-08-20-1236-konto-und-sitzung-sind-zwei-benannte-teile.md)
  bleibt in allen Punkten gültig; diese Datei löst nichts ab, sie zieht die Regel nach.
