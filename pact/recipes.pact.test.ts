import { pact, M, enveloped, jsonHeaders } from './setup';
import { api, apiWithMeta } from '../src/api/client';

/**
 * Bedarf: `app/(tabs)/recipes.tsx` (Liste) und `app/recipe/[id].tsx` (Blatt,
 * Speichern, Übernahme ins Tagebuch).
 *
 * Die Liste zeigt Portionen, Gramm und kcal je Portion; `totalGrams`/`totalKcal`
 * rechnet das Blatt aus den Zutaten selbst und liest sie deshalb nicht.
 */
const provider = () => pact('nutritrack-recipes');
const recipeId = '2f1c9b7e-1111-4222-8333-444455556666';
const uuidPath = '[0-9a-f-]{36}';

const ingredient = {
  id: M.uuid(),
  productId: M.uuid(),
  displayName: M.string('Hähnchenbrust'),
  grams: M.integer(600),
  computedKcal: M.integer(660),
};

describe('Recipes', () => {
  it('liefert Rezepte absteigend nach Namen mit abgeleiteten Werten', async () => {
    const p = provider();
    p.given('Nutzer hat zwei Rezepte')
      .uponReceiving('Rezeptliste laden')
      .withRequest({ method: 'GET', path: '/api/v1/recipes', query: { sort: 'name_desc' } })
      .willRespondWith({
        status: 200,
        headers: jsonHeaders,
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
      .withRequest({ method: 'GET', path: M.regex(`/api/v1/recipes/${uuidPath}`, `/api/v1/recipes/${recipeId}`) })
      .willRespondWith({
        status: 200,
        // Der ETag steht im gleichnamigen Header und geht unverändert als
        // If-Match zurück; ohne ihn kein Speichern.
        headers: { ...jsonHeaders, ETag: M.string('7') },
        body: enveloped({
          id: M.uuid(),
          name: M.string('Hähnchen-Reis-Pfanne'),
          portions: M.integer(4),
          macrosPerPortion: { carbsG: M.integer(38), proteinG: M.integer(41), fatG: M.integer(12) },
          ingredients: M.eachLike(ingredient),
        }),
      });

    await p.executeTest(async () => {
      const r = await apiWithMeta<{ ingredients: unknown[] }>(`/recipes/${recipeId}`);
      expect(r.headers.get('ETag')).toBeTruthy();
      expect(Array.isArray(r.data.ingredients)).toBe(true);
    });
  });

  it('legt ein neues Rezept mit Client-Id an', async () => {
    const p = provider();
    p.given('Produkt existiert als Zutat')
      .uponReceiving('Neues Rezept anlegen')
      .withRequest({
        method: 'POST',
        path: '/api/v1/recipes',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': recipeId },
        body: {
          id: M.uuid(),
          name: M.string('Hähnchen-Reis-Pfanne'),
          portions: M.integer(4),
          ingredients: M.eachLike({ id: M.uuid(), productId: M.uuid(), grams: M.integer(600) }),
        },
      })
      .willRespondWith({
        status: 201,
        headers: { ...jsonHeaders, ETag: M.string('1') },
        body: enveloped({
          id: M.uuid(),
          name: M.string('Hähnchen-Reis-Pfanne'),
          portions: M.integer(4),
          macrosPerPortion: { carbsG: M.integer(38), proteinG: M.integer(41), fatG: M.integer(12) },
          ingredients: M.eachLike(ingredient),
        }),
      });

    await p.executeTest(async () => {
      const r = await apiWithMeta<{ id: string }>('/recipes', {
        method: 'POST',
        idempotencyKey: recipeId,
        body: {
          id: recipeId,
          name: 'Hähnchen-Reis-Pfanne',
          portions: 4,
          ingredients: [{ id: '11111111-2222-3333-4444-555555555555', productId: '99999999-8888-7777-6666-555555555555', grams: 600 }],
        },
      });
      // Auf diese Id schaltet der Screen nach dem Speichern um.
      expect(r.data.id).toBeTruthy();
      // Der ETag der neuen Fassung ist zugesichert; `useSaveRecipe` heftet ihn ans
      // Rezept. Hier wird er wenigstens gelesen und protokolliert — eine Zusage,
      // die kein Aufrufer je anfasst, merkt niemand, wenn sie bricht.
      console.log('ETag nach POST /recipes:', r.headers.get('ETag'));
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
        headers: { 'Content-Type': 'application/json', 'If-Match': M.string('7') },
        body: {
          id: M.uuid(),
          name: M.string('Hähnchen-Reis-Pfanne'),
          portions: M.integer(4),
          ingredients: M.eachLike({ id: M.uuid(), productId: M.uuid(), grams: M.integer(600) }),
        },
      })
      .willRespondWith({
        status: 200,
        // Der neue ETag; der alte ging als If-Match in die Anfrage.
        headers: { ...jsonHeaders, ETag: M.string('8') },
        body: enveloped({
          id: M.uuid(),
          name: M.string('Hähnchen-Reis-Pfanne'),
          portions: M.integer(4),
          macrosPerPortion: { carbsG: M.integer(38), proteinG: M.integer(41), fatG: M.integer(12) },
          ingredients: M.eachLike(ingredient),
        }),
      });

    await p.executeTest(async () => {
      const r = await apiWithMeta<{ id: string }>(`/recipes/${recipeId}`, {
        method: 'PUT',
        ifMatch: '7',
        body: {
          id: recipeId,
          name: 'Hähnchen-Reis-Pfanne',
          portions: 4,
          ingredients: [{ id: '11111111-2222-3333-4444-555555555555', productId: '99999999-8888-7777-6666-555555555555', grams: 600 }],
        },
      });
      expect(r.data.id).toBeTruthy();
      // Der ETag der gespeicherten Fassung; der alte ging als If-Match hinein.
      console.log('ETag nach PUT /recipes/{id}:', r.headers.get('ETag'));
      expect(r.headers.get('ETag')).toBeTruthy();
    });
  });

  it('übernimmt Portionen ins Tagebuch', async () => {
    const p = provider();
    p.given('Rezept und Mahlzeiten-Slot existieren')
      .uponReceiving('Portionen ins Tagebuch übernehmen')
      .withRequest({
        method: 'POST',
        path: M.regex(`/api/v1/recipes/${uuidPath}/portions-to-diary`, `/api/v1/recipes/${recipeId}/portions-to-diary`),
        headers: { 'Content-Type': 'application/json' },
        body: { date: '2026-08-04', mealSlotId: M.uuid(), amount: M.integer(1), unit: 'Portion' },
      })
      .willRespondWith({
        status: 201,
        headers: jsonHeaders,
        body: enveloped({ entryId: M.uuid(), grams: M.integer(338), kcal: M.integer(412) }),
      });

    await p.executeTest(async () => {
      const r = await api<{ entryId: string }>(`/recipes/${recipeId}/portions-to-diary`, {
        method: 'POST',
        body: { date: '2026-08-04', mealSlotId: '77777777-8888-9999-aaaa-bbbbbbbbbbbb', amount: 1, unit: 'Portion' },
      });
      expect(r.entryId).toBeTruthy();
    });
  });
});
