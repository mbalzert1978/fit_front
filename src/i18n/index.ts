import { useSyncExternalStore } from 'react';
import { language, subscribeLanguage, type Language } from '../language';
import { de, type Texts } from './de';
import { en } from './en';

/**
 * Die Schicht vor den Ressourcendateien.
 *
 * Sie bestimmt nicht, welche Sprache gilt — das tut die Naht in
 * `src/language.ts`, und sie tut es für die Oberfläche und für
 * `Accept-Language` gemeinsam. Zwei Quellen liefen auseinander, und der Nutzer
 * läse englische Serversätze in einer deutschen Maske. Genau das war der Anlass.
 *
 * Der Rückfall ist ein Spread und keine Suche: die englische Fassung liegt über
 * der deutschen, die deutsche ist vollständig. Ein fehlender Satz ist damit
 * deutsch — ein Schlüssel steht nie auf dem Schirm.
 */
const bundles: Record<Language, Texts> = { de, en: { ...de, ...en } };

/** Die Sätze der geltenden Sprache, außerhalb von React. */
export const texts = (): Texts => bundles[language.tag()];

/**
 * Die Sätze der geltenden Sprache, innerhalb von React — und ein Neuzeichnen,
 * sobald sie wechselt. Ohne das bliebe die Oberfläche bis zum Neustart stehen,
 * während der Server längst in der neuen Sprache antwortet.
 */
export function useTexts(): Texts {
  return useSyncExternalStore(subscribeLanguage, texts);
}

/** Die geltende Sprache selbst; der Schalter zeigt damit, was gerade gilt. */
export function useLanguage(): Language {
  return useSyncExternalStore(subscribeLanguage, language.tag);
}

export type { Texts };
