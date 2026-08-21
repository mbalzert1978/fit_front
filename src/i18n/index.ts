import { useSyncExternalStore } from 'react';
import { language, subscribeLanguage, type Language } from '../language';
import { de, type Texts } from './de';
import { en } from './en';

/**
 * The layer in front of the resource files; which language applies is decided by
 * the seam in `src/language.ts` (`docs/regeln.md`, Beschriftungen).
 *
 * The fallback is a spread and no lookup: the German version is complete, so a
 * missing sentence is German and never a key.
 */
const bundles: Record<Language, Texts> = { de, en: { ...de, ...en } };

/** The sentences of the applying language, outside React. */
export const texts = (): Texts => bundles[language.tag()];

/** Like `texts()`, inside React — including a redraw as soon as the language changes. */
export function useTexts(): Texts {
  return useSyncExternalStore(subscribeLanguage, texts);
}

/** The applying language itself; the switch shows with it what currently holds. */
export function useLanguage(): Language {
  return useSyncExternalStore(subscribeLanguage, language.tag);
}

export type { Texts };
