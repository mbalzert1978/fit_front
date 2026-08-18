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
