# Der dritte Feldschlüssel steht im Vertrag

## Lage

`2026-08-20-1201-regelverstoesse-kommen-feldweise-aus-problem-json.md` hält fest: die Schlüssel in
`errors` sind feste Werte — `displayName`, `email`, `password` —, „weil der Screen an ihnen
entscheidet, welches Feld er anstreicht". Zugesichert waren nur zwei. `app/register.tsx` streicht
das Namensfeld an `fields.displayName` an, ohne dass irgendein Vertrag diesen Schlüssel verlangt.
Die Gegenseite dürfte ihn `name` nennen: die Verifikation bliebe grün, und das Namensfeld bliebe
stumm.

## Entscheidung

Die beiden `validation-failed`-Interaktionen der Registrierung schicken einen Namen, den der Server
ablehnt, und sichern `errors.displayName` zu — neben `email` und `password`. Alle drei Felder, die
die Maske anstreichen kann, sind damit bestellt.

## Begründung

**Warum ein zu kurzer Name und kein leerer.** Einen leeren Namen schickt die Maske nicht: der Knopf
bleibt aus, solange nichts getippt ist. Ein Vertrag über eine Anfrage, die kein Aufrufer stellt,
wäre nach Regel 6 keiner. Ein Name aus einem Zeichen geht dagegen jederzeit hinaus — ob er zu kurz
ist, ist eine Regel des Servers, und die kennt die Maske nicht.

**Warum in beiden Interaktionen und nicht nur in der deutschen.** Die englische steht als Paar
neben der deutschen und unterscheidet sich in genau einer Sache: der Sprache. Ein zweiter
Unterschied — hier drei Felder, dort zwei — nähme dem Paar, was es zeigen soll.

**Warum kein eigener `type` für den Namen.** Ein zu kurzer Name ist ein Regelverstoß wie jeder
andere und geht in `validation-failed` auf. Das ist dieselbe Begründung, mit der `password-too-weak`
entfallen ist.

## Folgen

- Beide Interaktionen tragen jetzt `displayName: 'a'` im Rumpf und einen dritten Schlüssel in
  `errors`; ihre Beschreibungen nennen den Namen mit.
- Von `2026-08-20-1201-regelverstoesse-kommen-feldweise-aus-problem-json.md` wird **nichts
  abgelöst**: der dort genannte Satz „eine ungültige E-Mail **und** ein zu kurzes Passwort"
  beschreibt den damaligen Umfang, die Entscheidung über die festen Schlüssel wird hier eingelöst
  und nicht geändert.
- Ungültig wird die Annahme, das Namensfeld werde vom Server begründet angestrichen, weil der Code
  es liest. Gelesen wird, was zugesichert ist.
