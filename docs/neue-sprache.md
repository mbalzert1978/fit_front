# Eine neue Sprache beitragen

Anleitung für einen Agenten, der dieser App eine Sprache hinzufügt und das Ergebnis als Pull
Request auf GitHub einreicht. Sie ersetzt nicht das Regelwerk unter [`../.rules/`](../.rules/) — was dort steht, gilt
auch hier.

Beispiel durchgehend: Französisch, `fr`. Ersetze die Kennung durch deine.

Die Kennung wird eingetragen, nicht abgestimmt: `supportedLanguages` in
[`../src/language.ts`](../src/language.ts) fährt als `locale` in die Registrierung, und der Vertrag
bestellt sie damit beim Provider. Auf eine Zusage von drüben wird nicht gewartet (Regel 8 in
[`../.rules/app/vertraege.md`](../.rules/app/vertraege.md)).

## 1. Branch

```sh
git fetch origin
git switch -c feat/sprache-fr origin/main
```

Nie auf `main` committen. Prüfe vor dem ersten Commit mit `git branch --show-current`, worauf du
stehst.

## 2. Die vier Schritte im Code

Halte dich an die Reihenfolge — der Typcheck führt dich. Vier Schritte, aber fünf Dateien: der
letzte fasst zwei an. Die sechste kommt weiter unten dazu, unter „4. Prüfen".

1. **Kennung eintragen:** `fr` in `supportedLanguages` ([`../src/language.ts`](../src/language.ts)).
   Ab hier bricht `npx tsc --noEmit`, bis Schritt 3 steht. Das ist gewollt.
2. **Ressourcendatei anlegen:** `src/i18n/fr.ts`, nach dem Muster von
   [`../src/i18n/en.ts`](../src/i18n/en.ts):

   ```ts
   import { fr as frLocale } from 'date-fns/locale';
   import type { Texts } from './de';

   export const fr: Partial<Texts> = {
     dateLocale: frLocale,
     dayFormat: 'EEEE d MMMM',
     dayMonthFormat: 'd MMMM',
     // …
   };
   ```

   `Partial` ist die Erlaubnis, unfertig zu sein: **lass weg, was du nicht sicher übersetzen
   kannst.** Ein fehlender Satz erscheint deutsch — ein geratener Satz steht falsch auf dem Schirm
   und niemand merkt es. Erfinde keine Schlüssel; `Partial<Texts>` lehnt unbekannte Namen ab.
3. **Bündel registrieren:** in [`../src/i18n/index.ts`](../src/i18n/index.ts)
   `fr: { ...de, ...fr }` zu `bundles` hinzufügen. `Record<Language, Texts>` erzwingt genau das —
   fehlt der Eintrag, bleibt der Typcheck rot.
4. **Schalter erweitern — zwei Dateien:** in
   [`../app/(tabs)/settings.tsx`](../app/\(tabs\)/settings.tsx) eine Option in `Segmented`, und
   den Sprachnamen als Schlüssel in [`../src/i18n/de.ts`](../src/i18n/de.ts)
   (`languageFr: 'Français'`). Sprachnamen stehen in ihrer eigenen Sprache und werden **nicht**
   übersetzt.

   Der Name gehört dort hin und **nicht** als Literal in den Screen:
   `{ value: 'fr', label: 'Français' }` bricht den Lint mit „Beschriftungen gehoeren nach src/i18n
   und kommen ueber useTexts() in den Screen." Die Regel liegt in
   [`../eslint.config.js`](../eslint.config.js) und verbietet in `app/**/*.tsx` sichtbaren Text
   zwischen Tags ebenso wie eine Beschriftung als Attribut (`label`, `hint`, `note`,
   `placeholder`, `title`, `subtitle`, `accessibilityLabel`). Richtig ist
   `{ value: 'fr', label: txt.languageFr }` — `txt` kommt aus `useTexts()`.

## 3. Was du nicht anfasst

- **Die Verträge.** `git diff pacts/` muss nach `./make.ps1 test` leer bleiben. Eine dritte Sprache
  sichert nichts zu, was die beiden vorhandenen Interaktionen nicht schon zeigen (Regel 10 in
  [`../.rules/app/vertraege.md`](../.rules/app/vertraege.md)); ein zusätzlicher Fall in [`../pact/`](../pact/) bläht den Vertrag,
  ohne etwas zu belegen.
- **Sätze des Servers.** Sie werden nicht übersetzt, und eine Tabelle dafür gibt es nicht
  ([`../.rules/app/beschriftungen.md`](../.rules/app/beschriftungen.md)).
- **Die deutsche Fassung.** [`de.ts`](../src/i18n/de.ts) ist die vollständige Liste und der
  Rückfall. Sie ändert sich nur, wenn ein neuer Schlüssel entsteht.
- **Die Reihenfolge, in der die Sprache gilt.** Sie steht als Regel in
  [`../.rules/app/http-schicht.md`](../.rules/app/http-schicht.md), gebaut in
  [`../src/language.ts`](../src/language.ts), und ist nicht Teil eines Sprachbeitrags.

## 4. Prüfen

Hier kommt die sechste Datei dazu.

```sh
./make.ps1 ci            # der Lauf vor jedem Push
git diff --stat pacts/   # muss leer sein
```

Ergänze in [`../src/i18n/i18n.test.ts`](../src/i18n/i18n.test.ts) den Rückfall für deine Sprache:
ein Test, der belegt, dass ein nicht übersetzter Schlüssel den deutschen Satz liefert und keinen
Schlüsselnamen. Ohne diesen Test ist die Sprache nicht fertig.

Sieh dir die Umstellung außerdem einmal in der laufenden App an (`npm start`): der Schalter in den
Einstellungen muss die Oberfläche **sofort** wechseln, ohne Neustart.

## 5. Entscheidung festhalten

Eine neue Sprache ist eine relevante Neuerung: eine Datei unter
[`decisions/`](decisions/), Format und Benennung nach [`decisions/README.md`](decisions/README.md),
auf Deutsch. Vier Abschnitte, keine weiteren. Nenne darin, wie weit die Übersetzung reicht und was
bewusst deutsch geblieben ist.

## 6. Pull Request

```sh
git commit                       # Betreff deutsch, im Indikativ, mit Issue-Nummer
gh pr create --base main --fill  # Titel und Beschreibung deutsch
```

In die Beschreibung gehören:

- die Kennung und der Stand der Übersetzung („vollständig" oder „N Schlüssel offen"),
- die Zeile, dass `./make.ps1 ci` grün lief und `pacts/` unverändert blieb.

Kein Push auf `main`, kein Merge des eigenen PR. Hast du kein Schreibrecht, arbeite auf einem Fork
und öffne den PR von dort.

## Fertig, wenn

- [ ] Die Kennung steht in `supportedLanguages`.
- [ ] `src/i18n/<kennung>.ts` liegt vor, ist `Partial<Texts>`, und nichts darin ist geraten.
- [ ] Das Bündel ist in `src/i18n/index.ts` registriert, der Schalter zeigt die Sprache.
- [ ] Der Rückfalltest für die neue Sprache läuft.
- [ ] `./make.ps1 ci` ist grün, `pacts/` unverändert.
- [ ] Entscheidung unter `docs/decisions/` angelegt.
- [ ] PR steht gegen `main`, auf Deutsch, mit Issue-Bezug.
