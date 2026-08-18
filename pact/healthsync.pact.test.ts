import { pact, M } from './setup';
import { api } from '../src/api/client';

/**
 * Bedarf: `app/(tabs)/settings.tsx`, Abschnitt „Apple Health".
 *
 * Gelesen wird heute nur die Freigabe-Auskunft: sie beschriftet die Zeile
 * (Verbunden/Nicht verbunden) und stellt die beiden Schalter. Das Herstellen
 * der Verbindung und `PUT /health/activity/{date}` fehlen bewusst — sie sind
 * noch nicht gebaut (docs/offene-punkte.md, Punkt 3), und ein Vertrag ohne
 * Aufrufer wäre eine Zusage, die niemand einlöst.
 */
describe('HealthSync', () => {
  it('liefert den Stand der Freigaben', async () => {
    const p = pact('nutritrack-health');
    p.given('Nutzer hat keine Gesundheitsquelle verbunden')
      .uponReceiving('Freigaben laden')
      .withRequest({ method: 'GET', path: '/api/v1/health/consent' })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          connected: M.boolean(false),
          importActivity: M.boolean(false),
          exportNutrition: M.boolean(false),
        },
      });

    await p.executeTest(async () => {
      const consent = await api<{ connected: boolean }>('/health/consent');
      expect(typeof consent.connected).toBe('boolean');
    });
  });
});
