import { pact, M } from './setup';
import { api } from '../src/api/client';

describe('Settings', () => {
  it('liefert Ziele mit Verteilung, Brennwert-Standard und Rundung', async () => {
    const p = pact('nutritrack-goals');
    p.given('Nutzer hat ein Tagesziel von 2150 kcal')
      .uponReceiving('Ziele laden')
      .withRequest({ method: 'GET', path: '/api/v1/goals' })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          dailyKcal: M.integer(2150),
          macros: {
            carbs: { percent: M.integer(40), grams: M.integer(215), kcal: M.integer(882) },
            protein: { percent: M.integer(30), grams: M.integer(161), kcal: M.integer(661) },
            fat: { percent: M.integer(30), grams: M.integer(72), kcal: M.integer(670) },
          },
          energyStandard: M.regex('Physiological|Declaration', 'Physiological'),
          rounding: M.regex('Up|Down', 'Up'),
          includeActivityInGoal: M.boolean(false),
        },
      });

    await p.executeTest(async (mock) => {
      process.env.EXPO_PUBLIC_API_URL = mock.url;
      const g = await api<{ dailyKcal: number }>('/goals');
      expect(g.dailyKcal).toBeGreaterThan(0);
    });
  });

  it('meldet slot-not-empty, wenn ein belegter Slot gelöscht wird', async () => {
    const p = pact('nutritrack-diary');
    p.given('Slot enthält Einträge')
      .uponReceiving('Belegten Slot löschen')
      .withRequest({
        method: 'DELETE',
        path: M.regex('/api/v1/diary/slots/[0-9a-f-]{36}', '/api/v1/diary/slots/12345678-1234-1234-1234-123456789abc'),
      })
      .willRespondWith({
        status: 409,
        headers: { 'Content-Type': 'application/problem+json' },
        body: { type: 'slot-not-empty', title: M.string('Slot enthält noch Einträge'), status: 409 },
      });

    await p.executeTest(async (mock) => {
      process.env.EXPO_PUBLIC_API_URL = mock.url;
      await expect(api('/diary/slots/12345678-1234-1234-1234-123456789abc', { method: 'DELETE' })).rejects.toMatchObject({
        type: 'slot-not-empty',
      });
    });
  });
});
