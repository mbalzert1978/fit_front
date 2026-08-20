import { pact, M, enveloped, authHeadersIn, jsonAuthHeadersIn, privateHeaders, problem, unauthorized, problems } from './setup';
import { api, endpoints } from '../src/api/client';
import { parseDiaryDate } from '../src/api/diaryDate';

/**
 * Bedarf: `app/(tabs)/diary.tsx`, `app/entry/[id].tsx`, `app/(tabs)/settings.tsx`
 * (Mahlzeiten-Slots) und `app/(tabs)/scan.tsx` (letzte Einträge).
 *
 * Zugesichert ist nur, was diese Screens lesen. `sourceType`/`sourceId` am
 * Eintrag stehen zwar im Typ, werden aber von keinem Screen angefasst — sie
 * fehlen hier bewusst. `isFuture` fehlt ebenfalls: ob ein Tag in der Zukunft
 * liegt, vergleicht der Screen selbst — ein Feld, das beide Seiten rechnen,
 * wäre eine zweite Wahrheit. `PATCH .../slot` fehlt auch: die
 * Verschiebe-Mutation existiert, die Gestik dazu nicht
 * (docs/offene-punkte.md, Punkt 2).
 *
 * Alles hier ist die Ernährung eines einzelnen Nutzers. Jede Anfrage weist sich
 * deshalb aus, und jede Antwort mit Rumpf trägt `no-store` — ein Tagebuchtag im
 * Klartext im Cache-Verzeichnis wäre der Punkt, an dem ein Gerätebackup mehr
 * verrät als jede Anmeldung.
 */
const provider = () => pact('nutritrack-diary');
const date = parseDiaryDate('2026-08-04');
const entryId = '5a9b0c1d-2e3f-4a5b-8c9d-0e1f2a3b4c5d';
const slotId = '66666666-7777-8888-9999-000000000000';
const uuidPath = '[0-9a-f-]{36}';

describe('Diary — Tagesansicht', () => {
  it('liefert Tag, Ziele, Rest und Aktivität in einer Antwort', async () => {
    const p = provider();
    p.given('Nutzer hat am 2026-08-04 Einträge und eine verbundene Aktivitätsquelle')
      .uponReceiving('Tagesansicht laden')
      .withRequest({ method: 'GET', path: '/api/v1/diary/days/2026-08-04', headers: authHeadersIn('de') })
      .willRespondWith({
        status: 200,
        headers: privateHeaders,
        body: enveloped({
          date: '2026-08-04',
          totals: { kcal: M.integer(1583), carbsG: M.integer(142), proteinG: M.integer(118), fatG: M.integer(51) },
          goal: { dailyKcal: M.integer(2150), carbsG: M.integer(215), proteinG: M.integer(161), fatG: M.integer(72) },
          remainingKcal: M.integer(567),
          slots: M.eachLike({
            id: M.uuid(),
            name: M.string('Frühstück'),
            kcal: M.integer(412),
            entries: M.eachLike({
              id: M.uuid(),
              displayName: M.string('Skyr Natur, Arla'),
              portionText: M.string('150 g'),
              grams: M.integer(150),
              kcal: M.integer(97),
            }),
          }),
          activity: {
            connected: M.boolean(true),
            totalKcal: M.integer(412),
            entries: M.eachLike({
              externalId: M.string('hk-9d2f'),
              name: M.string('Laufen'),
              detail: M.string('38 min · 7,2 km'),
              kcal: M.integer(264),
            }),
          },
        }),
      });

    await p.executeTest(async () => {
      const day = await api<{ date: string; remainingKcal: number }>(endpoints.diaryDay(date));
      expect(day.date).toBe('2026-08-04');
      expect(typeof day.remainingKcal).toBe('number');
    });
  });

  it('liefert activity als null, wenn keine Quelle verbunden ist', async () => {
    const p = provider();
    p.given('Nutzer hat am 2026-08-05 Einträge und keine Aktivitätsquelle')
      .uponReceiving('Tagesansicht ohne Aktivitätsquelle laden')
      .withRequest({ method: 'GET', path: '/api/v1/diary/days/2026-08-05', headers: authHeadersIn('de') })
      .willRespondWith({
        status: 200,
        headers: privateHeaders,
        body: enveloped({
          date: '2026-08-05',
          totals: { kcal: M.integer(0), carbsG: M.integer(0), proteinG: M.integer(0), fatG: M.integer(0) },
          goal: { dailyKcal: M.integer(2150), carbsG: M.integer(215), proteinG: M.integer(161), fatG: M.integer(72) },
          remainingKcal: M.integer(2150),
          slots: M.eachLike({ id: M.uuid(), name: M.string('Frühstück'), kcal: M.integer(0), entries: [] }),
          // Der Aktivitätsblock wird dann gar nicht gezeichnet.
          activity: null,
        }),
      });

    await p.executeTest(async () => {
      const day = await api<{ activity: unknown }>(endpoints.diaryDay(parseDiaryDate('2026-08-05')));
      expect(day.activity).toBeNull();
    });
  });

  it('weist eine abgelaufene Anmeldung mit 401 ab', async () => {
    const p = provider();
    p.given('Access-Token ist abgelaufen')
      .uponReceiving('Tagesansicht mit abgelaufenem Token laden')
      .withRequest({ method: 'GET', path: '/api/v1/diary/days/2026-08-04', headers: authHeadersIn('de') })
      .willRespondWith(unauthorized());

    await p.executeTest(async () => {
      // Genau an dieser Antwort hängt die Erneuerung in `src/api/client.ts`.
      await expect(api(endpoints.diaryDay(date))).rejects.toMatchObject({ type: problems.tokenExpired, status: 401 });
    });
  });

  it('gibt einen fremden Tag nicht heraus', async () => {
    const p = provider();
    p.given('Tagebuchtag gehört einem anderen Nutzer')
      .uponReceiving('Fremden Tagebuchtag laden')
      .withRequest({ method: 'GET', path: '/api/v1/diary/days/2026-08-06', headers: authHeadersIn('de') })
      .willRespondWith(problem(problems.forbidden, 'Kein Zugriff auf diese Ressource', 403));

    await p.executeTest(async () => {
      // Ohne diese Zusage dürfte das Backend fremde Tage mit 200 beantworten.
      await expect(api(endpoints.diaryDay(parseDiaryDate('2026-08-06')))).rejects.toMatchObject({
        type: problems.forbidden,
        status: 403,
      });
    });
  });
});

