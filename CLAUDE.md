# CLAUDE.md

**Diese Datei behauptet nichts über das Repo. Sie verlinkt nur.** Jede Aussage darüber, wie der
Code aufgebaut ist, was wo liegt oder was gilt, steht genau einmal — dort, wohin hier verwiesen
wird. Was hier inline steht, sind Regeln für den Agenten; sie können nicht gegen den Code driften.
Wächst diese Datei um einen Absatz, der etwas über das Repo behauptet, gehört er woandershin.

## Wo die Dinge liegen

- [`README.md`](README.md) — der Einstieg: was diese App ist, in fünf Sätzen, und von dort weiter.
- [`docs/regeln.md`](docs/regeln.md) — was für jede Änderung gilt: wo Literale stehen dürfen, unter
  welchen Regeln Verträge geschrieben werden, was vor der Abnahme durchlaufen sein muss. Vor jeder
  Änderung an Oberfläche oder Verträgen zuerst hierher.
- **Die Issues dieses Repositories auf GitHub** — vor jeder Annahme darüber, ob etwas fehlt oder
  bewusst offen gelassen wurde. Was dort offen steht, ist nicht vergessen, sondern aufgeschoben.
  Offene Punkte werden ausschließlich dort geführt, nicht als Datei im Repo.
- [`src/theme.ts`](src/theme.ts) — das Designsystem. Vor jedem Farb-, Schrift-, Radien- oder
  Abstandswert zuerst hierher; die Regel, wo Literale stehen dürfen, steht in
  [`docs/regeln.md`](docs/regeln.md).
- [`src/components/index.ts`](src/components/index.ts) — der Baukasten. Bevor eine Komponente neu
  gebaut oder ein zweiter Weg für dasselbe Element geprägt wird, zuerst hierher.
- [`src/api/types.ts`](src/api/types.ts), [`src/api/hooks.ts`](src/api/hooks.ts),
  [`src/api/queryKeys.ts`](src/api/queryKeys.ts) — vor jeder Annahme über Endpunkt, Nutzlast oder
  Cache-Schlüssel. [`src/api/client.ts`](src/api/client.ts) trägt Auth, Fehlerform und Wiederholung;
  kein zweiter `fetch`-Weg daneben.
- [`src/api/diaryDate.ts`](src/api/diaryDate.ts) — bevor ein Kalendertag angefasst wird.
- [`src/nav.ts`](src/nav.ts) — bevor Zustand durch den Aufnahme-Ablauf gereicht wird.
- [`pact/`](pact/) — die zugesicherten Verträge; die Regeln, unter denen sie geschrieben werden,
  stehen in [`docs/regeln.md`](docs/regeln.md).
- [`docs/decisions/`](docs/decisions/) — je eine Datei pro Entscheidung, siehe unten.

**Es gibt keine Quelle außerhalb dieses Repositories.** Was die API leistet, steht in
[`pact/`](pact/) und in den daraus erzeugten Verträgen unter [`pacts/`](pacts/) — nirgends sonst.
Kein anderes Repository wird gelesen, zitiert oder als Spezifikation herangezogen, und keine
Änderung hier wartet auf eine Abstimmung dort.

Nennt eine dieser Quellen ihrerseits eine Datei, die nicht im Zugriff liegt, wird ihr Inhalt nicht
geraten und nicht ersatzweise erfunden — es wird nachgefragt.

## Befehle

[`make.ps1`](make.ps1) ist der kanonische Weg (`./make.ps1 ci`, `lint`, `format`, `complexity`,
`typecheck`, `test`, …); die einzelnen Schritte stehen als Skripte in
[`package.json`](package.json) und werden von dort aufgerufen. Beides benutzen statt
Ad-hoc-Kommandos; fehlt ein Weg, wird er dort ergänzt und nicht daneben improvisiert.

Kein Ziel greift über die Repo-Grenze: dieses Repo erzeugt Verträge, es verifiziert keine und
startet nichts im Provider-Repo.

## Entscheidungen und Memory-Policy

**Kein externer, sitzungsübergreifender Memory-Mechanismus** — weder Claude Codes Memory-System
noch irgendeine Notiz-Ablage außerhalb des Repos. Das gilt für das Anlegen neuer Einträge wie für
das Belassen bestehender; es sollten keine existieren.

Entscheidungen und relevante Neuerungen werden **ausschließlich** als Datei unter
[`docs/decisions/`](docs/decisions/) erfasst (Format und Benennung: `README.md` dort). Verbindlich
für jede künftige Sitzung in diesem Repository.

## Sprache der Dokumentation

**Alle Dokumentation und jede projektbezogene Notiz werden auf Deutsch verfasst** — neu erstellte
Dateien ebenso wie Überarbeitungen bestehender; abweichend englischsprachige Dateien werden bei
Gelegenheit der Bearbeitung nachgezogen. Ausgenommen sind repo-übergreifend wiederverwendete
Infrastruktur, die nicht zum fachlichen Inhalt dieses Projekts gehört, sowie Code, Bezeichner und
Kommentare selbst. Verbindlich für jede künftige Sitzung in diesem Repository.
