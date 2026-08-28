import { getLocales } from 'expo-localization';

/**
 * The seam to the user's language: the one place where the value arises that
 * goes out twice — as `Accept-Language` on every request and as `locale` when
 * an account is created (`.rules/app/beschriftungen.md`).
 */

/**
 * An assurance of the other side, no wish from here: `locale` accepts exactly
 * these identifiers. If the list grows there, it grows here — not the reverse.
 */
export const supportedLanguages = ['de', 'en'] as const;

export type Language = (typeof supportedLanguages)[number];

/**
 * Unlike the time zone, this does not throw: an unserved language is no broken
 * build, but a user we have nothing for yet.
 */
export const defaultLanguage: Language = 'de';

export type LanguageProvider = {
  /** The language this app speaks to this user in. */
  tag(): Language;
};

const isSupported = (code: string | null | undefined): code is Language =>
  !!code && (supportedLanguages as readonly string[]).includes(code);

/**
 * Takes the first **supported** language of the system list and not the first
 * one at all: whoever puts French before English gets English. Compared without
 * the region (`de` from `de-AT`) — the region decides about formats, not about
 * the sentence a server sends.
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
 * What the user chose, as soon as it is read — `null` until then.
 *
 * The choice beats the device. The server cannot take that off our hands: he
 * decides the language **on `Accept-Language` alone** and not on the account.
 * Whoever knows the choice has to send it, and that is us.
 */
let chosen: Language | null = null;

/**
 * What `src/i18n` hangs on: without this set the form would stand in the old
 * language until restart while the server already answers in the new one.
 */
const listeners = new Set<() => void>();

export function subscribeLanguage(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const announce = () => listeners.forEach((l) => l());

/**
 * `null` takes the preference back — on sign-out: the choice belongs to an
 * account, not to the device, and must not stick to the next user.
 */
export function preferLanguage(tag: Language | null) {
  chosen = tag;
  announce();
}

/** For tests and prototypes only: occupy the seam from outside. */
export function setLanguageProvider(p: LanguageProvider) {
  current = p;
  announce();
}

/** Back to the device's language, without a chosen preference. */
export function resetLanguageProvider() {
  current = deviceLanguage;
  chosen = null;
  announce();
}

/** The one way in for all remaining code. */
export const language: LanguageProvider = {
  tag: () => chosen ?? current.tag(),
};
