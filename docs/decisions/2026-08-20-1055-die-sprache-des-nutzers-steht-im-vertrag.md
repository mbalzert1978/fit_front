# Die Sprache des Nutzers steht im Vertrag

## Lage

Der Client fragte in jeder Anfrage auf Deutsch: `Accept-Language: de` stand als Literal in
[`../../src/api/client.ts`](../../src/api/client.ts), und `locale` beim Anlegen eines Kontos
kam aus demselben Literal. Damit las jeder Nutzer die Sätze des Servers auf Deutsch — auch der,
der in den Einstellungen der App längst auf Englisch gestellt hatte, denn diese Wahl kam nie an
der HTTP-Schicht an.

Das Backend hat die Entscheidung ausdrücklich an uns gegeben: es wählt die Sprache **allein**
nach `Accept-Language` und ausdrücklich nicht nach `User.locale`, damit nicht jeder Fehlerfall am
Rand einen Datenbankzugriff kostet (`src/api/i18n.py` im Backend-Repo). Wer die Wahl des Nutzers
kennt, muss sie also mitschicken. Es beherrscht `de-DE` und `en-US`, wertet q-Gewichte aus, fällt
auf `de-DE` zurück und nennt in `Content-Language`, wofür es sich entschieden hat.

Im Vertrag war von alldem nichts zu sehen: ein Teil der Interaktionen nannte `Accept-Language`,
der andere nicht, und keine Antwort sagte, in welcher Sprache ihre Sätze standen.

## Entscheidung

Die Sprache kommt aus einer Naht — [`../../src/language.ts`](../../src/language.ts) — und aus
keinem Literal: gewählte Vorliebe aus `/preferences` vor Gerätesprache, sonst Deutsch. Von dort
füllt sie `Accept-Language` an **jeder** Anfrage und `locale` beim Anlegen eines Kontos. Jede
Interaktion im Vertrag nennt die Sprache, in der sie gefragt hat, als festen Wert; jede
Fehlerantwort trägt `Content-Language` als festen Wert; und derselbe Verstoß steht zweimal im
Vertrag der Identität, einmal auf Deutsch und einmal auf Englisch gefragt.

## Begründung

**Warum eine Naht und nicht zwei Literale.** `Accept-Language` verhandelt eine Antwort, `locale`
ist ein Merkmal, das am Konto bleibt — zwei verschiedene Dinge, aber derselbe Wert. Stünden sie
getrennt, entstünde früher oder später ein Konto, dessen hinterlegte Sprache eine andere ist als
die, in der sein Besitzer liest. Die Naht ist außerdem der Ort, an dem die gewählte Vorliebe das
Gerät schlägt: wer in der App auf Englisch stellt, hat gesagt, wie er lesen will, und das gilt
auch auf einem deutschen Telefon. Beim Abmelden fällt die Wahl weg — sie gehörte einem Konto,
nicht dem Gerät.

