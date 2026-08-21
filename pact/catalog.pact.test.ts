import {
  pact,
  against,
  M,
  enveloped,
  jsonHeaders,
  authHeadersIn,
  jsonAuthHeadersIn,
  privateHeaders,
  problem,
  unauthorized,
  problems,
} from './setup';
import { api, endpoints } from '../src/api/client';
import type { PhotoUploadTarget } from '../src/api/types';

/**
 * Needed by: `app/(tabs)/scan.tsx` (barcode and search), `app/product/[id].tsx`,
 * `app/capture/photo.tsx`, `app/capture/processing.tsx` and
 * `app/capture/confirm.tsx`.
 *
 * Nutrients are `M.number` and not `M.decimal`: the confirmation screen types
 * in what the table says — "4" as readily as "4.1".
 */
const provider = () => pact('nutritrack-catalog');

const productId = '3f2a1b0c-4d5e-4f60-8a91-b2c3d4e5f607';
const photoId = '7c6b5a49-3827-4160-9d5e-1f2a3b4c5d6e';

describe('Catalog — Produkte', () => {
  it('liefert ein Produkt zu einem bekannten Barcode', async () => {
    const p = provider();
    p.given('Produkt mit Barcode 4008400401027 existiert')
      .uponReceiving('Produkt-Lookup per Barcode')
      .withRequest({ method: 'GET', path: '/api/v1/catalog/products/by-barcode/4008400401027', headers: authHeadersIn('de') })
      .willRespondWith({
        status: 200,
        headers: jsonHeaders,
        body: enveloped({
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
        }),
      });

    await against(p, async () => {
      const product = await api<{ barcode: string }>(endpoints.productByBarcode('4008400401027'));
      expect(product.barcode).toBe('4008400401027');
    });
  });

  it('antwortet mit product-not-found, wenn der Barcode unbekannt ist', async () => {
    const p = provider();
    p.given('kein Produkt mit Barcode 0000000000000')
      .uponReceiving('Produkt-Lookup per unbekanntem Barcode')
      .withRequest({ method: 'GET', path: '/api/v1/catalog/products/by-barcode/0000000000000', headers: authHeadersIn('de') })
      .willRespondWith(problem(problems.productNotFound, 'Produkt nicht gefunden', 404));

    await against(p, async () => {
      // Not an error in the UI: this case leads into the photo flow.
      await expect(api(endpoints.productByBarcode('0000000000000'))).rejects.toMatchObject({ type: problems.productNotFound });
    });
  });

  it('weist eine abgelaufene Anmeldung mit 401 ab', async () => {
    const p = provider();
    p.given('Access-Token ist abgelaufen')
      .uponReceiving('Produkt-Lookup mit abgelaufenem Token')
      .withRequest({
        method: 'GET',
        path: '/api/v1/catalog/products/by-barcode/4008400401027',
        headers: authHeadersIn('de'),
      })
      .willRespondWith(unauthorized());

    await against(p, async () => {
      // 404 and 401 are two different outcomes — one leads into the photo flow,
      // the other ends the session. Without an assurance they might blur.
      await expect(api(endpoints.productByBarcode('4008400401027'))).rejects.toMatchObject({
        type: problems.tokenExpired,
        status: 401,
      });
    });
  });

  it('liefert ein Produkt zu seiner Id', async () => {
    const p = provider();
    p.given('Produkt existiert')
      .uponReceiving('Produktblatt laden')
      .withRequest({
        method: 'GET',
        path: M.regex('/api/v1/catalog/products/[0-9a-f-]{36}', `/api/v1/catalog/products/${productId}`),
        headers: authHeadersIn('de'),
      })
      .willRespondWith({
        status: 200,
        headers: jsonHeaders,
        body: enveloped({
          id: M.uuid(),
          name: M.string('Skyr Natur'),
          brand: M.string('Arla'),
          // `source` drives the source line under the name — the value itself is part of the assurance.
          source: M.regex('Curated|Ocr|Manual', 'Curated'),
          nutrientsPer100g: {
            kcal: M.integer(63),
            fatG: M.number(0.2),
            carbsG: M.number(4),
            proteinG: M.number(11),
          },
        }),
      });

    await against(p, async () => {
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
        headers: { ...jsonAuthHeadersIn('de'), 'Idempotency-Key': productId },
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
        headers: privateHeaders,
        body: enveloped({
          id: M.uuid(),
          name: M.string('Skyr Natur'),
          nutrientsPer100g: { kcal: M.integer(63), fatG: M.number(0.2), carbsG: M.number(4), proteinG: M.number(11) },
        }),
      });

    await against(p, async () => {
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
      // The id of the response decides which product sheet the flow continues on.
      expect(created.id).toBeTruthy();
    });
  });
});

