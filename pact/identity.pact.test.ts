import { pact, M } from './setup';
import { api } from '../src/api/client';

describe('Identity', () => {
  it('gibt bei Anmeldung ein Token-Paar zurück', async () => {
    const p = pact('nutritrack-identity');
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

    await p.executeTest(async (mock) => {
      process.env.EXPO_PUBLIC_API_URL = mock.url;
      const s = await api<{ accessToken: string }>('/identity/login', { method: 'POST', body: { email: 'a@b.de', password: 'geheim123' } });
      expect(s.accessToken).toBeTruthy();
    });
  });

  it('lehnt falsche Daten mit 401 ab', async () => {
    const p = pact('nutritrack-identity');
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

    await p.executeTest(async (mock) => {
      process.env.EXPO_PUBLIC_API_URL = mock.url;
      await expect(api('/identity/login', { method: 'POST', body: { email: 'a@b.de', password: 'falsch' } })).rejects.toMatchObject({
        type: 'invalid-credentials',
      });
    });
  });
});
