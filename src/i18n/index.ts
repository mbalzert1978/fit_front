import { useSyncExternalStore } from 'react';
import { language, subscribeLanguage, type Language } from '../language';
import { de, type Texts } from './de';
import { en } from './en';

/**
 * Die Schicht vor den Ressourcendateien; welche Sprache gilt, entscheidet die
 * Naht in `src/language.ts` (`docs/regeln.md`, Beschriftungen).
 *
 * Der Rückfall ist ein Spread und keine Suche: die deutsche Fassung ist
 * vollständig, ein fehlender Satz ist damit deutsch und nie ein Schlüssel.
 */
const bundles: Record<Language, Texts> = { de, en: { ...de, ...en } };

/** Die Sätze der geltenden Sprache, außerhalb von React. */
export const texts = (): Texts => bundles[language.tag()];

/** Wie `texts()`, innerhalb von React — samt Neuzeichnen, sobald die Sprache wechselt. */
export function useTexts(): Texts {
  return useSyncExternalStore(subscribeLanguage, texts);
}

/** Die geltende Sprache selbst; der Schalter zeigt damit, was gerade gilt. */
export function useLanguage(): Language {
  return useSyncExternalStore(subscribeLanguage, language.tag);
}

export type { Texts };
