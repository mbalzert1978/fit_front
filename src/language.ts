import { getLocales } from 'expo-localization';

/**
 * Die Naht zur Sprache des Nutzers.
 *
 * Sie steht neben `src/time.ts` und nicht darin: die Zeit ist die Eingabe, die
 * sich nicht wiederholen lässt, die Sprache dagegen eine Vorliebe. Was beide
 * teilen, ist die Herkunft — beide kommen aus dem Gerät, und kein Aufrufer
 * fragt es selbst.
 *
 * An dieser einen Stelle entsteht der Wert, der zweimal hinausgeht: als
 * `Accept-Language` an jeder Anfrage und als `locale` beim Anlegen eines
 * Kontos. Zwei Quellen dafür liefen auseinander, und das Konto trüge dann eine
 * andere Sprache, als der Nutzer zu sehen bekommt.
 */

/**
 * Die Sprachen, in denen die API Sätze für den Nutzer liefert. Die Liste ist
 * eine Zusage der Gegenseite und kein Wunsch von hier: `locale` nimmt beim
 * Anlegen eines Kontos genau diese Kennungen an und lehnt jede andere ab.
 * Wächst sie dort, wächst sie hier — und nicht umgekehrt.
 */
export const supportedLanguages = ['de', 'en'] as const;

export type Language = (typeof supportedLanguages)[number];

/**
 * Wohin es fällt, wenn das Gerät keine dieser Sprachen nennt. Anders als bei
 * der Zeitzone wird hier nicht geworfen: eine Sprache, die niemand anbietet,
 * ist kein kaputter Build, sondern ein Nutzer, für den wir noch nichts haben.
 * Er bekommt Deutsch — für ihn vielleicht unverständlich, aber vollständig.
 */
export const defaultLanguage: Language = 'de';

export type LanguageProvider = {
  /** Die Sprache, in der diese App mit diesem Nutzer redet. */
  tag(): Language;
};

const isSupported = (code: string | null | undefined): code is Language =>
  !!code && (supportedLanguages as readonly string[]).includes(code);

/**
 * `getLocales()` gibt die Sprachen in der Reihenfolge, die der Nutzer in den
 * Systemeinstellungen gesetzt hat. Genommen wird die erste, die wir bedienen
 * können — nicht die erste überhaupt: wer Französisch vor Englisch stellt,
 * bekommt Englisch und nicht Deutsch, weil das seiner Wahl näher kommt.
 *
 * Verglichen wird der Sprachanteil ohne Region (`de` aus `de-AT`): die Region
 * entscheidet über Datums- und Zahlformate, nicht darüber, welchen Satz ein
 * Server schickt.
 */
const deviceLanguage: LanguageProvider = {
  tag: () => {
    for (const locale of getLocales()) {
      if (isSupported(locale.languageCode)) return locale.languageCode;
    }
    return defaultLanguage;
  },
};

let current: LanguageProvider = deviceLanguage;

/**
 * Was der Nutzer in den Einstellungen gewählt hat, sobald es gelesen ist —
 * `null`, solange nicht.
 *
 * Die Wahl schlägt das Gerät: wer in der App auf Englisch stellt, hat damit
 * gesagt, in welcher Sprache er lesen will, und das gilt auch auf einem
 * deutschen Telefon. Der Server kann uns das nicht abnehmen — er entscheidet
 * die Sprache **allein** an `Accept-Language` und ausdrücklich nicht an
 * `User.locale` (`src/api/i18n.py` im Backend-Repo), damit ihn nicht jeder
 * Fehlerfall am Rand einen Datenbankzugriff kostet. Wer die Wahl kennt, muss
 * sie also mitschicken, und das sind wir.
 */
let chosen: Language | null = null;

/**
 * Die gelesene oder gerade gespeicherte Vorliebe setzen; `null` nimmt sie
 * zurück. Gerufen wird das dort, wo `/preferences` durchkommt
 * (`src/api/hooks.ts`) und beim Abmelden — die Wahl gehört einem Konto, nicht
 * dem Gerät, und darf dem nächsten Nutzer nicht anhängen.
 */
export function preferLanguage(tag: Language | null) {
  chosen = tag;
}

/** Nur für Tests und Prototypen: die Naht von außen besetzen. */
export function setLanguageProvider(p: LanguageProvider) {
  current = p;
}

/** Zurück zur Sprache des Geräts, ohne gewählte Vorliebe. */
export function resetLanguageProvider() {
  current = deviceLanguage;
  chosen = null;
}

/** Der eine Zugang für allen übrigen Code. */
export const language: LanguageProvider = {
  tag: () => chosen ?? current.tag(),
};
