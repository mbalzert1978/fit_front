import { getCalendars } from 'expo-localization';

/**
 * Die Naht zur Uhr und zur Zeitzone des Geräts. Kein Aufrufer fasst
 * `new Date()` oder `expo-localization` selbst an: die Zeit ist die eine
 * Eingabe, die sich nicht wiederholen lässt, und die Herkunft der Zonenkennung
 * ist eine Plattformfrage, von der kein Screen wissen soll.
 */
export type TimeProvider = {
  /** Jetzt. Der einzige Weg zur aktuellen Zeit im ganzen Code. */
  now(): Date;
  /** IANA-Kennung der Gerätezone. Wirft, wenn keine zu ermitteln ist. */
  timeZoneId(): string;
};

/**
 * `expo-localization` ist die verlässliche Quelle, `Intl` der Rückfall für
 * Umgebungen ohne native Seite (Web, Tests, Node). Schweigt beides, kommt kein
 * erfundenes `UTC`, sondern ein Fehler: ein Konto mit stillschweigend falscher
 * Zone wäre schlimmer als ein kaputter Build
 * (`docs/decisions/2026-08-20-0936-zeitzone-scheitert-schnell-und-reist-wie-das-geraet-sie-nennt.md`).
 */
const deviceTime: TimeProvider = {
  now: () => new Date(),
  timeZoneId: () => {
    const fromDevice = getCalendars()[0]?.timeZone;
    if (fromDevice) return fromDevice;
    const fromIntl = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (fromIntl) return fromIntl;
    throw new Error('Keine Zeitzone zu ermitteln: weder expo-localization noch Intl antworten.');
  },
};

let current: TimeProvider = deviceTime;

/** Nur für Tests und Prototypen: die Naht von außen besetzen. */
export function setTimeProvider(p: TimeProvider) {
  current = p;
}

/** Zurück zur Gerätezeit. */
export function resetTimeProvider() {
  current = deviceTime;
}

/** Der eine Zugang für allen übrigen Code. */
export const time: TimeProvider = {
  now: () => current.now(),
  timeZoneId: () => current.timeZoneId(),
};