**Warum die Sprache im Vertrag ein Wert ist und kein Matcher.** Ein Matcher über der Form
(„irgendein Sprach-Tag") sagt nichts darüber aus, was der Server tut. Der Vertrag soll aber genau
das zusichern: dass die Antwort der Frage folgt. Also nennt jede Interaktion ihre Sprache, und die
Bausteine in [`../../pact/setup.ts`](../../pact/setup.ts) gibt es nur noch **mit** Sprache
(`jsonHeadersIn`, `authHeadersIn`, `jsonAuthHeadersIn`). `authHeaders` ohne Sprache ist nicht mehr
ausgeführt — eine solche Interaktion wäre unwahr, denn der Client nennt immer eine.

**Warum `Content-Language` bestellt wird.** `title`, `detail` und jeder Satz in `errors` sind
Matcher, und ein Matcher nimmt einen deutschen Satz genauso an wie einen englischen. An der
Antwort selbst ist also nicht nachzuprüfen, ob die Aushandlung stattgefunden hat. `Content-Language`
ist der einzige Teil, an dem das geht — er ist ein fester Wert und bricht die Verifikation, wenn
der Server die Sprache ignoriert. Der Client liest ihn nicht; er ist Zusage, nicht Bedarf, und
gehört damit in die abschließende Aufzählung von Regel 2.

**Warum derselbe Fehlerfall zweimal im Vertrag steht.** Eine einzelne Interaktion kann nicht
zeigen, dass die Sprache eine Rolle spielt — dafür braucht es ein Paar, das sich in nichts als der
Sprache unterscheidet. Erst daran ist zu sehen, dass `type` gleich bleibt (eine Kennung hat keine
Sprache) und `title`, `detail`, `errors.*` sich ändern. Das ist dieselbe Bauart wie bei der
Versatz-Zone in
[`2026-08-20-0957-die-zonenform-steht-als-matcher-die-versatz-zone-als-eigene-interaktion.md`](2026-08-20-0957-die-zonenform-steht-als-matcher-die-versatz-zone-als-eigene-interaktion.md):
was ein Matcher nicht zusichern kann, wird eine eigene Interaktion.

**Warum die Masken keine eigenen Sätze mehr erfinden.** `detail` kommt in der Sprache, in der
gefragt wurde. Ein selbstgeschriebener deutscher Satz stünde daneben — und wüsste dazu weniger als
der Server. Die Anmeldemaske reicht `detail` jetzt genauso durch wie die Registrierung; eigene
Sätze bleiben, wo keiner kommt: beim Netzfehler und als letzter Rückfall.

## Abweichung zur Backend-Spezifikation

Keine — hier deckt sich beides. Zwei Punkte sind trotzdem festzuhalten, weil sie die Grenze
beschreiben, an der der Vertrag steht:

1. Der Server antwortet mit dem vollen Tag (`de-DE`, `en-US`), gefragt wird mit dem Sprachanteil
   (`de`, `en`). Das ist gewollt: die Region entscheidet über Datums- und Zahlformate, nicht
   darüber, welchen Satz ein Server schickt, und `de-AT` soll bei derselben Antwort landen. Der
   Vertrag sagt diese Abbildung ausdrücklich zu.
2. `locale` im Rumpf nimmt **nur** `de` oder `en` (`parse_locale` im Backend-Repo). Die Liste in
   [`../../src/language.ts`](../../src/language.ts) ist deshalb keine Wunschliste von hier,
   sondern die Zusage der Gegenseite; wächst sie dort, wächst sie hier — nicht umgekehrt. Ein
   Gerät, das eine dritte Sprache nennt, bekommt Deutsch und keine abgelehnte Registrierung.

## Folgen

- Neu: [`../../src/language.ts`](../../src/language.ts). Kein Aufrufer fragt `expo-localization`
  selbst, und kein Literal `'de'` steht mehr an einer Anfrage.
- [`../../src/api/types.ts`](../../src/api/types.ts) definiert die Sprachmenge nicht länger ein
  zweites Mal: `Preferences.language` ist derselbe Typ `Language`.
- [`../../src/api/hooks.ts`](../../src/api/hooks.ts) gibt die gelesene wie die gespeicherte
  Vorliebe an die Naht weiter; [`../../src/api/client.ts`](../../src/api/client.ts) nimmt sie beim
  Abmelden zurück.
- [`../regeln.md`](../regeln.md) ist an drei Stellen nachgezogen: Regel 2 nennt `Accept-Language`
  und `Content-Language` in der abschließenden Aufzählung der Formvorgaben, die neue **Regel 10**
  sagt, wie die Sprache im Vertrag steht, und die HTTP-Schicht nennt die Naht. Die neue Regel steht
  **hinten**, damit die Nummern 1 bis 9 gelten bleiben — bestehende Entscheidungen verweisen
  darauf, und die werden nicht überschrieben.
- Alle sechs Verträge sind neu erzeugt: 47 Interaktionen tragen jetzt `Accept-Language`, jede
  Fehlerantwort `Content-Language`, und die Identität hat eine Interaktion mehr.
- Was **nicht** mitgezogen ist: die Oberfläche selbst. Ihre Beschriftungen sind weiter deutsch
  verdrahtet, ein englischer Nutzer liest also englische Serversätze in einer deutschen Maske. Das
  ist besser als vorher und noch nicht gut; es steht als Punkt 6 in
  [`../offene-punkte.md`](../offene-punkte.md).
