# Kein zweiter Schlüssel, und keine Anfrage ohne Recht

## Lage

Zwei Fundstellen aus dem Sicherheitsblick auf die Sitzung, beide in
[`../../src/api/client.ts`](../../src/api/client.ts). Erstens: die Schlüssel der früheren
Zwei-Schlüssel-Fassung (`accessToken`, `refreshToken`) wurden nur in `clearSession()` entfernt, und
das läuft allein beim Abmelden. Wer von der alten Fassung kommt, findet keine Sitzung, meldet sich
einmal neu an — und meldet sich danach nie ab, weil es dafür keine Schaltfläche gibt (offener
Punkt 9). Der alte Refresh-Token blieb liegen, gültig bis zu seiner Laufzeit und nie entwertet.
Zweitens: scheiterte die vorausschauende Erneuerung in `send()`, ging die Anfrage trotzdem hinaus,
nur eben ohne `Authorization`.

## Entscheidung

Die Alt-Schlüssel werden bei **jedem** Schreiben einer Sitzung mit entfernt, nicht erst beim
Abmelden. Und scheitert die Erneuerung, wird abgemeldet und geworfen
(`client-problems/session-expired`), statt eine Anfrage ohne `Authorization` hinauszuschicken.

## Begründung

Ein Token, den die App nicht kennt, kann sie auch nicht entwerten: der alte Refresh-Token stand
weder in `signOut()` noch sonst irgendwo, wäre also selbst bei einem Abmelden von Hand nur lokal
verschwunden. Zwei Sitzungen auf einem Gerät, von denen die App eine nicht sieht, sind genau der
halbe Zustand, den die Ein-Schlüssel-Fassung abschaffen sollte. Das Löschen gehört deshalb an den
einen Schreibweg, nicht an den Abmeldeweg — dort läuft es zuverlässig, und ein Löschen ins Leere
kostet nichts.

Die Anfrage ohne Token wiederum wusste ihren Ausgang schon: der Server hätte mit derselben 401
geantwortet, die hier bereits feststand, und danach wäre erneuert, wieder gescheitert und
abgemeldet worden — zwei Umläufe für ein bekanntes Ergebnis. Die Kennung steht im
Client-Namensraum und nicht als `token-expired`: dieselbe Lage, aber niemand hat sie uns gesagt,
und an der Kennung soll ablesbar bleiben, wer sie gestellt hat.

Nicht entschieden ist damit die Identität der Gegenstelle; ohne Pinning liest ein Mitleser mit
untergeschobener Root-CA beide Token weiterhin mit. Das steht als offener Punkt 14 in
[`../offene-punkte.md`](../offene-punkte.md) und gehört mit der Gegenseite abgestimmt.

## Folgen

- [`../regeln.md`](../regeln.md), Abschnitt HTTP-Schicht, trägt beide Sätze: kein zweiter Schlüssel
  neben der Sitzung, und keine Anfrage nach gescheiterter Erneuerung.
- `clientProblems` in [`../../src/api/problems.ts`](../../src/api/problems.ts) trägt
  `sessionExpired`. Kein Screen verzweigt heute darauf — er liest `detail` und den Status wie bei
  jedem anderen `ApiError`.
- `send()` besteht nur noch aus dem 401-Weg; die Beschaffung des Tokens steht als `accessForNext()`
  daneben und bleibt damit unter der Komplexitätsgrenze.
- Kein Vertrag ändert sich: beides ist Verhalten der Hülle, nichts davon eine Zusage an das
  Backend.
