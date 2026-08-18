---
name: greploop
description: Arbeitet einen offenen Pull Request iterativ gegen das Greptile-Review ab, bis 5/5 Confidence und keine offenen Kommentare mehr bestehen — maximal drei Runden. Loest das Review aus, wartet es ab, behebt umsetzbare Kommentare, schliesst die Threads und pusht erst nach gruenem `make.ps1 all`. Nutzen, wenn der Nutzer einen PR gegen das Greptile-Review optimieren lassen will ("greploop", "PR gegen Greptile durchziehen", "Greptile-Kommentare abarbeiten").
arguments: Optional die PR-Nummer. Ohne Angabe wird der PR des aktuellen Branches verwendet.
allowed-tools: Bash(gh:*) Bash(git:*) Bash(pwsh:*)
metadata:
  origin: https://github.com/greptileai/skills/blob/main/greploop/SKILL.md (MIT, greptileai, v1.3)
  adapted: nur GitHub; Verifikations-Gate, Pact-Stopp und Push-Freigabe ergaenzt
---

# Greploop

Ein offener PR wird so lange nachgebessert, bis Greptile ihn mit 5/5 Confidence und ohne
offene Kommentare stehen laesst.

**Die Regeln der Schleife stehen in
[PLAN.md, "Review-Schleife gegen Greptile"](../../../docs/PLAN.md#review-schleife-gegen-greptile)
— vor der ersten Runde lesen.** Dort sind Rundenzahl, die vier Grenzen (Verifikations-Gate,
Pact-Stopp, kein `git add -A`, Push-Freigabe) und der Umgang mit Vorschlaegen gegen die
Repo-Regeln festgelegt. Diese Datei sagt nur, wie das ausgefuehrt wird, und wiederholt die
Begruendungen nicht.

Die Mechanik — warten, einsammeln, Threads schliessen, Abbruch entscheiden, berichten — traegt
[`scripts/greploop.ps1`](../../../scripts/greploop.ps1). Was ein Urteil braucht — welcher
Kommentar umgesetzt wird und wie —, bleibt hier.

## Ablauf

### 0. Vorbedingungen und Freigabe

1. `gh auth status` — nicht angemeldet heisst abbrechen.
2. `git status --short` — ist der Baum schmutzig, dem Nutzer zeigen und fragen, ob die
   Aenderungen mitlaufen sollen. Nicht ungefragt mitcommitten.
3. Frische Schleife starten und den PR ermitteln:
   ```
   pwsh -File scripts/greploop.ps1 -Command reset
   pwsh -File scripts/greploop.ps1 -Command collect
   ```
   Meldet `collect` keinen PR, abbrechen und dem Nutzer sagen, dass zuerst einer gebraucht
   wird.
4. **Push-Freigabe einholen**, einmal fuer die ganze Session: PR-Nummer und -Titel aus der
   Ausgabe nennen und ansagen, dass bis zu drei Runden Commits auf den Branch gepusht werden,
   jede erst nach gruenem `make.ps1 all`. Ohne ausdrueckliches Ja beginnt keine Runde. Liegt
   die Freigabe vor, in den Folgerunden nicht erneut fragen.

### 1. Review ausloesen

Steht lokal etwas Ungepushtes an, zuerst `git push`. Dann pruefen, ob ohnehin schon ein Lauf
unterwegs ist:

```
gh pr checks <PR> --json name,state --jq '.[] | select(.name | test("greptile"; "i")) | .state'
```

Ist der Status weder `PENDING` noch `IN_PROGRESS`, das Review anstossen:

```
gh pr comment <PR> --body "@greptile review"
```

### 2. Abwarten

```
pwsh -File scripts/greploop.ps1 -Command wait
```

Pollt den Greptile-Check-Run zu `HEAD` bis er `completed` ist, hoechstens zehn Minuten.
Antwortet der Lauf mit `"timedOut": true`, die Schleife beenden und den Zeitablauf berichten
— nicht blind weiterarbeiten.

### 3. Ergebnis einsammeln

```
pwsh -File scripts/greploop.ps1 -Command collect
```

Liefert `confidence`, den `pactsChanged`-Befund und die offenen Threads mit `id`, `path` und
`body`. Confidence wird aus PR-Body, Issue- und Review-Kommentaren gelesen; kommt sie mehrfach
vor, gewinnt die zuletzt aktualisierte Quelle.

### 4. Kommentare bewerten und beheben

Der einzige Schritt, der ein Urteil verlangt. Jeden offenen Kommentar in genau eine der drei
Klassen einordnen:

- **Umsetzbar** — Code aendern, dann Thread schliessen.
- **Rein informativ oder Fehlalarm** — nichts aendern, Thread schliessen, im Bericht
  vermerken.
- **Steht gegen die Repo-Regeln** — **nicht** umsetzen. Stattdessen im Thread auf Deutsch
  begruenden, warum der Vorschlag hier nicht gilt, und den Thread schliessen. Welche
  Vorschlaege darunter fallen, steht in
  [PLAN.md](../../../docs/PLAN.md#review-schleife-gegen-greptile) und den "Nicht
  verhandelbar"-Punkten in [CLAUDE.md](../../../CLAUDE.md). Im Zweifel gilt der Lackmustest
  aus CLAUDE.md, nicht Greptiles Meinung.

Thread schliessen — zaehlt zugleich den Bericht mit:

```
pwsh -File scripts/greploop.ps1 -Command resolve -ThreadId <ID>
```

### 5. Verifizieren — hartes Gate

Vor jedem Commit, ohne Ausnahme:

```
pwsh -File make.ps1 all
```

Ist der Lauf rot: **nicht committen, nicht pushen**, sondern mit
`-Command decide -Round <N> -VerifyFailed` abschliessen. Der Bericht nennt dann die
fehlgeschlagene Stufe samt Ausgabe.

### 6. Committen und pushen

Meldete `collect` in dieser Runde `"pactsChanged": true`, **hier anhalten**: den Diff dem
Nutzer vorlegen und auf seine Entscheidung warten. Sonst gezielt stagen und pushen:

```
git status --short
git add <datei> [<datei> ...]
git commit -m "address greptile review feedback (greploop iteration <N>)"
git push
```

Commit-Nachrichten bleiben englisch (CLAUDE.md, "Konventionen").

### 7. Abbruch entscheiden

```
pwsh -File scripts/greploop.ps1 -Command decide -Round <N>
```

Prueft alle Abbruchbedingungen der Schleife auf einmal — Erfolg, Rundenlimit, rote
Verifikation, Pact-Aenderung, Zeitablauf und zwei Runden in Folge ohne Bewegung. Kommt
`"stop": true` zurueck, endet die Schleife mit dem genannten Grund; sonst beginnt die naechste
Runde bei Schritt 1.

## Bericht

Kopf rendern lassen:

```
pwsh -File scripts/greploop.ps1 -Command report
```

Darunter auf Deutsch, ASCII-Konvention, jeder nicht umgesetzte Punkt mit Datei, Fundstelle und
Begruendung — besonders die, die aus Regelgruenden abgelehnt wurden. Ein stiller Uebersprung
ist ein Fehlbericht.
