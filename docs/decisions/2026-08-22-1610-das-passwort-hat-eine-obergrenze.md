# Das Passwort hat eine Obergrenze

## Lage

[`2026-08-20-0843-registrierung-legt-konto-und-sitzung-in-einem-aufruf-an.md`](2026-08-20-0843-registrierung-legt-konto-und-sitzung-in-einem-aufruf-an.md)
hat `minPasswordLength = 10` festgelegt und in den Vertrag geschrieben. Nach oben stand nichts — die
Maske nahm jede Länge an, und der Vertrag sagte nichts dazu. Wer ein Megabyte in das Feld legt,
bestellt damit ein Hashen über ein Megabyte auf der Gegenseite, und eine Handvoll solcher Aufrufe
kostet mehr als der ganze übrige Verkehr. Ein Security-Review hat das als offene Frage ans Backend
notiert; Regel 8 in [`../regeln.md`](../regeln.md) kennt keine solche Frage — der Vertrag legt fest.

## Entscheidung

**Ein Passwort ist höchstens 128 Zeichen lang.** Der Wert steht als `maxPasswordLength` in
[`../../src/api/session.ts`](../../src/api/session.ts), neben `minPasswordLength`.

**Die Maske schneidet nicht ab, sie markiert.** Kein `maxLength` am Feld: sie färbt den Hinweis
unter dem Feld und lässt den Knopf zu. Der Hinweis nennt beide Grenzen
(`registerPasswordNote(min, max)`).

**Der Vertrag sichert die Ablehnung zu:** ein Passwort über der Grenze ist **422** mit der
Begründung unter `errors.password`, wie jeder andere Feldverstoß.

## Begründung

**Warum 128 und nicht 72.** 72 wäre die Zahl, die aus der Implementierung kommt — bcrypt liest nicht
weiter. Eine Grenze aus dem Hashverfahren abzuleiten hieße, das Verfahren in den Vertrag zu
schreiben; wechselt die Gegenseite auf Argon2, müsste die App nachziehen, ohne dass sich fachlich
etwas geändert hat. 128 ist die Zahl, die eine Passphrase bequem trägt und einen Angriff nicht: vier
bis fünf Sätze passen hinein, ein Puffer-Angriff nicht.

**Warum die Maske nicht abschneidet.** Ein `maxLength` am Feld wäre eine Zeile weniger und der
schlechtere Weg. Wer ein 200-Zeichen-Passwort aus einem Passwortmanager einfügt, bekäme davon
nichts mit — das Konto entstünde mit den ersten 128 Zeichen, und beim nächsten Anmelden fügt der
Manager wieder alle 200 ein und scheitert. Ein abgeschnittenes Geheimnis ist schlimmer als ein
Knopf, der nicht angeht.

**Warum die Grenze trotzdem im Vertrag steht, obwohl die Maske sie hält.** Dasselbe Argument wie bei
der Mindestlänge: der Client darf nicht der einzige Prüfer sein. Sonst käme über einen anderen
Aufrufer ein Passwort beliebiger Länge durch, und der Vertrag hielte dabei.

## Folgen

- [`../../src/api/session.ts`](../../src/api/session.ts) trägt `maxPasswordLength = 128`.
- [`../../app/register.tsx`](../../app/register.tsx) und
  [`../../app/reset.tsx`](../../app/reset.tsx) markieren die Überschreitung und sperren den Knopf.
  Beide setzen das neue Passwort und tragen deshalb dieselbe Regel — aus derselben Konstante.
- [`../../src/i18n/de.ts`](../../src/i18n/de.ts) und
  [`../../src/i18n/en.ts`](../../src/i18n/en.ts): `registerPasswordNote` nimmt jetzt zwei Zahlen.
- [`../../pact/identity.pact.test.ts`](../../pact/identity.pact.test.ts) trägt die Interaktion
  „Registrierung mit einem Passwort über der Obergrenze" ⇒ 422 mit `errors.password`.
- **Wer auf der Gegenseite bcrypt benutzt, muss vorher hashen.** Bei 128 zugelassenen Zeichen und
  72 gelesenen wären zwei verschiedene Passwörter dasselbe Passwort. Das ist keine Bitte, sondern
  die Folge dieser Zusage.
