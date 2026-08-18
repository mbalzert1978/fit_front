import path from 'path';
import { PactV3, MatchersV3 } from '@pact-foundation/pact';
import { MOCK_PORT } from './mockPort';

export const M = MatchersV3;

/**
 * Ein Pact je Consumer/Provider-Paar. Die erzeugten Dateien liegen in ./pacts
 * und werden versioniert — das ist die Übergabe. Verifiziert werden sie im
 * Provider-Repo; von hier aus geschieht das nicht und wird auch nicht geprüft.
 */
export function pact(provider: string) {
  return new PactV3({
    consumer: 'nutritrack-app',
    provider,
    port: MOCK_PORT,
    dir: path.resolve(process.cwd(), 'pacts'),
    logLevel: 'warn',
  });
}

const REQUEST_ID = '01JQ8Z3K7V9XW2P4M6N8R0T5YB';

/**
 * Der Umschlag: Nutzlast unter `data`, Begleitinformation unter `meta`.
 *
 * `data` trägt die Matcher, die der Screen wirklich braucht. `meta` liest kein
 * Screen — zugesichert ist nur, dass es da ist und aus drei Zeichenketten
 * besteht; deshalb durchgehend lockere Matcher und kein fester Wert. So bricht
 * eine neue ULID oder ein anderer Zeitstempel keine Verifikation.
 */
export const enveloped = (data: unknown) => ({
  data,
  meta: {
    requestId: M.string(REQUEST_ID),
    timestamp: M.string('2026-08-18T09:14:22Z'),
    apiVersion: M.string('1'),
  },
});

/** Jede Antwort mit Rumpf. */
export const jsonHeaders = { 'Content-Type': 'application/json' };

/**
 * Antworten, die Token tragen. `Cache-Control: no-store` hält sie aus jedem
 * Zwischenspeicher heraus; `X-Request-Id` ist derselbe Wert wie `meta.requestId`
 * und der einzige Faden, an dem sich eine gescheiterte Anmeldung nachverfolgen
 * lässt. Beide sind Teil der Zusage, nicht Beiwerk.
 */
export const authResponseHeaders = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'X-Request-Id': M.string(REQUEST_ID),
};
