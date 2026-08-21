/**
 * Stands in for `expo-localization`, which has a native side and cannot answer
 * in Node. The contract only needs a fixed device, so that every run makes the
 * same request.
 *
 * A test that needs a different language or zone sets it through the seam
 * (`setLanguageProvider`, `setTimeProvider`), not here — then the value takes
 * the same path as on the device.
 */
export function getCalendars() {
  return [{ timeZone: 'Europe/Berlin' }];
}

export function getLocales() {
  return [{ languageCode: 'de', languageTag: 'de-DE' }];
}