describe('Diary — Einträge', () => {
  it('legt einen Eintrag mit Client-Id und Idempotency-Key an', async () => {
    const p = provider();
    p.given('Mahlzeiten-Slot existiert')
      .uponReceiving('Eintrag ins Tagebuch schreiben')
      .withRequest({
        method: 'POST',
        path: '/api/v1/diary/days/2026-08-04/entries',
        headers: { ...jsonAuthHeadersIn('de'), 'Idempotency-Key': entryId },
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
        headers: privateHeaders,
        body: enveloped({ id: M.uuid(), grams: M.integer(150), kcal: M.integer(97) }),
      });

    await p.executeTest(async () => {
      const created = await api<{ id: string }>(endpoints.entries(date), {
        method: 'POST',
        idempotencyKey: entryId,
        body: {
          id: entryId,
          mealSlotId: slotId,
          sourceType: 'Product',
          sourceId: '99999999-8888-7777-6666-555555555555',
          grams: 150,
        },
      });
      expect(created.id).toBeTruthy();
    });
  });

  it('ändert die Menge eines Eintrags', async () => {
    const p = provider();
    p.given('Eintrag existiert am 2026-08-04')
      .uponReceiving('Menge eines Eintrags ändern')
      .withRequest({
        method: 'PATCH',
        path: M.regex(`/api/v1/diary/days/2026-08-04/entries/${uuidPath}`, `/api/v1/diary/days/2026-08-04/entries/${entryId}`),
        headers: jsonAuthHeadersIn('de'),
        body: { grams: M.integer(200) },
      })
      .willRespondWith({
        status: 200,
        headers: privateHeaders,
        body: enveloped({ id: M.uuid(), grams: M.integer(200), kcal: M.integer(129) }),
      });

    await p.executeTest(async () => {
      await api(`${endpoints.entries(date)}/${entryId}`, { method: 'PATCH', body: { grams: 200 } });
    });
  });

  it('löscht einen Eintrag ohne Rückgabe', async () => {
    const p = provider();
    p.given('Eintrag existiert am 2026-08-04')
      .uponReceiving('Eintrag löschen')
      .withRequest({
        method: 'DELETE',
        path: M.regex(`/api/v1/diary/days/2026-08-04/entries/${uuidPath}`, `/api/v1/diary/days/2026-08-04/entries/${entryId}`),
        headers: authHeadersIn('de'),
      })
      .willRespondWith({ status: 204 });

    await p.executeTest(async () => {
      // Der Screen kehrt danach nur zurück; eine Nutzlast wertet er nicht aus.
      await expect(api(`${endpoints.entries(date)}/${entryId}`, { method: 'DELETE' })).resolves.toBeUndefined();
    });
  });

  it('liefert die zuletzt erfassten Einträge für den Scan-Screen', async () => {
    const p = provider();
    p.given('Nutzer hat kürzlich Einträge erfasst')
      .uponReceiving('Letzte Einträge laden')
      .withRequest({ method: 'GET', path: '/api/v1/diary/recent', query: { take: '10' }, headers: authHeadersIn('de') })
      .willRespondWith({
        status: 200,
        headers: privateHeaders,
        body: enveloped(
          M.eachLike({
            sourceType: M.regex('Product|Recipe', 'Product'),
            sourceId: M.uuid(),
            displayName: M.string('Skyr Natur, Arla'),
            lastGrams: M.integer(150),
            kcalPerPortion: M.integer(97),
          }),
        ),
      });

    await p.executeTest(async () => {
      const recent = await api<unknown[]>('/diary/recent?take=10');
      expect(Array.isArray(recent)).toBe(true);
    });
  });
});

