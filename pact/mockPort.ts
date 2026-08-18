/**
 * Fester Port des Pact-Mockservers.
 *
 * `src/api/client.ts` liest `EXPO_PUBLIC_API_URL` beim Modul-Import in eine
 * Konstante — eine Zuweisung an `process.env` im Test kommt zu spaet. Der Port
 * ist deshalb fest, und `pact/env.ts` setzt die Basis-URL, bevor irgendein
 * Modul geladen wird.
 */
export const MOCK_PORT = 8991;
