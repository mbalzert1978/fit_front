import { pact, M, enveloped, authHeadersIn, jsonAuthHeadersIn, privateHeaders, problem, forbidden, unauthorized, problems } from './setup';
import { api, apiWithMeta } from '../src/api/client';

/**
 * Needed by: `app/(tabs)/recipes.tsx` (list) and `app/recipe/[id].tsx` (sheet,
 * saving, handover into the diary). `totalGrams`/`totalKcal` are not read — the
 * sheet computes them from the ingredients itself.
 *
 * That someone else's recipe is not served stands as an assurance of its own:
 * the frontend code alone cannot ensure it.
 */
const provider = () => pact('nutritrack-recipes');
const recipeId = '2f1c9b7e-1111-4222-8333-444455556666';
const foreignRecipeId = '3e2d1c0b-9999-4888-8777-666655554444';
const uuidPath = '[0-9a-f-]{36}';

const ingredient = {
  id: M.uuid(),
  productId: M.uuid(),
  displayName: M.string('Hähnchenbrust'),
  grams: M.integer(600),
  computedKcal: M.integer(660),
};

const recipeBody = {
  id: M.uuid(),
  name: M.string('Hähnchen-Reis-Pfanne'),
  portions: M.integer(4),
  ingredients: M.eachLike({ id: M.uuid(), productId: M.uuid(), grams: M.integer(600) }),
};

const recipeSheet = {
  id: M.uuid(),
  name: M.string('Hähnchen-Reis-Pfanne'),
  portions: M.integer(4),
  macrosPerPortion: { carbsG: M.integer(38), proteinG: M.integer(41), fatG: M.integer(12) },
  ingredients: M.eachLike(ingredient),
};

const draft = {
  id: recipeId,
  name: 'Hähnchen-Reis-Pfanne',
  portions: 4,
  ingredients: [{ id: '11111111-2222-3333-4444-555555555555', productId: '99999999-8888-7777-6666-555555555555', grams: 600 }],
};