describe('Catalog — Suche', () => {
  it('liefert Treffer über Produkte und Rezepte hinweg', async () => {
    const p = provider();
    // A hit carries its own `sourceType` — the scan screen decides on it whether
    // to jump to the product sheet or into the recipe.
    p.given('Nutzer hat Produkte und Rezepte zum Suchwort skyr')
      .uponReceiving('Volltextsuche über Produkte und Rezepte')
      .withRequest({ method: 'GET', path: '/api/v1/search', query: { query: 'skyr', take: '20' }, headers: authHeadersIn('de') })
      .willRespondWith({
        status: 200,
        headers: privateHeaders,
        // The hits stand directly under `data`; the earlier `items` was a small
        // envelope of its own and falls away with this one.
        body: enveloped(
          M.eachLike({
            sourceType: M.regex('Product|Recipe', 'Product'),
            id: M.uuid(),
            displayName: M.string('Skyr Natur, Arla'),
            metaLine: M.string('63 kcal je 100 g'),
          }),
        ),
      });

    await against(p, async () => {
      const hits = await api<unknown[]>('/search?query=skyr&take=20');
      expect(Array.isArray(hits)).toBe(true);
    });
  });
});

describe('Catalog — Foto-Auftrag', () => {
  /**
   * The upload takes three steps, of which **only the first and the third are
   * assured**: the second goes to a foreign origin, and the object store is no
   * provider of this repo — nothing written here would ever be verified there.
   * The assurance therefore ends visibly at `uploadUrl` and `uploadHeaders`.
   *
   * No step carries an `Idempotency-Key`; reasoning in
   * `docs/decisions/2026-08-18-1800-foto-upload-ueber-presigned-url.md`.
   */
  const uploadTarget = {
    photoId: M.uuid(),
    // The client sends the bytes over https only; an http address here makes it
    // break off rather than hand out the photo in the clear.
    uploadUrl: M.regex('https://.+', `https://objektspeicher.example/nutritrack/${photoId}?X-Amz-Expires=900&X-Amz-Signature=8d1f2c`),
    // Exactly the headers the server co-signed. `Content-Type` is always among
    // them, and a deviating value makes the object store reject the bytes.
    uploadHeaders: { 'Content-Type': M.string('image/jpeg') },
    expiresIn: M.integer(900),
  };

  /** A fixed value: the app sends JPEG only (`expo-image-manipulator`). */
  const targetRequest = {
    contentType: 'image/jpeg',
    // The size travels along so an oversized image is rejected before the bytes
    // flow — the old multipart path only noticed afterwards.
    byteSize: M.integer(412_388),
    barcode: M.string('4008400401027'),
  };

  const photoPath = M.regex('/api/v1/catalog/photos/[0-9a-f-]{36}', `/api/v1/catalog/photos/${photoId}`);

  it('nennt ein Upload-Ziel für die fotografierte Nährwerttabelle', async () => {
    const p = provider();
    p.given('Nutzer ist angemeldet')
      .uponReceiving('Upload-Ziel für die Nährwerttabelle anfordern')
      .withRequest({ method: 'PUT', path: photoPath, headers: jsonAuthHeadersIn('de'), body: targetRequest })
      .willRespondWith({ status: 201, headers: privateHeaders, body: enveloped(uploadTarget) });

    await against(p, async () => {
      const target = await api<PhotoUploadTarget>(endpoints.photo(photoId), {
        method: 'PUT',
        body: { contentType: 'image/jpeg', byteSize: 412_388, barcode: '4008400401027' },
      });
      expect(target.uploadUrl.startsWith('https://')).toBe(true);
      expect(target.uploadHeaders['Content-Type']).toBe('image/jpeg');
      expect(target.expiresIn).toBeGreaterThan(0);
    });
  });

  it('nennt ein frisches Ziel, wenn dieselbe Aufnahme erneut fragt', async () => {
    const p = provider();
    // What `expiresIn` is there for: the signature ran out before the bytes were
    // through. The **same** `photoId` asks again — a new one would mean a second
    // photo and a second OCR job for the same shot.
    p.given('Foto-Auftrag wartet auf den Upload')
      .uponReceiving('Upload-Ziel nach abgelaufener Signatur erneut anfordern')
      .withRequest({ method: 'PUT', path: photoPath, headers: jsonAuthHeadersIn('de'), body: targetRequest })
      // 200 instead of 201: the photo already exists, only the signature is new.
      .willRespondWith({ status: 200, headers: privateHeaders, body: enveloped(uploadTarget) });

    await against(p, async () => {
      const target = await api<PhotoUploadTarget>(endpoints.photo(photoId), {
        method: 'PUT',
        body: { contentType: 'image/jpeg', byteSize: 412_388, barcode: '4008400401027' },
      });
      expect(target.uploadUrl).toBeTruthy();
    });
  });

  it('nimmt die Meldung entgegen, dass die Bytes liegen', async () => {
    const p = provider();
    p.given('Bytes des Fotos liegen im Objektspeicher')
      .uponReceiving('Abschluss des Uploads melden')
      .withRequest({
        method: 'PUT',
        path: M.regex('/api/v1/catalog/photos/[0-9a-f-]{36}/upload', `/api/v1/catalog/photos/${photoId}/upload`),
        headers: authHeadersIn('de'),
      })
      .willRespondWith({
        status: 202,
        headers: privateHeaders,
        // Only this report kicks off the OCR; from here the progress screen polls
        // on `photoId`.
        body: enveloped({ photoId: M.uuid(), status: 'Processing' }),
      });

    await against(p, async () => {
      const job = await api<{ status: string }>(endpoints.photoUpload(photoId), { method: 'PUT' });
      expect(job.status).toBe('Processing');
    });
  });

  it('meldet den Auftrag als laufend', async () => {
    const p = provider();
    p.given('Foto-Auftrag läuft noch')
      .uponReceiving('Foto-Auftrag abfragen, solange er läuft')
      .withRequest({
        method: 'GET',
        path: M.regex('/api/v1/catalog/photos/[0-9a-f-]{36}', `/api/v1/catalog/photos/${photoId}`),
        headers: authHeadersIn('de'),
      })
      .willRespondWith({
        status: 200,
        headers: privateHeaders,
        // `status` is the value the screen moves on by — no matcher.
        body: enveloped({ photoId: M.uuid(), status: 'Processing' }),
      });

    await against(p, async () => {
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
        headers: authHeadersIn('de'),
      })
      .willRespondWith({
        status: 200,
        headers: privateHeaders,
        body: enveloped({
          photoId: M.uuid(),
          status: 'Completed',
          barcode: M.string('4008400401027'),
          suggestedName: M.string('Skyr Natur'),
          basis: M.regex('Per100g|PerPortion', 'Per100g'),
          // One field per row of the confirmation form; `null` means "not recognised".
          fields: {
            kcal: { value: M.number(63), confidence: M.number(0.97) },
            fatG: { value: M.number(0.2), confidence: M.number(0.91) },
            saturatedFatG: { value: M.number(0.1), confidence: M.number(0.62) },
            carbsG: { value: M.number(4), confidence: M.number(0.95) },
            sugarG: { value: M.number(4), confidence: M.number(0.88) },
            proteinG: { value: M.number(11), confidence: M.number(0.96) },
            saltG: { value: M.number(0.1), confidence: M.number(0.54) },
          },
        }),
      });

    await against(p, async () => {
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
        headers: authHeadersIn('de'),
      })
      .willRespondWith({
        status: 200,
        headers: privateHeaders,
        // The screen sends the user back to the camera; `reason` tells it from 'Processing'.
        body: enveloped({ photoId: M.uuid(), status: 'Failed', reason: M.string('Tabelle nicht lesbar') }),
      });

    await against(p, async () => {
      const job = await api<{ status: string }>(endpoints.photo(photoId));
      expect(job.status).toBe('Failed');
    });
  });
});
