import { pact, M, enveloped, jsonHeaders, authResponseHeaders } from './setup';
import { api } from '../src/api/client';
import type { AuthTokens } from '../src/api/types';

/**
 * Bedarf: `app/login.tsx` (über `src/api/session.ts`) und die 401-Behandlung in
 * `src/api/client.ts`. Der Screen unterscheidet genau zwei Ausgänge — angemeldet
 * oder Feld rot; deshalb genau ein Erfolgs- und ein Fehlerfall.
 *
 * Die Token-Antwort ist nach OAuth 2 benannt: `tokenType`, `expiresIn` und
 * `refreshExpiresIn` in Sekunden, die Identität als `user.id`. Die Laufzeiten
 * liest heute kein Screen, aber ohne sie kann die Hülle nie erneuern, bevor ein
 * Aufruf scheitert — sie gehören deshalb in die Zusage.
 */
const provider = () => pact('nutritrack-identity');

const tokenPair = {
  tokenType: 'Bearer',
  accessToken: M.string('eyJhbGciOi...'),
  expiresIn: M.integer(900),
  refreshToken: M.string('rt_...'),
  refreshExpiresIn: M.integer(5184000),
  user: { id: M.uuid() },
};

describe('Identity', () => {
  it('gibt bei Anmeldung ein Token-Paar im Umschlag zurück', async () => {
    const p = provider();
    p.given('Nutzer a@b.de existiert mit Passwort geheim123')
      .uponReceiving('Anmeldung mit gültigen Daten')
      .withRequest({
        method: 'POST',
        path: '/api/v1/identity/login',
        headers: { 'Content-Type': 'application/json' },
        body: { email: 'a@b.de', password: 'geheim123' },
      })
      .willRespondWith({
        status: 200,
        headers: authResponseHeaders,
        body: enveloped(tokenPair),
      });

    await p.executeTest(async () => {
      const s = await api<AuthTokens>('/identity/login', {
        method: 'POST',
        body: { email: 'a@b.de', password: 'geheim123' },
      });
      // session.ts legt beide Token ab; ohne sie ist keine weitere Anfrage möglich.
      expect(s.accessToken).toBeTruthy();
      expect(s.refreshToken).toBeTruthy();
      // Der Tokentyp steht in der Antwort, statt im Client fest verdrahtet zu sein.
      expect(s.tokenType).toBe('Bearer');
      expect(s.user.id).toBeTruthy();
    });
  });

  it('lehnt falsche Daten mit 401 ab', async () => {
    const p = provider();
    p.given('Nutzer a@b.de existiert mit Passwort geheim123')
      .uponReceiving('Anmeldung mit falschem Passwort')
      .withRequest({
        method: 'POST',
        path: '/api/v1/identity/login',
        headers: { 'Content-Type': 'application/json' },
        body: { email: 'a@b.de', password: 'falsch' },
      })
      .willRespondWith({
        status: 401,
        // Fehler tragen keinen Umschlag: problem+json bleibt, wie es ist.
        headers: { 'Content-Type': 'application/problem+json' },
        body: { type: 'invalid-credentials', title: M.string('Anmeldung fehlgeschlagen'), status: 401 },
      });

    await p.executeTest(async () => {
      await expect(api('/identity/login', { method: 'POST', body: { email: 'a@b.de', password: 'falsch' } })).rejects.toMatchObject({
        type: 'invalid-credentials',
      });
    });
  });

  it('tauscht einen Refresh-Token gegen ein neues Paar', async () => {
    const p = provider();
    p.given('Nutzer hat einen gültigen Refresh-Token')
      .uponReceiving('Sitzung erneuern')
      .withRequest({
        method: 'POST',
        path: '/api/v1/identity/refresh',
        headers: jsonHeaders,
        body: { refreshToken: M.string('rt_...') },
      })
      .willRespondWith({
        status: 200,
        headers: authResponseHeaders,
        // Dieselbe Nutzlast wie die Anmeldung — die Hülle wertet beides gleich aus.
        body: enveloped({ ...tokenPair, refreshToken: M.string('rt_neu') }),
      });

    await p.executeTest(async () => {
      // Diesen Aufruf macht die fetch-Hülle selbst, sobald eine Antwort 401 ist.
      const fresh = await api<AuthTokens>('/identity/refresh', {
        method: 'POST',
        body: { refreshToken: 'rt_alt' },
      });
      expect(fresh.accessToken).toBeTruthy();
      expect(fresh.refreshToken).toBeTruthy();
    });
  });
});
