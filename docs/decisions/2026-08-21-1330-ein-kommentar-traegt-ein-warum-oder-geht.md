# Ein Kommentar trägt ein Warum oder geht

## Lage

Über nahezu jeder Funktion, jedem Typ und jeder Konstante in `src/`, `app/` und `pact/` stand ein
Prosa-Kommentar, häufig fünf bis fünfzehn Zeilen JSDoc — 1 235 Kommentarzeilen auf 6 340 Zeilen
Code, knapp ein Fünftel der Datei. Ein Teil davon trug Wissen, das nirgends sonst steht: eine
verworfene Alternative, eine Eigenheit der Gegenseite, eine Nebenläufigkeitsfalle. Ein anderer Teil
wiederholte den Bezeichner darunter, beschrieb die nächste Zeile oder sagte in fünfzehn Zeilen noch
einmal, was [`../regeln.md`](../regeln.md) und die Dateien in diesem Verzeichnis bereits als Regel
festhalten. Die Wiederholung war die gefährlichere Hälfte: sie driftet, und wer sie liest, weiß
nicht, welche der beiden Fassungen gilt.

## Entscheidung

Ein Kommentar bleibt genau dann, wenn er ein **Warum** nennt, das der Code nicht zeigen kann, vor
einer **Falle** warnt, die beim nächsten Ändern zuschnappt, oder auf eine **externe Quelle** verweist
(RFC, Issue, eine Datei unter [`.`](.)) — sonst geht er weg oder schrumpft auf diesen Verweis;
exportierte Funktionen, Typen und Komponenten dürfen darüber hinaus einen Docstring von ein bis drei
Zeilen tragen.

## Begründung

Die naheliegende Alternative wäre eine Längenregel gewesen — „höchstens fünf Zeilen JSDoc". Sie
hätte die falschen Kommentare gekürzt und die richtigen mit: die Nebenläufigkeitsfalle in
`renew()` braucht ihre vier Zeilen, die Beschreibung von `clearSession()` brauchte keine einzige.
Der Maßstab fragt deshalb nicht nach der Länge, sondern danach, ob die Aussage sonst irgendwo steht.

Damit ist auch entschieden, wohin eine Begründung gehört, die an zwei Stellen stünde: an die eine,
die sie ohnehin führt. Eine Regel steht in [`../regeln.md`](../regeln.md), eine Entscheidung als
Datei hier, und der Kommentar am Code nennt sie beim Namen. Ein Verweis kann veralten und fällt dann
auf — eine stillschweigend abgeschriebene Fassung kann auseinanderlaufen, ohne dass es jemand merkt.

## Folgen

- 1 235 Kommentarzeilen sind auf 750 geschrumpft; kein Verhalten, keine Signatur und keine
  Zeile Code hat sich dabei geändert, `pacts/` ist unverändert geblieben.
- Wo eine Begründung schon als Entscheidung hier oder als Regel in [`../regeln.md`](../regeln.md)
  stand, steht am Code nur noch ihr Dateiname. Ersatzlos gestrichen wurde keine Begründung.
- Der Zeiger auf `src/api/i18n.py` im Backend-Repo ist aus `src/language.ts` verschwunden; die
  Aussage, die er belegen sollte, steht weiter da. In
  [`2026-08-20-1055-die-sprache-des-nutzers-steht-im-vertrag.md`](2026-08-20-1055-die-sprache-des-nutzers-steht-im-vertrag.md)
  bleibt er unverändert liegen — ältere Dateien werden nicht überschrieben.
- Der Hinweis, ein vollständiger Client entstünde mit `openapi-typescript` aus einer Swagger-Datei,
  ist entfallen: er nannte eine Spezifikation außerhalb dieses Repositories, und die gibt es nach
  Regel 8 nicht.
- Neue Kommentare werden an diesem Maßstab gemessen. Wächst ein Block über drei Zeilen, gehört
  geprüft, ob seine Begründung nicht als Datei hierher gehört.
