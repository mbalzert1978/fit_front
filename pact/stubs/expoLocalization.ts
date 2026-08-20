/**
 * Ersatz für `expo-localization` im Vertragslauf.
 *
 * Die echte Umsetzung hat eine native Seite und kann in Node nicht antworten.
 * Der Vertrag braucht sie auch nicht — er braucht nur eine feste Zone, damit die
 * Anfrage in jedem Lauf dieselbe ist. `src/time.ts` ist die einzige Stelle, die
 * das Modul überhaupt kennt; dieser Stub ist ihr Gegenstück.
 */
export function getCalendars() {
  return [{ timeZone: 'Europe/Berlin' }];
}
