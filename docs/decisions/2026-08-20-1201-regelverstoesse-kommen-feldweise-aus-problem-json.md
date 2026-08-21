# Regelverstöße kommen feldweise aus `problem+json`, nicht aus der Maske

## Lage

Die Registrierungsmaske prüfte die E-Mail nur auf „nicht leer". Wer sich vertippt, bekam den
stumpfen Satz „Registrierung derzeit nicht möglich" — ausgerechnet beim einzigen Fehler, den der
Nutzer selbst beheben kann. Zur Wahl standen eine Plausibilitätsregel im Client und eine Bestellung
an die Gegenseite.

Die Gegenseite prüft die E-Mail ohnehin: auf Dopplung und auf Regelverstöße, und sie kann
ausführliche `problem+json`-Angaben liefern, was genau nicht stimmt. Damit ist die Frage
entschieden: **die App fordert diese Angaben an, statt eine zweite, schlechtere Prüfung danebenzustellen.**

## Entscheidung

**`validation-failed` (400) trägt `errors`: Feldname → Sätze.** Zugesichert in
[`../../pact/identity.pact.test.ts`](../../pact/identity.pact.test.ts), erzeugt in
`pacts/nutritrack-app-nutritrack-identity.json`. Die **Schlüssel** sind feste Werte (`displayName`,
`email`, `password` — die Feldnamen des Anfrage-Rumpfes), weil der Screen an ihnen entscheidet,
welches Feld er anstreicht. Die **Sätze** sind Matcher: ihr Wortlaut gehört dem Server.

**Mehrere Verstöße kommen in einer Antwort.** Die zugesicherte Interaktion schickt eine ungültige
E-Mail **und** ein zu kurzes Passwort und erwartet beide Felder begründet zurück.

**`password-too-weak` entfällt.** Ein zu kurzes Passwort ist ein Regelverstoß wie jeder andere und
geht in `validation-failed` auf. Zwei Wege für dieselbe Sache wären zwei Wahrheiten.

**`email-already-registered` (409) bleibt — und trägt `errors` ebenfalls.** Eine vergebene Adresse
ist kein Regelverstoß, sondern ein Zustand der Gegenseite; der `type` bleibt deshalb eigen. Den Satz
dazu schickt aber auch hier der Server. Die Maske behält ihren eigenen nur als Rückfall für den
Fall, dass keiner mitkommt: **wo der Server spricht, schweigt sie.**

**Die Registrierungs-Interaktionen tragen `Accept-Language: de`.** Sobald ein Screen Text aus der
Antwort anzeigt, ist die Antwort sprachabhängig — dann gehört der Header in den Vertrag.

**Die Maske behält genau eine eigene Regel:** die Mindestlänge des Passworts, damit der
offensichtliche Fall nicht erst über das Netz muss. Sie behauptet nicht, alle Regeln zu kennen.

**Die Sätze stehen am Feld.** Neu ist [`../../src/components/FormField.tsx`](../../src/components/FormField.tsx)
— Beschriftung, Eingabe, Meldungen. `app/register.tsx` und `app/login.tsx` benutzen es beide; ein
zweiter Weg, ein beschriftetes Feld zu zeichnen, entsteht damit nicht.

## Begründung

**Warum nicht die Plausibilitätsregel im Client.** Sie wäre eine zweite Wahrheit über gültige
E-Mail-Adressen, unweigerlich enger als die echte, und sie hätte Adressen abgewiesen, die die
Gegenseite angenommen hätte — ein Fehler, den der Nutzer nicht versteht und nicht umgehen kann. Die
teure Prüfung steht ohnehin drüben; sie zweimal zu haben, macht sie nicht besser.

**Warum feldweise und nicht ein Satz.** Bei drei Eingaben ist ein Sammelsatz eine Zumutung: der
Nutzer muss raten, welche gemeint ist. `errors` als Abbildung Feld → Sätze ist die kleinste Form,
die das löst, und sie stand im Typ `ProblemDetails` bereits — zugesichert war sie nie, gelesen
wurde sie von niemandem.

**Warum die Sätze nicht übersetzt werden.** Ein Katalog von Fehlercodes im Client wäre eine dritte
Stelle, an der Regeln stehen, und er würde bei jeder neuen Regel drüben stumm veralten. Der Preis
ist die Sprachabhängigkeit — bezahlt mit `Accept-Language`, und mit Punkt 6 in
[`../offene-punkte.md`](../offene-punkte.md) verbunden: kommt Englisch, kommt es hier mit.

## Folgen

- Diese Datei **löst genau einen Punkt** der Entscheidung von 08:43 ab: den Fehlerfall
  `password-too-weak`. Alles andere dort bleibt gültig — ein Aufruf, Sitzung sofort, Mindestlänge
  zehn Zeichen in der Maske, `email-already-registered` als eigener Fall.
- Sie löst außerdem den Punkt aus den Folgen der Entscheidung von 09:07 ab, `Accept-Language` bleibe
  bei den Identity-Interaktionen unzugesichert. Für die vier Registrierungs-Interaktionen gilt das
  nicht mehr; für `login`, `refresh` und `logout` weiter, deren Antworten zeigt kein Screen an.
- `problem()` in [`../../pact/setup.ts`](../../pact/setup.ts) nimmt jetzt optional `errors` — ein
  Fehler mit Feldangaben wird dort gebaut und nicht danebengeschrieben (Regel 4).
- Was die Gegenseite an Regeln prüft, steht bewusst **nirgends in diesem Repo**. Wächst die Liste
  drüben, wächst hier nichts mit; der Screen zeigt, was ankommt.
