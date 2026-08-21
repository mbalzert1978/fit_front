import { pact, M, enveloped, authHeadersIn, privateHeaders, unauthorized, problems } from './setup';
import { api } from '../src/api/client';

/**
 * Bedarf: `app/(tabs)/settings.tsx`, Abschnitt „Apple Health".
 *
 * Gelesen wird heute nur die Freigabe-Auskunft: sie beschriftet die Zeile
 * (Verbunden/Nicht verbunden) und stellt die beiden Schalter. Das Herstellen
 * der Verbindung und `PUT /health/activity/{date}` fehlen bewusst — sie sind
 * noch nicht gebaut (Issue #21), und ein Vertrag ohne
 * Aufrufer wäre eine Zusage, die niemand einlöst.
 *
 * Die Freigaben gehören zu einem Nutzer: die Anfrage weist sich aus, und die
 * Antwort ist `no-store`.
 */
const provider = () => pact('nutritrack-health');

describe('HealthSync', () => {
  it('liefert den Stand der Freigaben', async () => {
    const p = provider();
    p.given('Nutzer hat keine Gesundheitsquelle verbunden')
      .uponReceiving('Freigaben laden')
      .withRequest({ method: 'GET', path: '/api/v1/health/consent', headers: authHeadersIn('de') })
      .willRespondWith({
        status: 200,
        headers: privateHeaders,
        body: enveloped({
          connected: M.boolean(false),
          importActivity: M.boolean(false),
          exportNutrition: M.boolean(false),
        }),
      });

    await p.executeTest(async () => {
      const consent = await api<{ connected: boolean }>('/health/consent');
      expect(typeof consent.connected).toBe('boolean');
    });
  });

  it('weist eine abgelaufene Anmeldung mit 401 ab', async () => {
    const p = provider();
    p.given('Access-Token ist abgelaufen')
      .uponReceiving('Freigaben mit abgelaufenem Token laden')
      .withRequest({ method: 'GET', path: '/api/v1/health/consent', headers: authHeadersIn('de') })
      .willRespondWith(unauthorized());

    await p.executeTest(async () => {
      await expect(api('/health/consent')).rejects.toMatchObject({ type: problems.tokenExpired, status: 401 });
    });
  });
});
