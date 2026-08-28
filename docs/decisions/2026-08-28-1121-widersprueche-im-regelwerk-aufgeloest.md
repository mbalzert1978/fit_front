# Widersprüche im Regelwerk aufgelöst, jede Regel steht wieder an einer Stelle

## Lage

Eine Prüfung des Regelwerks nach dem Umzug in [`.rules/`](../../.rules/) fand sieben harte
Widersprüche und neun Doppelungen. Zwei davon konnten eine Zusicherung falsch machen: Regel 9 in
`.rules/app/vertraege.md` verlangte die `Location` an **jeder** `201`, während Regel 2 sie an eine
Bedingung knüpft; und `docs/neue-sprache.md` verlangte, vor dem Eintragen einer Sprache eine Zusage
des Providers abzuwarten, was Regel 8 gerade ausschließt. Dazu behauptete `CLAUDE.md` an drei
Stellen selbst etwas über das Repo, obwohl sie laut eigenem Satz nur verlinkt — vier Regeldateien
zitierten sie deshalb als Quelle einer Coderegel.

## Entscheidung

Jede gefundene Regel steht ab jetzt an genau einer Stelle, und die widersprüchlichen Fassungen sind
angeglichen. Die `Location` gilt in Regel 9 unter derselben Bedingung wie in Regel 2. Eine neue
Sprache wird eingetragen und vom Vertrag bestellt, nicht abgestimmt. Die Regel „kein zweiter
`fetch` neben der Naht" steht in [`.rules/app/http-schicht.md`](../../.rules/app/http-schicht.md);
`CLAUDE.md` verweist nur noch dorthin. Der Vorbehalt „dieses Repo hat keinen `Result`-Typ" gilt nur
für die HTTP-Naht; die Form selbst bleibt Vorgabe und entsteht bei der ersten Prüfung, die sie
braucht. Wiederholte Regeltexte in `.rules/common/security.md`,
`.rules/typescript/typescript-feature-slices.md`, `.rules/typescript/typescript-error-handling.md`,
`.rules/common/git-workflow.md` und `docs/neue-sprache.md` sind auf Verweise gekürzt.

## Begründung

Zwei Fassungen derselben Regel driften, und die Prüfung hat gezeigt, dass genau das schon passiert
war: die Kopie der Form-Aufzählung in `typescript-feature-slices.md` hatte die `Location`-Bedingung
bereits verloren. Ein Verweis kann nicht driften, ein abgeschriebener Satz schon.

Die Sprach-Vorbedingung wurde gestrichen und nicht als Ausnahme in Regel 8 eingetragen: eine
Ausnahme hätte die Aussage „der Vertrag bestellt, der Provider löst ein" für genau das Feld
aufgehoben, an dem sie am leichtesten zu prüfen ist. Der Vertrag sichert `locale` ohnehin zu; er
ist damit die Stelle, die die Kennung einfordert.

`security.md` behält die Checklistenform, aber nicht mehr den ausgeschriebenen Regeltext: eine
Checkliste soll sagen, **dass** etwas zu prüfen ist, nicht ein zweites Mal, **was** gilt.

## Folgen

- Geändert sind `CLAUDE.md`, `README.md`, `docs/neue-sprache.md`, `docs/decisions/README.md`,
  `.rules/app/vertraege.md`, `.rules/app/http-schicht.md`, `.rules/common/security.md`,
  `.rules/common/patterns.md`, `.rules/common/git-workflow.md`,
  `.rules/typescript/typescript-error-handling.md`,
  `.rules/typescript/typescript-feature-slices.md`, `.rules/typescript/typescript-dependencies.md`,
  `.rules/typescript/typescript-async.md` und `.rules/typescript/typescript-data-access.md`.
- Ungültig wird Abschnitt „0. Vorbedingung" aus `docs/neue-sprache.md` samt dem Abnahmepunkt „das
  Backend nimmt sie an" und dem PR-Beleg dazu. Wer eine Sprache beiträgt, wartet auf niemanden.
- Ungültig wird jede Formulierung, die `CLAUDE.md` als Quelle einer Coderegel nennt. Die Quelle ist
  die passende Datei unter `.rules/`.
- Kein Vertrag und kein Code ändert sich. `pacts/` bleibt unverändert.
- Die toten Verweise auf `docs/regeln.md` in den älteren Entscheidungsdateien bleiben liegen, wie
  es [die Entscheidung vom 28.08.2026, 08:42](./2026-08-28-0842-das-regelwerk-zieht-nach-punkt-rules.md)
  festhält. Behoben ist nur der Verweis in `docs/decisions/README.md`, denn diese Datei ist keine
  Entscheidung.
