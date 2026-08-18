import { pact, M } from './setup';
import { api } from '../src/api/client';

/**
 * Bedarf: `app/login.tsx` (über `src/api/session.ts`) und die 401-Behandlung in
 * `src/api/client.ts`. Der Screen unterscheidet genau zwei Ausgänge — angemeldet
 * oder Feld rot; deshalb genau ein Erfolgs- und ein Fehlerfall.
 */
const provider = () => pact('nutritrack-identity');

describe('Identity', () => {
  it('gibt bei Anmeldung ein Token-Paar zurück', async () => {
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
        headers: { 'Content-Type': 'application/json' },
        body: {
          userId: M.uuid(),
          accessToken: M.string('eyJhbGciOi...'),
          refreshToken: M.string('rt_...'),
          expiresInSeconds: M.integer(900),
        },
      });

    await p.executeTest(async () => {
      const s = await api<{ accessToken: string; refreshToken: string }>('/identity/login', {
        method: 'POST',
        body: { email: 'a@b.de', password: 'geheim123' },
      });
      // session.ts legt beide Token ab; ohne sie ist keine weitere Anfrage möglich.
      expect(s.accessToken).toBeTruthy();
      expect(s.refreshToken).toBeTruthy();
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
        headers: { 'Content-Type': 'application/json' },
        body: { refreshToken: M.string('rt_...') },
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: { accessToken: M.string('eyJhbGciOi...'), refreshToken: M.string('rt_neu') },
      });

    await p.executeTest(async () => {
      // Diesen Aufruf macht die fetch-Hülle selbst, sobald eine Antwort 401 ist.
      const fresh = await api<{ accessToken: string; refreshToken: string }>('/identity/refresh', {
        method: 'POST',
        body: { refreshToken: 'rt_alt' },
      });
      expect(fresh.accessToken).toBeTruthy();
      expect(fresh.refreshToken).toBeTruthy();
    });
  });
});
