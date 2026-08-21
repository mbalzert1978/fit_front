import { getLocales } from 'expo-localization';

/**
 * Die Naht zur Sprache des Nutzers: die eine Stelle, an der der Wert entsteht,
 * der zweimal hinausgeht — als `Accept-Language` an jeder Anfrage und als
 * `locale` beim Anlegen eines Kontos (`docs/regeln.md`, Beschriftungen).
 */

/**
 * Eine Zusage der Gegenseite, kein Wunsch von hier: `locale` nimmt genau diese
 * Kennungen an. Wächst die Liste dort, wächst sie hier — nicht umgekehrt.
 */
export const supportedLanguages = ['de', 'en'] as const;

export type Language = (typeof supportedLanguages)[number];

/**
 * Anders als bei der Zeitzone wird hier nicht geworfen: eine unbediente Sprache
 * ist kein kaputter Build, sondern ein Nutzer, für den wir noch nichts haben.
 */
export const defaultLanguage: Language = 'de';

export type LanguageProvider = {
  /** Die Sprache, in der diese App mit diesem Nutzer redet. */
  tag(): Language;
};

const isSupported = (code: string | null | undefined): code is Language =>
  !!code && (supportedLanguages as readonly string[]).includes(code);

/**
 * Genommen wird die erste **unterstützte** Sprache der Systemliste, nicht die
 * erste überhaupt: wer Französisch vor Englisch stellt, bekommt Englisch.
 * Verglichen wird ohne Region (`de` aus `de-AT`) — die Region entscheidet über
 * Formate, nicht über den Satz, den ein Server schickt.
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
 * Was der Nutzer gewählt hat, sobald es gelesen ist — `null`, solange nicht.
 *
 * Die Wahl schlägt das Gerät. Der Server kann sie uns nicht abnehmen: er
 * entscheidet die Sprache **allein** an `Accept-Language` und nicht am Konto.
 * Wer die Wahl kennt, muss sie also mitschicken, und das sind wir.
 */
let chosen: Language | null = null;

/**
 * Woran `src/i18n` hängt: ohne diese Menge stünde die Maske bis zum Neustart in
 * der alten Sprache, während der Server schon in der neuen antwortet.
 */
const listeners = new Set<() => void>();

export function subscribeLanguage(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const announce = () => listeners.forEach((l) => l());

/**
 * `null` nimmt die Vorliebe zurück — beim Abmelden: die Wahl gehört einem
 * Konto, nicht dem Gerät, und darf dem nächsten Nutzer nicht anhängen.
 */
export function preferLanguage(tag: Language | null) {
  chosen = tag;
  announce();
}

/** Nur für Tests und Prototypen: die Naht von außen besetzen. */
export function setLanguageProvider(p: LanguageProvider) {
  current = p;
  announce();
}

/** Zurück zur Sprache des Geräts, ohne gewählte Vorliebe. */
export function resetLanguageProvider() {
  current = deviceLanguage;
  chosen = null;
  announce();
}

/** Der eine Zugang für allen übrigen Code. */
export const language: LanguageProvider = {
  tag: () => chosen ?? current.tag(),
};
