# Offene Punkte als Issues, und keine Spezifikation außerhalb dieses Repos

## Lage

Zwei Dinge standen im Repo, die beide dasselbe Problem hatten: sie führten eine Wahrheit an einem
Ort, an dem sie nicht gepflegt wird.

`docs/offene-punkte.md` war eine nummerierte Liste dessen, was bewusst offen ist. Ihre Punkte liegen
längst als Issues auf GitHub (#2 bis #31); die Datei war bereits gelöscht worden und kam bei einer
späteren Bearbeitung versehentlich zurück. Zwei Ablagen für dieselbe Sache heißt, dass eine von
beiden falsch ist, und man merkt es erst, wenn man der falschen glaubt.

`CLAUDE.md` verwies auf `../fit_back/docs/Draft/BACKEND.md` als „die fachliche Spezifikation der
API", `docs/regeln.md` Regel 8 ließ Vertrag und Spezifikation „abstimmen", und
`docs/decisions/README.md` hielt einen fünften Abschnitt für Abweichungen von ihr vor. Damit hing
dieses Repo an einem Dokument in einem fremden Repository, das dort niemand für uns pflegt.

## Entscheidung

Offene Punkte werden **ausschließlich als Issues dieses Repositories auf GitHub** geführt. Es gibt
keine Datei im Repo, die sie doppelt; `docs/offene-punkte.md` ist gelöscht.

Es gibt **keine Spezifikation außerhalb dieses Repositories**. Was die API leistet, steht in
[`../../pact/`](../../pact/) und in den daraus erzeugten Verträgen unter [`../../pacts/`](../../pacts/) —
nirgends sonst. Kein anderes Repository wird gelesen, zitiert oder als Vorgabe herangezogen, und
keine Änderung hier wartet auf eine Abstimmung dort.

## Begründung

**Warum Issues statt Datei.** Ein offener Punkt hat einen Zustand, einen Bearbeiter und eine
Diskussion. Eine Markdown-Liste hat nichts davon: sie kennt kein „erledigt", nur ein stilles
Verschwinden, und wer sie ändert, tut das in einem Commit, der eigentlich von etwas anderem
handelt. Die Nummerierung war zusätzlich eine Falle — sie verschiebt sich, sobald ein Punkt
wegfällt, und jeder Verweis darauf zeigt danach auf etwas anderes. Ein Issue behält seine Nummer,
auch wenn es geschlossen wird.

**Warum keine fremde Spezifikation.** Consumer-driven heißt, dass der Verbraucher bestellt. Ein
zweites Dokument daneben, an dem sich der Vertrag zu messen hätte, macht genau das kaputt: es
verwandelt die Bestellung zurück in einen Abgleich und lädt dazu ein, den eigenen Bedarf
kleinzuschreiben, weil ihn ein fremdes Papier anders nennt. Regel 7 sagt bereits, dass dieses Repo
nichts verifiziert — die Entsprechung dazu ist, dass es sich auch von nichts verifizieren lässt.

Was ein Provider tatsächlich einlöst, zeigt seine Verifikation in seinem eigenen Repository. Das ist
der einzige Ort, an dem sich die Frage entscheidet, und es ist nicht dieser hier.

## Folgen

- `docs/offene-punkte.md` ist gelöscht. Der Inhalt liegt als Issues #2–#31 vor; was beim Foto-Upload
  neu dazukam, ist als Issue #31 (Fortschrittsbalken) und als Kommentar an Issue #2 (Wiederaufsetzen
  einer unterbrochenen Aufnahme) eingetragen und nicht verlorengegangen.
- `CLAUDE.md` verweist statt auf die Datei auf die Issues und trägt den Verweis auf `fit_back` nicht
  mehr. An seine Stelle tritt der Satz, dass es keine Quelle außerhalb dieses Repositories gibt.
- `README.md` verweist ebenfalls auf die Issues.
- `docs/regeln.md` Regel 8 nennt keine Spezifikation mehr, an der ein Vertrag zu messen wäre.
- `docs/decisions/README.md` sieht den Abschnitt `## Abweichung zur Backend-Spezifikation` nicht
  mehr vor. Die vier Pflichtabschnitte bleiben.
- Kommentare in `pact/diary.pact.test.ts`, `pact/healthsync.pact.test.ts` und `pact/setup.ts`
  zeigen jetzt auf Issue-Nummern statt auf Punkte einer Datei.
- **Ältere Entscheidungsdateien bleiben unverändert.**
  `2026-08-18-1200-data-meta-umschlag-und-oauth-benennung.md` und
  `2026-08-18-1600-auth-und-fehlerfaelle-sind-vertragsvorgabe.md` tragen weiterhin einen Abschnitt
  `Abweichung zur Backend-Spezifikation`, `2026-08-18-1400-…` und `…-1600-…` verweisen weiterhin auf
  `offene-punkte.md`. Das ist kein Versehen: eine Entscheidung wird nicht überschrieben, und was sie
  zu ihrer Zeit festhielt, bleibt lesbar. Für alles ab hier gilt diese Datei.
- `2026-08-18-1800-foto-upload-ueber-presigned-url.md` bleibt inhaltlich gültig; seine Verweise auf
  `offene-punkte.md` zeigen jetzt auf die Issues.
