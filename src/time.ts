import { getCalendars } from 'expo-localization';

/**
 * The seam to the device's clock and time zone. No caller touches `new Date()`
 * or `expo-localization` itself: time is the one input that cannot be repeated,
 * and where the zone identifier comes from is a platform question no screen
 * should know about.
 */
export type TimeProvider = {
  /** Now. The only way to the current time in the whole code. */
  now(): Date;
  /** IANA identifier of the device zone. Throws where none can be determined. */
  timeZoneId(): string;
};

/**
 * `expo-localization` is the reliable source, `Intl` the fallback for
 * environments without the native side (web, tests, Node). If both stay silent,
 * no invented `UTC` comes out but an error: an account with a tacitly wrong
 * zone would be worse than a broken build
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

/** For tests and prototypes only: occupy the seam from outside. */
export function setTimeProvider(p: TimeProvider) {
  current = p;
}

/** Back to the device's clock. */
export function resetTimeProvider() {
  current = deviceTime;
}

/** The one way in for all remaining code. */
export const time: TimeProvider = {
  now: () => current.now(),
  timeZoneId: () => current.timeZoneId(),
};
