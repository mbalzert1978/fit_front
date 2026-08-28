# Git-Workflow

## Format der Commit-Nachricht

```text
<typ>: <beschreibung>

<optionaler Rumpf>
```

Typen: feat, fix, refactor, docs, test, chore, perf, ci

Die Beschreibung ist deutsch, wie jede projektbezogene Notiz ([`CLAUDE.md`](../../CLAUDE.md)). Der
Rumpf trägt das Warum — dieselbe Regel wie für Kommentare
([kommentare-und-tsdoc.md](./kommentare-und-tsdoc.md)).

Hinweis: Ob eine Attribution angehängt wird, entscheidet die globale Claude-Code-Konfiguration,
nicht dieses Repo; die bisherige Historie trägt keine.

## Pull Requests

Beim Erstellen eines PR:

1. Die vollständige Commit-Historie ansehen, nicht nur den letzten Commit
2. `git diff <basis-branch>...HEAD` nutzen, um alle Änderungen zu sehen
3. Eine aussagekräftige Zusammenfassung schreiben
4. Einen Testplan mit offenen Punkten beilegen
5. Bei einem neuen Branch mit `-u` pushen

Vor dem Push läuft `./make.ps1 ci` — lint, format-check, typecheck, complexity, test — und ist
grün. Was dort nicht durchläuft, ist nicht fertig ([`make.ps1`](../../make.ps1)).

## Worktrees: nur auf ausdrückliche Bitte

Keinen Git-Worktree anlegen, solange der Nutzer nicht ausdrücklich darum bittet. Sagt jemand „in
einem eigenen Branch", ohne „Worktree" zu sagen, ist ein Branch im Haupt-Checkout gemeint
(`git checkout -b <name>`) — die Wahl zwischen beidem gehört dem Nutzer, nicht einer Voreinstellung.

Ein Worktree legt das Ergebnis in ein Verzeichnis, in dem der Nutzer nicht arbeitet und aus dem es
danach wieder herausgeholt oder gemergt werden muss — nützlich für unbeaufsichtigte Läufe und für
mehrere Agenten parallel, unnötiger Aufwand in einer interaktiven Sitzung. Stellt sich ein Worktree
nachträglich als gewünscht heraus, wird das dafür vorgesehene Projektwerkzeug benutzt statt eines
rohen `git worktree add`, damit der neue Worktree denselben lokalen Projektkontext bekommt wie das
Haupt-Checkout (Skills, Settings, Doku). Bei echter Unschlüssigkeit wird gefragt, nicht entschieden
(siehe [escalation.md](./escalation.md)).

Ein Worktree ohne installierte Abhängigkeiten ist leer: `node_modules/` wird nicht mitkopiert, also
läuft dort zuerst `./make.ps1 install`.
