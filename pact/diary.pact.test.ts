import { pact, M } from './setup';
import { api, endpoints } from '../src/api/client';
import { parseDiaryDate } from '../src/api/diaryDate';

const provider = () => pact('nutritrack-diary');
const date = parseDiaryDate('2026-08-04');

describe('Diary', () => {
  it('liefert Tag, Ziele und Aktivität in einer Antwort', async () => {
    const p = provider();
    p.given('Nutzer hat am 2026-08-04 Einträge')
      .uponReceiving('Tagesansicht laden')
      .withRequest({ method: 'GET', path: '/api/v1/diary/days/2026-08-04', headers: { 'Accept-Language': 'de' } })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          date: '2026-08-04',
          totals: { kcal: M.integer(1583), carbsG: M.integer(142), proteinG: M.integer(118), fatG: M.integer(51) },
          goal: { dailyKcal: M.integer(2150), carbsG: M.integer(215), proteinG: M.integer(161), fatG: M.integer(72) },
          slots: M.eachLike({
            id: M.uuid(),
            name: M.string('Frühstück'),
            kcal: M.integer(412),
            entries: M.eachLike({
              id: M.uuid(),
              displayName: M.string('Skyr Natur, Arla'),
              grams: M.integer(150),
              kcal: M.integer(97),
            }),
          }),
          activity: { totalKcal: M.integer(412), entries: M.eachLike({ name: M.string('Laufen'), detail: M.string('38 min · 7,2 km'), kcal: M.integer(264) }) },
        },
      });

    await p.executeTest(async (mock) => {
      process.env.EXPO_PUBLIC_API_URL = mock.url;
      const day = await api<{ date: string }>(endpoints.diaryDay(date));
      expect(day.date).toBe('2026-08-04');
    });
  });

  it('legt einen Eintrag mit Client-Id und Idempotency-Key an', async () => {
    const p = provider();
    const opId = '5a9b0c1d-2e3f-4a5b-8c9d-0e1f2a3b4c5d';
    p.given('Mahlzeiten-Slot existiert')
      .uponReceiving('Eintrag ins Tagebuch schreiben')
      .withRequest({
        method: 'POST',
        path: '/api/v1/diary/days/2026-08-04/entries',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': opId, 'Accept-Language': 'de' },
        body: {
          id: M.uuid(),
          mealSlotId: M.uuid(),
          sourceType: 'Product',
          sourceId: M.uuid(),
          grams: M.integer(150),
        },
      })
      .willRespondWith({
        status: 201,
        headers: { 'Content-Type': 'application/json' },
        body: { id: M.uuid(), grams: M.integer(150), kcal: M.integer(97) },
      });

    await p.executeTest(async (mock) => {
      process.env.EXPO_PUBLIC_API_URL = mock.url;
      const created = await api<{ id: string }>(endpoints.entries(date), {
        method: 'POST',
        idempotencyKey: opId,
        body: {
          id: '11111111-2222-3333-4444-555555555555',
          mealSlotId: '66666666-7777-8888-9999-000000000000',
          sourceType: 'Product',
          sourceId: '99999999-8888-7777-6666-555555555555',
          grams: 150,
        },
      });
      expect(created.id).toBeTruthy();
    });
  });
});
