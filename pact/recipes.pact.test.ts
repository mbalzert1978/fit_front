import { pact, M } from './setup';
import { api } from '../src/api/client';

describe('Recipes', () => {
  it('liefert Rezepte absteigend nach Namen mit abgeleiteten Werten', async () => {
    const p = pact('nutritrack-recipes');
    p.given('Nutzer hat zwei Rezepte')
      .uponReceiving('Rezeptliste laden')
      .withRequest({ method: 'GET', path: '/api/v1/recipes', query: { sort: 'name_desc' } })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: M.eachLike({
          id: M.uuid(),
          name: M.string('Hähnchen-Reis-Pfanne'),
          portions: M.integer(4),
          totalGrams: M.integer(1350),
          gramsPerPortion: M.integer(338),
          totalKcal: M.integer(1648),
          kcalPerPortion: M.integer(412),
        }),
      });

    await p.executeTest(async (mock) => {
      process.env.EXPO_PUBLIC_API_URL = mock.url;
      const list = await api<unknown[]>('/recipes?sort=name_desc');
      expect(Array.isArray(list)).toBe(true);
    });
  });

  it('übernimmt Portionen ins Tagebuch', async () => {
    const p = pact('nutritrack-recipes');
    p.given('Rezept und Mahlzeiten-Slot existieren')
      .uponReceiving('Portionen ins Tagebuch übernehmen')
      .withRequest({
        method: 'POST',
        path: M.regex('/api/v1/recipes/[0-9a-f-]{36}/portions-to-diary', '/api/v1/recipes/2f1c9b7e-1111-4222-8333-444455556666/portions-to-diary'),
        headers: { 'Content-Type': 'application/json' },
        body: { date: '2026-08-04', mealSlotId: M.uuid(), amount: M.integer(1), unit: 'Portion' },
      })
      .willRespondWith({ status: 201, headers: { 'Content-Type': 'application/json' }, body: { entryId: M.uuid(), grams: M.integer(338), kcal: M.integer(412) } });

    await p.executeTest(async (mock) => {
      process.env.EXPO_PUBLIC_API_URL = mock.url;
      const r = await api<{ entryId: string }>('/recipes/2f1c9b7e-1111-4222-8333-444455556666/portions-to-diary', {
        method: 'POST',
        body: { date: '2026-08-04', mealSlotId: '77777777-8888-9999-aaaa-bbbbbbbbbbbb', amount: 1, unit: 'Portion' },
      });
      expect(r.entryId).toBeTruthy();
    });
  });
});
