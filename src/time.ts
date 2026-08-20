import { getCalendars } from 'expo-localization';

/**
 * Die Naht zur Uhr und zur Zeitzone des Geräts.
 *
 * Kein Aufrufer fasst `new Date()` oder `expo-localization` selbst an. Das hat
 * zwei Gründe: die Zeit ist die eine Eingabe, die sich nicht wiederholen lässt —
 * ein Test, der sie nicht setzen kann, prüft an jedem Tag etwas anderes —, und
 * die Herkunft der Zonenkennung ist eine Plattformfrage, die sich ändern darf,
 * ohne dass ein Screen davon weiß.
 *
 * Wächst hier etwas hinzu (Uhrzeit des Geräts gegen Serverzeit, eine zweite
 * Quelle für die Zone), wächst es in dieser Datei und nicht daneben.
 */
export type TimeProvider = {
  /** Jetzt. Der einzige Weg zur aktuellen Zeit im ganzen Code. */
  now(): Date;
  /** IANA-Kennung der Gerätezone, etwa `Europe/Berlin`; `null`, wenn sie nicht zu ermitteln ist. */
  timeZoneId(): string | null;
};

/**
 * Die Umsetzung für das Gerät. `expo-localization` ist die verlässliche Quelle;
 * `Intl` ist der Rückfall für Umgebungen ohne die native Seite (Tests, Node).
 * Lässt sich beides nicht befragen, kommt `null` heraus und nicht etwa `UTC` —
 * eine erfundene Zone wäre still falsch, und still falsch ist schlimmer als
 * unbekannt.
 */
const deviceTime: TimeProvider = {
  now: () => new Date(),
  timeZoneId: () => {
    const fromDevice = getCalendars()[0]?.timeZone;
    if (fromDevice) return fromDevice;
    const fromIntl = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return fromIntl || null;
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
