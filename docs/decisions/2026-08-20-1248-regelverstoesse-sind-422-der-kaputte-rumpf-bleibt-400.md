# Regelverstöße sind 422, der kaputte Rumpf bleibt 400

## Lage

Das Backend trennt intern zwei Dinge und gibt beiden denselben Status. Strukturelle Fehler aus
Pydantic — fehlendes Pflichtfeld, unbekanntes Feld, kaputtes JSON, Rumpf ist kein Objekt — laufen
durch `validation_exception_handler`. Fachliche Verstöße aus dem Regelwerk des Use Case —
`email-needs-exactly-one-at-sign`, `password-too-short` — kommen als `RegistrationInvalid`. Beides
antwortet mit **400** und derselben `type`-Kennung.

Für die Maske sind das zwei verschiedene Welten, und sie kann sie nicht auseinanderhalten.

## Entscheidung

Verstöße gegen Fachregeln sind **422 Unprocessable Content** mit `type` `validation-failed`. Ein
kaputter Rumpf bleibt **400** und bekommt die eigene Kennung `malformed-request`.

## Begründung

**Warum die Trennung nicht Feinschmeckerei ist.** Bei 422 hat der Nutzer etwas falsch eingegeben
und bekommt seine Felder angestrichen. Bei 400 haben **wir** etwas Falsches geschickt — ein Feld
vergessen, einen Namen verdreht, eine Fassung zu alt —, und ihm ist damit nichts vorzuwerfen. Ihn
in diesem Fall auf seine Eingaben zu stoßen, wäre die falsche Auskunft; die Feldnamen in `errors`
wären dann ohnehin Namen aus dem Rumpf und keine, die auf dem Bildschirm stehen.

**Warum 422 und nicht 400 für die Fachregeln.** RFC 9110 §15.5.21: der Inhaltstyp war verstanden,
die Syntax war richtig, die enthaltenen Anweisungen ließen sich nicht ausführen. Genau das ist eine
zu kurze Passwortlänge. §15.5.1 beschreibt 400 als den allgemeinen Fall eines Client-Fehlers, bei
dem der Server die Anfrage nicht verarbeiten *kann* — dazu passt der kaputte Rumpf, nicht der
falsche Wert.

**Warum `malformed-request` keine Interaktion im Vertrag hat.** Kein Aufrufer kann den Fall
erzeugen: `register()` baut den Rumpf selbst, und wenn er falsch wäre, wäre das ein Fehler, der im
Vertragslauf auffiele. Eine Interaktion dafür hieße, absichtlich Unsinn an den Mock zu schicken —
das prüft nichts. Die Kennung steht in
[`../../src/api/problems.ts`](../../src/api/problems.ts), damit die Gegenseite weiß, welche sie
nehmen soll; mehr braucht es nicht.

## Abweichung zur Backend-Spezifikation

Ja: heute ist beides 400 mit `validation-failed`. Bestellt sind 422 für die Fachregeln und eine
eigene Kennung für den strukturellen Fall.

## Folgen

- Die beiden Interaktionen „Registrierung mit ungültiger E-Mail …" im Vertrag der Identität
  antworten mit 422; der Consumer-Test prüft den Status ausdrücklich mit.
- `problems.malformedRequest` ist neu in [`../../src/api/problems.ts`](../../src/api/problems.ts).
- Im Client ändert sich **nichts**: `splitHints` in `app/register.tsx` legt Feldnamen, für die es
  keine Zeile gibt, ohnehin in die allgemeine Zeile. Eine Verzweigung auf den Status wäre eine
  ohne Wirkung, und die gibt es hier nicht.
