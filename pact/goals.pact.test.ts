import { pact, M } from './setup';
import { api } from '../src/api/client';

/**
 * Bedarf: `app/(tabs)/settings.tsx` — Tagesziel, Makro-Verteilung,
 * Brennwert-Standard, Rundung, Aktivkalorien sowie Darstellung und Sprache.
 *
 * Das Speichern der Ziele passiert in mehreren, jeweils kleinen Teil-Nutzlasten
 * (nur Verteilung, nur Tagesziel, nur ein Schalter). Zugesichert ist deshalb,
 * dass eine Teilangabe genügt und die vollständigen Ziele zurückkommen.
 */
const goals = () => pact('nutritrack-goals');

const goalsBody = {
  dailyKcal: M.integer(2150),
  macros: {
    carbs: { percent: M.integer(40), grams: M.integer(215), kcal: M.integer(882) },
    protein: { percent: M.integer(30), grams: M.integer(161), kcal: M.integer(661) },
    fat: { percent: M.integer(30), grams: M.integer(72), kcal: M.integer(670) },
  },
  // Die vier Werte steuern Schalterstellungen und die Rechnung im Screen selbst.
  energyStandard: M.regex('Physiological|Declaration', 'Physiological'),
  rounding: M.regex('Up|Down', 'Up'),
  includeActivityInGoal: M.boolean(false),
};

describe('Goals', () => {
  it('liefert Ziele mit Verteilung, Brennwert-Standard und Rundung', async () => {
    const p = goals();
    p.given('Nutzer hat ein Tagesziel von 2150 kcal')
      .uponReceiving('Ziele laden')
      .withRequest({ method: 'GET', path: '/api/v1/goals' })
      .willRespondWith({ status: 200, headers: { 'Content-Type': 'application/json' }, body: goalsBody });

    await p.executeTest(async () => {
      const g = await api<{ dailyKcal: number }>('/goals');
      expect(g.dailyKcal).toBeGreaterThan(0);
    });
  });

  it('übernimmt eine Teiländerung und liefert die vollständigen Ziele zurück', async () => {
    const p = goals();
    p.given('Nutzer hat ein Tagesziel von 2150 kcal')
      .uponReceiving('Makro-Verteilung speichern')
      .withRequest({
        method: 'PUT',
        path: '/api/v1/goals',
        headers: { 'Content-Type': 'application/json' },
        body: {
          macros: {
            carbs: { percent: M.integer(40) },
            protein: { percent: M.integer(30) },
            fat: { percent: M.integer(30) },
          },
        },
      })
      .willRespondWith({ status: 200, headers: { 'Content-Type': 'application/json' }, body: goalsBody });

    await p.executeTest(async () => {
      // Die Antwort landet direkt im Cache; ein Nachladen findet nicht statt.
      const g = await api<{ macros: unknown }>('/goals', {
        method: 'PUT',
        body: { macros: { carbs: { percent: 40 }, protein: { percent: 30 }, fat: { percent: 30 } } },
      });
      expect(g.macros).toBeDefined();
    });
  });
});

describe('Preferences', () => {
  it('liefert Darstellung und Sprache', async () => {
    const p = goals();
    p.given('Nutzer hat Einstellungen')
      .uponReceiving('Einstellungen laden')
      .withRequest({ method: 'GET', path: '/api/v1/preferences' })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: { theme: M.regex('Dark|Light', 'Dark'), language: M.regex('de|en', 'de') },
      });

    await p.executeTest(async () => {
      const prefs = await api<{ language: string }>('/preferences');
      expect(prefs.language).toBeTruthy();
    });
  });

  it('speichert eine geänderte Sprache', async () => {
    const p = goals();
    p.given('Nutzer hat Einstellungen')
      .uponReceiving('Sprache speichern')
      .withRequest({
        method: 'PATCH',
        path: '/api/v1/preferences',
        headers: { 'Content-Type': 'application/json' },
        body: { language: M.regex('de|en', 'en') },
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: { theme: M.regex('Dark|Light', 'Dark'), language: M.regex('de|en', 'en') },
      });

    await p.executeTest(async () => {
      const prefs = await api<{ language: string }>('/preferences', { method: 'PATCH', body: { language: 'en' } });
      expect(prefs.language).toBeTruthy();
    });
  });
});
