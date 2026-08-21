# Die Zone wird normalisiert und kommt zurück

## Lage

`time_zone_must_be_known` im Backend prüft `timeZoneId` gegen
`zoneinfo.available_timezones()`. Nachgerechnet: `Europe/Berlin`, `UTC`, `GMT` und `Etc/GMT-1` sind
enthalten, **`GMT+01:00` nicht** — genau die Form, die Android liefert, wenn das System keine
benannte Zone auflöst. Ein Nutzer mit einem solchen Gerät kann sich nicht registrieren. Er liest
einen Satz über seine Zeitzone und hat keinen Weg, sie zu ändern: die Maske hat kein Feld dafür,
und haben soll sie auch keines.

Die Entscheidung vom 20.08. 09:36 sagt, dass das nicht scheitern darf. Der Vertrag sagte es bisher
nur halb — er hatte eine 201 für `GMT+01:00`, aber keine Aussage darüber, was daraus wird.

## Entscheidung

Der Server nimmt zwei Arten von Kennungen an und normalisiert beide auf eine kanonische Form:
einen **IANA-Namen** oder einen **numerischen Versatz `±HH:MM`**. Die Antwort trägt die
**wirksame** Kennung, nicht die gefragte.

| gefragt | wirksam |
| --- | --- |
| `Europe/Berlin` | `Europe/Berlin` |
| `UTC`, `GMT`, `GMT+00:00` | `UTC` |
| `GMT+01:00`, `+01:00`, `+0100`, `+01` | `+01:00` |
| `GMT+05:30` | `+05:30` |

## Begründung

**Warum diese zwei Formen und keine dritte.** Es sind genau die zwei, die RFC 9557 §4.1 für eine
Zonenangabe zulässt: ein Zonenname aus der IANA-Datenbank oder ein numerischer Versatz. Mehr
braucht niemand, weniger reicht nicht.

**Warum nicht auf `Etc/GMT±N` abbilden.** Zwei Gründe, beide praktisch: das Vorzeichen dieser Zonen
ist invertiert (`Etc/GMT-1` **ist** UTC+1), und für halbe Stunden gibt es sie gar nicht — Indien
mit `GMT+05:30` fiele durch. Der numerische Versatz hat beide Probleme nicht und liest sich für
jeden, der später in die Datenbank schaut, ohne Fußnote.

**Warum der Client nichts normalisiert.** Er hat keine zweite Quelle, die es besser wüsste; er
liest, was das Gerät sagt. Die Regel, welche Zone gültig ist, gehört dem Server — er rechnet damit
Tagesgrenzen und plant Jobs. Zwei Stellen, die dieselbe Kennung auslegen, wären eine zu viel.

**Was der feste Versatz kostet, und warum er ihn wert ist.** Ein Versatz folgt keiner Sommerzeit.
Ein Berliner, dessen Gerät `GMT+01:00` meldet, hat im Sommer eine um eine Stunde verschobene
Tagesgrenze. Das ist ein Fehler. Der andere Fehler ist, dass er sich gar nicht registrieren kann —
und der ist größer.

**Warum die Antwort die wirksame Kennung trägt.** Sonst wäre die Umrechnung eine stille Korrektur:
das Konto trüge etwas anderes, als der Client abgeschickt hat, und niemand wüsste es. Mit der
Rückgabe ist die Anfrage ein Wunsch und die Antwort die Wahrheit über die Ressource — die übliche
Rollenverteilung, wenn ein Server eine Ressource anlegt. Erst dadurch wird der Fall überhaupt
prüfbar: der Vertrag hält `GMT+01:00` in der Anfrage und `+01:00` in der Antwort, beides als Wert
und nicht als Matcher.

## Abweichung zur Backend-Spezifikation

Ja, und sie ist der Anlass dieser Datei: heute lehnt der Server `GMT+01:00` ab. Bestellt ist, dass
er ihn annimmt und umrechnet. Nach Regel 8 ist das eine Bestellung — die App sagt, was sie braucht,
und die Abstimmung darüber hat stattgefunden.

## Folgen

- Der Vertrag der Identität hat die Interaktion „Registrierung mit einer Versatz-Zone" umgestellt:
  Anfrage `GMT+01:00`, Antwort `user.timeZoneId: "+01:00"` — ein fester Wert ohne Matcher.
- `AccountUser.timeZoneId` in [`../../src/api/types.ts`](../../src/api/types.ts) trägt den
  wirksamen Wert. Der Client wertet ihn heute nicht aus; das ist offener Punkt 12.
- Die Bestellung setzt voraus, dass die Zone im Backend nicht länger nur ein IANA-Name ist. Eine
  Summe aus benannter Zone und festem Versatz ist die naheliegende Form, und sie passt zu dem,
  was dort ohnehin üblich ist (`Locale = German | English`).
