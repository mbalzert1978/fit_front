/**
 * Ersatz für `expo-localization` im Vertragslauf.
 *
 * Die echte Umsetzung hat eine native Seite und kann in Node nicht antworten.
 * Der Vertrag braucht sie auch nicht — er braucht nur ein festes Gerät, damit
 * die Anfrage in jedem Lauf dieselbe ist. `src/time.ts` und `src/language.ts`
 * sind die einzigen Stellen, die das Modul überhaupt kennen; dieser Stub ist
 * ihr Gegenstück.
 *
 * Ein Test, der eine andere Sprache oder Zone braucht, setzt sie nicht hier,
 * sondern über die Naht (`setLanguageProvider`, `setTimeProvider`) — dann nimmt
 * der Wert denselben Weg wie auf dem Gerät.
 */
export function getCalendars() {
  return [{ timeZone: 'Europe/Berlin' }];
}

export function getLocales() {
  return [{ languageCode: 'de', languageTag: 'de-DE' }];
}
