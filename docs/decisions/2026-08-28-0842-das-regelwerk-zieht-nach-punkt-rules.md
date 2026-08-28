# Das Regelwerk zieht nach `.rules/`, `docs/regeln.md` wird aufgelöst

## Lage

Das Backend-Repo `fit_back` führt sein Regelwerk unter `.rules/` — eine gemeinsame Schicht
`common/` plus ein sprachspezifisches Verzeichnis. Dieses Repo hatte kein Gegenstück dazu: Regeln
zu Stil, Typen, Fehlerbehandlung und Schnitt standen nirgends, und die Regeln **dieser App**
standen in `docs/regeln.md`. Damit gab es zwei Orte, an denen eine Regel stehen konnte, und für
alles, was weder Oberfläche noch Vertrag betraf, gar keinen.

## Entscheidung

Ab sofort steht **jede Regel dieses Repos in `.rules/`**, in drei Schichten:
`common/` (sprachunabhängige Prinzipien), `typescript/` (das Idiom dieses Stacks),
`app/` (was für diese App gilt). `docs/regeln.md` ist in `.rules/app/` aufgelöst — je eine Datei
für Farb- und Maßliterale, Beschriftungen, Verträge, HTTP-Schicht und die Prüfliste vor der
Abnahme — und gelöscht. Der Vorrang lautet: **`app/` schlägt `typescript/` schlägt `common/`**;
das Speziellere gewinnt.

Die zwölf Dateien unter `typescript/` sind sinngemäße Übersetzungen der Python-Schicht der Vorlage.
Übersetzt ist die **Absicht** einer Regel, nicht ihr Wortlaut: Codebeispiele, Werkzeuge und
Belegstellen sind die dieses Repos. Wo das TypeScript-Idiom gegen die Vorlage steht, steht die
Abweichung an Ort und Stelle in der Datei und begründet sich dort — kein `Result`-Typ wird
erfunden, kein Walrus nachgebaut, keine sortierbare UUID von einer Bibliothek verlangt, die keine
anbietet.

## Begründung

Ein Regelwerk, das an zwei Orten liegt, wird an einem davon vergessen. `CLAUDE.md` verlinkt nur und
behauptet nichts; `docs/decisions/` sagt, **warum** eine Regel so lautet. Damit fehlte genau eine
Stelle, die sagt, **dass** sie gilt — und die ist jetzt `.rules/`.

Die App-Regeln bekommen ein eigenes Verzeichnis statt einer Einarbeitung in `typescript/`, weil sie
keine Sprachregeln sind: eine Vertragsregel gilt unabhängig davon, in welcher Sprache der Client
geschrieben ist, und in einer Datei über TypeScript-Idiom fände sie niemand. Der Wortlaut ist
unverändert übernommen; geändert sind nur die Pfade der Verweise.

`docs/regeln.md` wird gelöscht und nicht als Weiterleitung stehen gelassen: eine Datei, die nur
noch auf eine andere zeigt, ist der zweite Ort, den diese Entscheidung gerade abschafft. Der Preis
ist bekannt und wird bewusst getragen — siehe `Folgen`.

## Folgen

- Es entstehen 28 Dateien unter `.rules/`; `docs/regeln.md` entfällt.
- `CLAUDE.md`, `README.md` und `docs/neue-sprache.md` verweisen auf `.rules/` statt auf
  `docs/regeln.md`.
- Die Kommentare in `src/api/client.ts`, `src/theme.ts`, `src/language.ts`, `src/i18n/index.ts`,
  `src/components/OutlineButton.tsx`, `app/(tabs)/_layout.tsx`, `pact/setup.ts` und
  `pact/diary.pact.test.ts` nennen den neuen Pfad. Verhalten ändert sich dadurch nicht.
- **23 ältere Entscheidungsdateien verweisen weiter auf `docs/regeln.md` und zeigen damit ins
  Leere.** Sie bleiben unverändert liegen, wie es die Regel dieses Ordners verlangt: eine
  Entscheidung wird nicht überschrieben. Wer dort auf den toten Verweis stößt, findet den Inhalt
  unter `.rules/app/` — diese Datei ist der Wegweiser dorthin.
- Ungültig wird jede Formulierung der Art „steht in `docs/regeln.md`". Neue Regeln entstehen ab
  jetzt in der passenden Schicht unter `.rules/`, nicht daneben.
- Kein Ziel in `make.ps1` prüft `.rules/`: Markdown steht in `.prettierignore`, ESLint und `tsc`
  sehen nur `.ts`, `.tsx` und `.js`. Das Regelwerk wird gelesen, nicht ausgeführt.