describe('Recipes', () => {
  it('liefert Rezepte absteigend nach Namen mit abgeleiteten Werten', async () => {
    const p = provider();
    p.given('Nutzer hat zwei Rezepte')
      .uponReceiving('Rezeptliste laden')
      .withRequest({ method: 'GET', path: '/api/v1/recipes', query: { sort: 'name_desc' }, headers: authHeadersIn('de') })
      .willRespondWith({
        status: 200,
        headers: privateHeaders,
        body: enveloped(
          M.eachLike({
            id: M.uuid(),
            name: M.string('Hähnchen-Reis-Pfanne'),
            portions: M.integer(4),
            gramsPerPortion: M.integer(338),
            kcalPerPortion: M.integer(412),
          }),
        ),
      });

    await p.executeTest(async () => {
      const list = await api<unknown[]>('/recipes?sort=name_desc');
      expect(Array.isArray(list)).toBe(true);
    });
  });

  it('liefert ein Rezept samt Zutaten, Makros je Portion und ETag', async () => {
    const p = provider();
    p.given('Rezept existiert')
      .uponReceiving('Rezeptblatt laden')
      .withRequest({
        method: 'GET',
        path: M.regex(`/api/v1/recipes/${uuidPath}`, `/api/v1/recipes/${recipeId}`),
        headers: authHeadersIn('de'),
      })
      .willRespondWith({
        status: 200,
        // The ETag stands in the header of the same name and goes back unchanged
        // as If-Match; without it there is no saving.
        headers: { ...privateHeaders, ETag: M.string('7') },
        body: enveloped(recipeSheet),
      });

    await p.executeTest(async () => {
      const r = await apiWithMeta<{ ingredients: unknown[] }>(`/recipes/${recipeId}`);
      expect(r.headers.get('ETag')).toBeTruthy();
      expect(Array.isArray(r.data.ingredients)).toBe(true);
    });
  });

  it('gibt ein fremdes Rezept nicht heraus', async () => {
    const p = provider();
    p.given('Rezept gehört einem anderen Nutzer')
      .uponReceiving('Fremdes Rezeptblatt laden')
      .withRequest({
        method: 'GET',
        path: M.regex(`/api/v1/recipes/${uuidPath}`, `/api/v1/recipes/${foreignRecipeId}`),
        headers: authHeadersIn('de'),
      })
      .willRespondWith(forbidden());

    await p.executeTest(async () => {
      // A valid sign-in is no permission: the id comes from a deep link and is
      // freely chosen.
      await expect(api(`/recipes/${foreignRecipeId}`)).rejects.toMatchObject({ type: problems.forbidden, status: 403 });
    });
  });

  it('weist eine abgelaufene Anmeldung mit 401 ab', async () => {
    const p = provider();
    p.given('Access-Token ist abgelaufen')
      .uponReceiving('Rezeptliste mit abgelaufenem Token laden')
      .withRequest({ method: 'GET', path: '/api/v1/recipes', query: { sort: 'name_desc' }, headers: authHeadersIn('de') })
      .willRespondWith(unauthorized());

    await p.executeTest(async () => {
      await expect(api('/recipes?sort=name_desc')).rejects.toMatchObject({ type: problems.tokenExpired, status: 401 });
    });
  });

  it('legt ein neues Rezept mit Client-Id an', async () => {
    const p = provider();
    p.given('Produkt existiert als Zutat')
      .uponReceiving('Neues Rezept anlegen')
      .withRequest({
        method: 'POST',
        path: '/api/v1/recipes',
        headers: { ...jsonAuthHeadersIn('de'), 'Idempotency-Key': recipeId },
        body: recipeBody,
      })
      .willRespondWith({
        status: 201,
        headers: { ...privateHeaders, ETag: M.string('1') },
        body: enveloped(recipeSheet),
      });

    await p.executeTest(async () => {
      const r = await apiWithMeta<{ id: string }>('/recipes', { method: 'POST', idempotencyKey: recipeId, body: draft });
      // The screen switches to this id after saving.
      expect(r.data.id).toBeTruthy();
      // An assurance no caller ever touches goes unnoticed when it breaks —
      // hence the ETag is read here.
      expect(r.headers.get('ETag')).toBeTruthy();
    });
  });

  it('speichert ein bestehendes Rezept gegen seinen ETag', async () => {
    const p = provider();
    p.given('Rezept existiert')
      .uponReceiving('Rezept ändern')
      .withRequest({
        method: 'PUT',
        path: M.regex(`/api/v1/recipes/${uuidPath}`, `/api/v1/recipes/${recipeId}`),
        headers: { ...jsonAuthHeadersIn('de'), 'If-Match': M.string('7') },
        body: recipeBody,
      })
      .willRespondWith({
        status: 200,
        // The new ETag; the old one went into the request as If-Match.
        headers: { ...privateHeaders, ETag: M.string('8') },
        body: enveloped(recipeSheet),
      });

    await p.executeTest(async () => {
      const r = await apiWithMeta<{ id: string }>(`/recipes/${recipeId}`, { method: 'PUT', ifMatch: '7', body: draft });
      expect(r.data.id).toBeTruthy();
      expect(r.headers.get('ETag')).toBeTruthy();
    });
  });

  it('lehnt das Speichern gegen einen überholten ETag mit 409 ab', async () => {
    const p = provider();
    p.given('Rezept wurde zwischenzeitlich anderswo gespeichert')
      .uponReceiving('Rezept gegen überholten ETag speichern')
      .withRequest({
        method: 'PUT',
        path: M.regex(`/api/v1/recipes/${uuidPath}`, `/api/v1/recipes/${recipeId}`),
        headers: { ...jsonAuthHeadersIn('de'), 'If-Match': M.string('3') },
        body: recipeBody,
      })
      .willRespondWith(problem(problems.concurrencyConflict, 'Rezept wurde zwischenzeitlich geändert', 409));

    await p.executeTest(async () => {
      // Without this assurance a backend ignoring a stale If-Match would still
      // keep the contract.
      await expect(apiWithMeta(`/recipes/${recipeId}`, { method: 'PUT', ifMatch: '3', body: draft })).rejects.toMatchObject({
        type: problems.concurrencyConflict,
        status: 409,
      });
    });
  });

  it('übernimmt Portionen ins Tagebuch', async () => {
    const p = provider();
    const opId = '4d3c2b1a-0000-4111-8222-333344445555';
    p.given('Rezept und Mahlzeiten-Slot existieren')
      .uponReceiving('Portionen ins Tagebuch übernehmen')
      .withRequest({
        method: 'POST',
        path: M.regex(`/api/v1/recipes/${uuidPath}/portions-to-diary`, `/api/v1/recipes/${recipeId}/portions-to-diary`),
        // Without a key a request delivered twice would put the portions into the
        // diary twice — and the wrapper could not repeat after a renewal at all.
        headers: { ...jsonAuthHeadersIn('de'), 'Idempotency-Key': opId },
        body: { date: '2026-08-04', mealSlotId: M.uuid(), amount: M.integer(1), unit: 'Portion' },
      })
      .willRespondWith({
        status: 201,
        headers: privateHeaders,
        body: enveloped({ entryId: M.uuid(), grams: M.integer(338), kcal: M.integer(412) }),
      });

    await p.executeTest(async () => {
      const r = await api<{ entryId: string }>(`/recipes/${recipeId}/portions-to-diary`, {
        method: 'POST',
        idempotencyKey: opId,
        body: { date: '2026-08-04', mealSlotId: '77777777-8888-9999-aaaa-bbbbbbbbbbbb', amount: 1, unit: 'Portion' },
      });
      expect(r.entryId).toBeTruthy();
    });
  });
});
