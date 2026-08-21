# Fehlerkennungen sind `tag:`-URIs

## Lage

`type` in `problem+json` stand auf beiden Seiten als `https://api.example/errors/…`. `api.example`
ist ein Platzhalter, den niemand besitzt. Solange er stehenbleibt, zeigt jede Kennung auf nichts,
und wer sie ausprobiert, landet im Leeren.

Die Kennung ist kein Beiwerk: sie wird ganz verglichen, an ihr hängen Verzweigungen im Client, und
sie zu ändern heißt, jeden Vertrag und jeden `if` zu ändern. Sie muss vor dem ersten Release
stehen.

## Entscheidung

Die Kennungen sind `tag:`-URIs nach RFC 4151:

```
tag:nutritrack.app,2026:problems/validation-failed
tag:nutritrack.app,2026:client-problems/malformed-envelope
```

## Begründung

**Warum `tag:` und nicht `https:`.** RFC 9457 §3.1.1 nennt beides zulässig und sagt, eine
abrufbare URI *soll* Dokumentation liefern. Genau darin liegt die Falle: eine `https:`-Kennung
verspricht einen Ort. Wer sie liest, erwartet, dass dort etwas steht; steht dort nichts oder ein
404, ist die Kennung beschädigt, obwohl sie als Kennung tadellos ist. Eine `tag:`-URI ist
ausdrücklich für dauerhafte Bezeichner gedacht, die niemand abruft — sie behauptet keinen Ort, sie
kann nicht ins Leere zeigen, und sie braucht keinen Server, der sie am Leben hält.

**Warum sie trotzdem eindeutig ist.** Der Teil vor dem Komma ist eine Domain, der Teil danach das
Jahr. Wer die Domain in jenem Jahr kontrollierte, hat den Namensraum — ohne Registrierung, ohne
Vergabestelle. Genau darauf beruht die Eindeutigkeit, **und nur darauf**: `nutritrack.app` muss uns
2026 tatsächlich gehören. Solange das nicht gesichert ist, ist die Kennung so vorläufig wie der
alte Platzhalter, nur ehrlicher darin, dass sie nichts verspricht.

**Warum keine URN.** `urn:nutritrack:problem:…` sieht ordentlich aus, ist aber formal angreifbar:
die Namespace-Kennung `nutritrack` ist bei der IANA nicht registriert, und ohne Registrierung ist
eine URN nur eine Zeichenkette mit einem seriösen Präfix.

**Warum keine Version im Pfad.** Eine Kennung versioniert nicht. `…/v1/problems/…` wäre ein
Widerspruch in sich: ändert sich die Fehlerart, ist es eine andere Kennung, und ändert sie sich
nicht, braucht sie keine neue Fassung.

## Folgen

- [`../../src/api/problems.ts`](../../src/api/problems.ts) trägt beide Namensräume in der neuen
  Form. Alle sechs Verträge sind neu erzeugt; sie lesen die Werte von dort und konnten deshalb
  nicht auseinanderlaufen.
- Was dort steht, ändert sich nicht mehr. Der Namensraum ist damit kein offener Punkt mehr —
  offen ist nur noch, ob uns die Domain gehört, und das ist eine Frage außerhalb dieses Repos.
- Für den eigenen Namensraum (`client-problems`) gilt dasselbe. Diese Kennungen verlassen die App
  nie und brauchen keine Dokumentation; dieselbe Form zu haben ist trotzdem richtig, weil sie im
  selben Feld stehen wie die des Servers.
