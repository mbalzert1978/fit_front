import fs from 'fs';
import path from 'path';
import { pact, M } from './setup';
import { api, endpoints } from '../src/api/client';

/**
 * Bedarf: `app/(tabs)/scan.tsx` (Barcode und Suche), `app/product/[id].tsx`
 * (Produktblatt), `app/capture/photo.tsx` (Tabelle hochladen),
 * `app/capture/processing.tsx` (Fortschritt der OCR) und
 * `app/capture/confirm.tsx` (bestätigtes Produkt anlegen).
 *
 * Nährwerte sind `M.number` und nicht `M.decimal`: der Bestätigungs-Screen gibt
 * ein, was in der Tabelle steht — „4" ebenso wie „4,1".
 */
const provider = () => pact('nutritrack-catalog');

const authHeaders = { Authorization: M.regex('Bearer .+', 'Bearer eyJ...'), 'Accept-Language': 'de' };
const productId = '3f2a1b0c-4d5e-4f60-8a91-b2c3d4e5f607';
const photoId = '7c6b5a49-3827-4160-9d5e-1f2a3b4c5d6e';
const tableImage = path.resolve(__dirname, 'fixtures', 'naehrwerttabelle.jpg');

/**
 * `FormData` und `Blob` der Node-Laufzeit. Die React-Native-Typen im
 * tsconfig beschreiben beide anders (kein Dateiname, kein `Uint8Array`) — im
 * Testlauf zählt aber, was Node tatsächlich verschickt.
 */
const node = globalThis as unknown as {
  FormData: new () => { append(name: string, value: unknown, fileName?: string): void };
  Blob: new (parts: unknown[], options?: { type: string }) => unknown;
};

describe('Catalog — Produkte', () => {
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
          source: M.regex('Curated|Ocr|Manual', 'Curated'),
          verifiedByUser: M.boolean(true),
          nutrientsPer100g: {
            kcal: M.integer(63),
            fatG: M.number(0.2),
            carbsG: M.number(4),
            proteinG: M.number(11),
          },
        },
      });

    await p.executeTest(async () => {
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

    await p.executeTest(async () => {
      // Dieser Fall ist kein Fehler im UI: er führt in den Foto-Flow.
      await expect(api(endpoints.productByBarcode('0000000000000'))).rejects.toMatchObject({ type: 'product-not-found' });
    });
  });

  it('liefert ein Produkt zu seiner Id', async () => {
    const p = provider();
    p.given('Produkt existiert')
      .uponReceiving('Produktblatt laden')
      .withRequest({
        method: 'GET',
        path: M.regex('/api/v1/catalog/products/[0-9a-f-]{36}', `/api/v1/catalog/products/${productId}`),
        headers: authHeaders,
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          id: M.uuid(),
          name: M.string('Skyr Natur'),
          brand: M.string('Arla'),
          // `source` steuert die Quellzeile unter dem Namen — der Wert selbst ist Teil der Zusage.
          source: M.regex('Curated|Ocr|Manual', 'Curated'),
          nutrientsPer100g: {
            kcal: M.integer(63),
            fatG: M.number(0.2),
            carbsG: M.number(4),
            proteinG: M.number(11),
          },
        },
      });

    await p.executeTest(async () => {
      const product = await api<{ id: string }>(`/catalog/products/${productId}`);
      expect(product.id).toBeTruthy();
    });
  });

  it('legt ein bestätigtes OCR-Produkt mit Client-Id an', async () => {
    const p = provider();
    p.given('Foto-Auftrag ist abgeschlossen')
      .uponReceiving('Bestätigtes Produkt anlegen')
      .withRequest({
        method: 'POST',
        path: '/api/v1/catalog/products',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': productId },
        body: {
          id: M.uuid(),
          barcode: M.string('4008400401027'),
          name: M.string('Skyr Natur'),
          brand: null,
          basisUnit: 'Gram',
          source: 'Ocr',
          verifiedByUser: true,
          photoId: M.uuid(),
          nutrientsPer100g: {
            kcal: M.number(63),
            fatG: M.number(0.2),
            saturatedFatG: M.number(0.1),
            carbsG: M.number(4),
            sugarG: M.number(4),
            proteinG: M.number(11),
            saltG: M.number(0.1),
          },
        },
      })
      .willRespondWith({
        status: 201,
        headers: { 'Content-Type': 'application/json' },
        body: {
          id: M.uuid(),
          name: M.string('Skyr Natur'),
          nutrientsPer100g: { kcal: M.integer(63), fatG: M.number(0.2), carbsG: M.number(4), proteinG: M.number(11) },
        },
      });

    await p.executeTest(async () => {
      const created = await api<{ id: string }>('/catalog/products', {
        method: 'POST',
        idempotencyKey: productId,
        body: {
          id: productId,
          barcode: '4008400401027',
          name: 'Skyr Natur',
          brand: null,
          basisUnit: 'Gram',
          source: 'Ocr',
          verifiedByUser: true,
          photoId,
          nutrientsPer100g: {
            kcal: 63,
            fatG: 0.2,
            saturatedFatG: 0.1,
            carbsG: 4,
            sugarG: 4,
            proteinG: 11,
            saltG: 0.1,
          },
        },
      });
      // Die Id der Antwort bestimmt, auf welches Produktblatt der Ablauf weiterläuft.
      expect(created.id).toBeTruthy();
    });
  });
});

