import { pact, M } from './setup';
import { api, ApiError, endpoints } from '../src/api/client';

const provider = () => pact('nutritrack-catalog');

const authHeaders = { Authorization: M.like('Bearer eyJ...'), 'Accept-Language': 'de' };

describe('Catalog', () => {
  it('liefert ein Produkt zu einem bekannten Barcode', async () => {
    const p = provider();
    p.given('Produkt mit Barcode 4008400401027 existiert')
      .uponReceiving('Produkt-Lookup per Barcode')
      .withRequest({ method: 'GET', path: '/api/v1/catalog/products/by-barcode/4008400401027', headers: authHeaders })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          id: M.uuid(),
          barcode: '4008400401027',
          name: M.string('Skyr Natur'),
          brand: M.string('Arla'),
          basisUnit: 'Gram',
          source: M.string('Curated'),
          verifiedByUser: M.boolean(true),
          nutrientsPer100g: {
            kcal: M.integer(63),
            fatG: M.decimal(0.2),
            carbsG: M.decimal(4),
            proteinG: M.decimal(11),
          },
        },
      });

    await p.executeTest(async (mock) => {
      process.env.EXPO_PUBLIC_API_URL = mock.url;
      const product = await api<{ barcode: string }>(endpoints.productByBarcode('4008400401027'));
      expect(product.barcode).toBe('4008400401027');
    });
  });

  it('antwortet mit product-not-found, wenn der Barcode unbekannt ist', async () => {
    const p = provider();
    p.given('kein Produkt mit Barcode 0000000000000')
      .uponReceiving('Produkt-Lookup per unbekanntem Barcode')
      .withRequest({ method: 'GET', path: '/api/v1/catalog/products/by-barcode/0000000000000', headers: authHeaders })
      .willRespondWith({
        status: 404,
        headers: { 'Content-Type': 'application/problem+json' },
        body: { type: 'product-not-found', title: M.string('Produkt nicht gefunden'), status: 404 },
      });

    await p.executeTest(async (mock) => {
      process.env.EXPO_PUBLIC_API_URL = mock.url;
      // Dieser Fall ist kein Fehler im UI: er führt in den Foto-Flow.
      await expect(api(endpoints.productByBarcode('0000000000000'))).rejects.toMatchObject({ type: 'product-not-found' });
    });
  });
});