describe('Diary — Mahlzeiten-Slots', () => {
  it('liefert die Slots in Reihenfolge', async () => {
    const p = provider();
    p.given('Nutzer hat die drei Standard-Slots')
      .uponReceiving('Mahlzeiten-Slots laden')
      .withRequest({ method: 'GET', path: '/api/v1/diary/slots', headers: authHeadersIn('de') })
      .willRespondWith({
        status: 200,
        headers: privateHeaders,
        body: enveloped(M.eachLike({ id: M.uuid(), name: M.string('Frühstück'), position: M.integer(1) })),
      });

    await p.executeTest(async () => {
      const slots = await api<unknown[]>('/diary/slots');
      expect(Array.isArray(slots)).toBe(true);
    });
  });

  it('legt einen Slot mit Client-Id und Idempotency-Key an', async () => {
    const p = provider();
    p.given('Nutzer hat die drei Standard-Slots')
      .uponReceiving('Mahlzeiten-Slot anlegen')
      .withRequest({
        method: 'POST',
        path: '/api/v1/diary/slots',
        // Die Client-Id ist zugleich der Schlüssel: eine zweimal zugestellte
        // Anfrage darf nicht zwei Slots ergeben.
        headers: { ...jsonAuthHeadersIn('de'), 'Idempotency-Key': slotId },
        body: { id: M.uuid(), name: 'Neue Mahlzeit' },
      })
      .willRespondWith({
        status: 201,
        headers: privateHeaders,
        body: enveloped({ id: M.uuid(), name: M.string('Neue Mahlzeit'), position: M.integer(4) }),
      });

    await p.executeTest(async () => {
      await api('/diary/slots', { method: 'POST', body: { id: slotId, name: 'Neue Mahlzeit' }, idempotencyKey: slotId });
    });
  });

  it('benennt einen Slot um', async () => {
    const p = provider();
    p.given('Mahlzeiten-Slot existiert')
      .uponReceiving('Mahlzeiten-Slot umbenennen')
      .withRequest({
        method: 'PATCH',
        path: M.regex(`/api/v1/diary/slots/${uuidPath}`, `/api/v1/diary/slots/${slotId}`),
        headers: jsonAuthHeadersIn('de'),
        body: { name: M.string('Zweites Frühstück') },
      })
      .willRespondWith({
        status: 200,
        headers: privateHeaders,
        body: enveloped({ id: M.uuid(), name: M.string('Zweites Frühstück'), position: M.integer(2) }),
      });

    await p.executeTest(async () => {
      await api(`/diary/slots/${slotId}`, { method: 'PATCH', body: { name: 'Zweites Frühstück' } });
    });
  });

  it('löscht einen leeren Slot', async () => {
    const p = provider();
    p.given('Slot ist leer')
      .uponReceiving('Leeren Slot löschen')
      .withRequest({
        method: 'DELETE',
        path: M.regex(`/api/v1/diary/slots/${uuidPath}`, `/api/v1/diary/slots/${slotId}`),
        headers: authHeadersIn('de'),
      })
      .willRespondWith({ status: 204 });

    await p.executeTest(async () => {
      await expect(api(`/diary/slots/${slotId}`, { method: 'DELETE' })).resolves.toBeUndefined();
    });
  });

  it('meldet slot-not-empty, wenn ein belegter Slot gelöscht wird', async () => {
    const p = provider();
    p.given('Slot enthält Einträge')
      .uponReceiving('Belegten Slot löschen')
      .withRequest({
        method: 'DELETE',
        path: M.regex(`/api/v1/diary/slots/${uuidPath}`, `/api/v1/diary/slots/${slotId}`),
        headers: authHeadersIn('de'),
      })
      .willRespondWith(problem(problems.slotNotEmpty, 'Slot enthält noch Einträge', 409));

    await p.executeTest(async () => {
      // Der Screen zeigt genau auf diesen `type` hin die Zeile „enthält noch Einträge".
      await expect(api(`/diary/slots/${slotId}`, { method: 'DELETE' })).rejects.toMatchObject({
        type: problems.slotNotEmpty,
      });
    });
  });
});