describe('Catalog — Suche', () => {
  it('liefert Treffer über Produkte und Rezepte hinweg', async () => {
    const p = provider();
    // Ein Treffer trägt seinen `sourceType` selbst — daran entscheidet der
    // Scan-Screen, ob er aufs Produktblatt oder ins Rezept springt.
    p.given('Nutzer hat Produkte und Rezepte zum Suchwort skyr')
      .uponReceiving('Volltextsuche über Produkte und Rezepte')
      .withRequest({ method: 'GET', path: '/api/v1/search', query: { query: 'skyr', take: '20' } })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          items: M.eachLike({
            sourceType: M.regex('Product|Recipe', 'Product'),
            id: M.uuid(),
            displayName: M.string('Skyr Natur, Arla'),
            metaLine: M.string('63 kcal je 100 g'),
          }),
        },
      });

    await p.executeTest(async () => {
      const hits = await api<{ items: unknown[] }>('/search?query=skyr&take=20');
      expect(Array.isArray(hits.items)).toBe(true);
    });
  });
});

describe('Catalog — Foto-Auftrag', () => {
  it('nimmt die fotografierte Nährwerttabelle entgegen', async () => {
    const p = provider();
    p.given('Nutzer ist angemeldet')
      .uponReceiving('Nährwerttabelle hochladen')
      .withRequestMultipartFileUpload({ method: 'POST', path: '/api/v1/catalog/photos' }, 'image/jpeg', tableImage, 'file')
      .willRespondWith({
        status: 202,
        headers: { 'Content-Type': 'application/json' },
        // Nur die photoId wird gebraucht: auf sie fragt der Fortschritts-Screen weiter.
        body: { photoId: M.uuid(), status: 'Processing' },
      });

    await p.executeTest(async () => {
      const form = new node.FormData();
      form.append('file', new node.Blob([new Uint8Array(fs.readFileSync(tableImage))], { type: 'image/jpeg' }), 'table.jpg');
      const job = await api<{ photoId: string }>('/catalog/photos', { method: 'POST', formData: form as unknown as FormData });
      expect(job.photoId).toBeTruthy();
    });
  });

  it('meldet den Auftrag als laufend', async () => {
    const p = provider();
    p.given('Foto-Auftrag läuft noch')
      .uponReceiving('Foto-Auftrag abfragen, solange er läuft')
      .withRequest({
        method: 'GET',
        path: M.regex('/api/v1/catalog/photos/[0-9a-f-]{36}', `/api/v1/catalog/photos/${photoId}`),
        headers: authHeaders,
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        // `status` ist der Wert, an dem der Screen weiterschaltet — kein Matcher.
        body: { photoId: M.uuid(), status: 'Processing' },
      });

    await p.executeTest(async () => {
      const job = await api<{ status: string }>(endpoints.photo(photoId));
      expect(job.status).toBe('Processing');
    });
  });

  it('liefert die erkannten Werte mit ihrer Sicherheit', async () => {
    const p = provider();
    p.given('Foto-Auftrag ist abgeschlossen')
      .uponReceiving('Foto-Auftrag abfragen, wenn er fertig ist')
      .withRequest({
        method: 'GET',
        path: M.regex('/api/v1/catalog/photos/[0-9a-f-]{36}', `/api/v1/catalog/photos/${photoId}`),
        headers: authHeaders,
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          photoId: M.uuid(),
          status: 'Completed',
          barcode: M.string('4008400401027'),
          suggestedName: M.string('Skyr Natur'),
          basis: M.regex('Per100g|PerPortion', 'Per100g'),
          // Ein Feld je Zeile der Bestätigungsmaske; `null` heißt „nicht erkannt".
          fields: {
            kcal: { value: M.number(63), confidence: M.number(0.97) },
            fatG: { value: M.number(0.2), confidence: M.number(0.91) },
            saturatedFatG: { value: M.number(0.1), confidence: M.number(0.62) },
            carbsG: { value: M.number(4), confidence: M.number(0.95) },
            sugarG: { value: M.number(4), confidence: M.number(0.88) },
            proteinG: { value: M.number(11), confidence: M.number(0.96) },
            saltG: { value: M.number(0.1), confidence: M.number(0.54) },
          },
        },
      });

    await p.executeTest(async () => {
      const job = await api<{ status: string; fields: Record<string, unknown> }>(endpoints.photo(photoId));
      expect(job.status).toBe('Completed');
      expect(job.fields.kcal).toBeDefined();
    });
  });

  it('meldet den Auftrag als gescheitert', async () => {
    const p = provider();
    p.given('Foto-Auftrag ist gescheitert')
      .uponReceiving('Foto-Auftrag abfragen, wenn er gescheitert ist')
      .withRequest({
        method: 'GET',
        path: M.regex('/api/v1/catalog/photos/[0-9a-f-]{36}', `/api/v1/catalog/photos/${photoId}`),
        headers: authHeaders,
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        // Der Screen schickt den Nutzer zurück zur Kamera; `reason` unterscheidet ihn von 'Processing'.
        body: { photoId: M.uuid(), status: 'Failed', reason: M.string('Tabelle nicht lesbar') },
      });

    await p.executeTest(async () => {
      const job = await api<{ status: string }>(endpoints.photo(photoId));
      expect(job.status).toBe('Failed');
    });
  });
});
