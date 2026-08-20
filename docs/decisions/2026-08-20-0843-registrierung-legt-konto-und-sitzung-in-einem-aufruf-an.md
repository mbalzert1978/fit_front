# Die Registrierung legt Konto und Sitzung in einem Aufruf an

## Lage

Die App hatte eine Anmeldemaske und sonst nichts: ein Konto musste außerhalb entstehen, sonst kam
niemand über [`../../app/login.tsx`](../../app/login.tsx) hinaus. Punkt 5 in
[`../offene-punkte.md`](../offene-punkte.md) hat das als offene Produktentscheidung geführt. Die
Entscheidung ist jetzt getroffen, und die Registrierung ist gebaut.

## Entscheidung

**Es gibt [`../../app/register.tsx`](../../app/register.tsx), erreichbar von der Anmeldemaske über
„Konto anlegen" und von dort zurück über „Ich habe schon ein Konto".** Die Maske fragt genau zwei
Dinge: E-Mail und Passwort.

**Kein Anzeigename.** Die App kennt von einem Nutzer heute `user.id` und sonst nichts; kein Screen
zeigt einen Namen. Ein Feld dafür entsteht mit dem Screen, der es liest, und nicht vorher.

**Die Registrierung liefert dieselbe Auth-Antwort wie die Anmeldung, und die Sitzung steht damit
sofort.** `POST /identity/register` antwortet mit `201` und demselben Token-Paar
(`tokenType`, `accessToken`, `expiresIn`, `refreshToken`, `refreshExpiresIn`, `user.id`) im
`data`/`meta`-Umschlag; `register()` in [`../../src/api/session.ts`](../../src/api/session.ts) legt
es über denselben Weg ab wie `login()`, und der Screen führt direkt ins Tagebuch. Es gibt keinen
zweiten Aufruf, der danach noch anmeldet.

**Die Mindestlänge des Passworts sind zehn Zeichen.** Sie steht als `minPasswordLength` in
`src/api/session.ts`, die Maske nennt sie unter dem Feld und lässt den Knopf erst zu, wenn sie
erfüllt ist. Der Vertrag sichert die Ablehnung trotzdem zu.

**Zwei Fehlschläge sind an ihrem `type` erkennbar, weil der Screen zu ihnen Verschiedenes sagt:**
`email-already-registered` (409) und `password-too-weak` (400). Jeder andere Fehlschlag bekommt
denselben allgemeinen Satz, und ein Netzfehler seinen eigenen.

## Begründung

**Warum die Sitzung sofort steht.** Zwei Aufrufe — erst anlegen, dann anmelden — hätten einen
Zustand dazwischen, in dem ein Konto existiert, aber niemand darin ist: scheitert der zweite, steht
der Nutzer vor der Anmeldemaske und weiß nicht, ob sein Konto entstanden ist; versucht er es erneut,
bekommt er „E-Mail bereits vergeben" auf sein eigenes Konto. Dasselbe Argument wie beim Anlegen
eines Produkts: was zusammengehört, entsteht in einem Aufruf oder gar nicht.

**Warum kein Anzeigename.** Regel 2 in [`../regeln.md`](../regeln.md) verlangt, dass nur in den
Vertrag kommt, was ein Screen wirklich liest. Ein Name, den niemand anzeigt, wäre genau das Feld,
das jede harmlose Änderung auf der Gegenseite bricht, ohne dass hier etwas davon abhängt. Kommt ein
Profil, kommt der Name mit ihm.

**Warum die Mindestlänge im Client *und* im Vertrag steht.** Im Client, weil ein Rundlauf für ein
absehbar zu kurzes Passwort verschenkte Zeit ist. Im Vertrag, weil der Client nicht der einzige
Prüfer sein darf — sonst käme ein Konto mit schwachem Passwort an ihm vorbei zustande, und der
Vertrag hielte trotzdem.

**Warum die vergebene E-Mail beim Namen genannt wird.** Die Anmeldung verschweigt bewusst, ob eine
Adresse existiert — dort führt jeder Fehlschlag zu derselben `401`. Die Registrierung kann das
nicht: wer eine schon vergebene Adresse einträgt, muss erfahren, warum es nicht weitergeht, sonst
steht er vor einer Maske, die grundlos ablehnt. Damit verrät dieser Weg, dass es zu einer Adresse
ein Konto gibt. Das wird in Kauf genommen; die Alternative — immer Erfolg melden und die Wahrheit
per E-Mail zustellen — braucht einen Kanal, den die App nicht hat.

## Folgen

- Punkt 5 in [`../offene-punkte.md`](../offene-punkte.md) heißt jetzt „Passwort ändern, Passwort
  vergessen, Konto löschen". **Passwort vergessen ist durch diese Entscheidung dringender
  geworden:** Konten entstehen ab jetzt in der App, und wer sein Passwort verliert, kommt nirgends
  wieder hinein. Der Weg dorthin braucht denselben E-Mail-Kanal wie oben und ist deshalb aufgeschoben
  und nicht nebenbei gebaut.
- [`../../pact/identity.pact.test.ts`](../../pact/identity.pact.test.ts) trägt drei neue
  Interaktionen: Anlegen mit freier E-Mail (`201`), vergebene E-Mail (`409`), zu kurzes Passwort
  (`400`). Der Provider muss dafür einen Zustand „Keine Registrierung mit a@b.de vorhanden"
  herstellen können; die übrigen Zustände gab es schon.
- Nach Regel 8 ist das eine **Bestellung**: was dieses Repo zusichert, steht im Pact, unabhängig
  davon, was die Gegenseite heute anbietet oder wie sie es nennt. Weicht sie ab, wird das
  abgestimmt und nicht einseitig nachgezogen.
- `register` ist in [`../../app/_layout.tsx`](../../app/_layout.tsx) als Screen des Stacks
  eingetragen — ohne den Eintrag wäre der Weg von der Anmeldung aus nicht erreichbar.
