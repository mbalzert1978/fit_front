import path from 'path';
import { PactV3, MatchersV3 } from '@pact-foundation/pact';

export const M = MatchersV3;

/**
 * Ein Pact je Consumer/Provider-Paar. Die erzeugten Dateien liegen in ./pacts
 * und werden in CI an den Broker veröffentlicht (npm run pact:publish);
 * das Backend verifiziert sie gegen seine echte API.
 */
export function pact(provider: string) {
  return new PactV3({
    consumer: 'nutritrack-app',
    provider,
    dir: path.resolve(process.cwd(), 'pacts'),
    logLevel: 'warn',
  });
}
