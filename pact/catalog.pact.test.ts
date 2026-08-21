import {
  pact,
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
 * Bedarf: `app/(tabs)/scan.tsx` (Barcode und Suche), `app/product/[id].tsx`
 * (Produktblatt), `app/capture/photo.tsx` (Tabelle hochladen),
 * `app/capture/processing.tsx` (Fortschritt der OCR) und
 * `app/capture/confirm.tsx` (bestätigtes Produkt anlegen).
 *
 * Nährwerte sind `M.number` und nicht `M.decimal`: der Bestätigungs-Screen gibt
 * ein, was in der Tabelle steht — „4" ebenso wie „4,1".
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

    await p.executeTest(async () => {
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

    await p.executeTest(async () => {
      // Dieser Fall ist kein Fehler im UI: er führt in den Foto-Flow.
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

    await p.executeTest(async () => {
      // 404 und 401 sind zwei verschiedene Ausgänge: der eine führt in den
      // Foto-Flow, der andere beendet die Sitzung. Ohne Zusage stünde nicht
      // fest, dass sie unterscheidbar bleiben.
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
          // `source` steuert die Quellzeile unter dem Namen — der Wert selbst ist Teil der Zusage.
          source: M.regex('Curated|Ocr|Manual', 'Curated'),
          nutrientsPer100g: {
            kcal: M.integer(63),
            fatG: M.number(0.2),
            carbsG: M.number(4),
            proteinG: M.number(11),
          },
        }),
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
      .withRequest({ method: 'GET', path: '/api/v1/search', query: { query: 'skyr', take: '20' }, headers: authHeadersIn('de') })
      .willRespondWith({
        status: 200,
        headers: privateHeaders,
        // Die Trefferliste steht direkt unter `data`; das frühere `items` war ein
        // eigener kleiner Umschlag und fällt mit diesem hier weg.
        body: enveloped(
          M.eachLike({
            sourceType: M.regex('Product|Recipe', 'Product'),
            id: M.uuid(),
            displayName: M.string('Skyr Natur, Arla'),
            metaLine: M.string('63 kcal je 100 g'),
          }),
        ),
      });

    await p.executeTest(async () => {
      const hits = await api<unknown[]>('/search?query=skyr&take=20');
      expect(Array.isArray(hits)).toBe(true);
    });
  });
});

describe('Catalog — Foto-Auftrag', () => {
  /**
   * Der Upload läuft in drei Schritten: das Ziel bei der eigenen API holen, die
   * Bytes an den Objektspeicher legen, den Abschluss melden. **Zugesichert sind
   * nur der erste und der dritte.**
   *
   * Der zweite geht an einen fremden Origin. Ein Vertrag gilt zwischen diesem
   * Consumer und `nutritrack-catalog`; der Objektspeicher ist kein Provider
   * dieses Repos, und nichts, was hier stünde, würde dort je verifiziert. Ein
   * Mock-Provider dafür wäre kein Vertrag, sondern eine Zusage an uns selbst.
   *
   * Die Zusage endet deshalb sichtbar an `uploadUrl` und `uploadHeaders`: was
   * der Server dort nennt, geht unverändert hinaus — dass der Objektspeicher es
   * dann annimmt, sichert dieser Vertrag nicht zu.
   *
   * Alle drei Schritte gegen die eigene API sind `PUT` auf eine Adresse, die der
   * Client schon kennt: er erzeugt die `photoId` selbst. Deshalb steht an keinem
   * ein `Idempotency-Key` — ein Schlüssel liefert die gespeicherte erste Antwort
   * erneut aus und damit genau die abgelaufene Upload-URL, wegen der wiederholt
   * wird.
   */
  const uploadTarget = {
    photoId: M.uuid(),
    // Der Client sendet die Bytes nur über https; eine http-Adresse hier lässt
    // ihn abbrechen, statt das Foto im Klartext hinauszugeben.
    uploadUrl: M.regex('https://.+', `https://objektspeicher.example/nutritrack/${photoId}?X-Amz-Expires=900&X-Amz-Signature=8d1f2c`),
    // Genau die Header, die der Server mitsigniert hat. `Content-Type` ist immer
    // dabei: er steht in der Signatur, und ein abweichender Wert lässt den
    // Objektspeicher die Bytes zurückweisen.
    uploadHeaders: { 'Content-Type': M.string('image/jpeg') },
    expiresIn: M.integer(900),
  };

  /** `contentType` ist ein fester Wert: die App schickt ausschließlich JPEG (`expo-image-manipulator`). */
  const targetRequest = {
    contentType: 'image/jpeg',
    // Die Größe geht mit, damit ein zu großes Bild abgelehnt wird, bevor die
    // Bytes fließen — der alte Multipart-Weg merkte es erst danach.
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

    await p.executeTest(async () => {
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
    // Der Fall, für den `expiresIn` da ist: die Signatur ist abgelaufen, bevor
    // die Bytes durch waren. Dieselbe `photoId` fragt erneut — eine neue erzeugte
    // ein zweites Foto und einen zweiten OCR-Auftrag für dieselbe Aufnahme.
    p.given('Foto-Auftrag wartet auf den Upload')
      .uponReceiving('Upload-Ziel nach abgelaufener Signatur erneut anfordern')
      .withRequest({ method: 'PUT', path: photoPath, headers: jsonAuthHeadersIn('de'), body: targetRequest })
      // 200 statt 201: das Foto besteht schon, nur die Signatur ist neu.
      .willRespondWith({ status: 200, headers: privateHeaders, body: enveloped(uploadTarget) });

    await p.executeTest(async () => {
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
        // Erst diese Meldung stößt die OCR an; ab hier fragt der
        // Fortschritts-Screen auf `photoId` weiter.
        body: enveloped({ photoId: M.uuid(), status: 'Processing' }),
      });

    await p.executeTest(async () => {
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
        // `status` ist der Wert, an dem der Screen weiterschaltet — kein Matcher.
        body: enveloped({ photoId: M.uuid(), status: 'Processing' }),
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
        }),
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
        headers: authHeadersIn('de'),
      })
      .willRespondWith({
        status: 200,
        headers: privateHeaders,
        // Der Screen schickt den Nutzer zurück zur Kamera; `reason` unterscheidet ihn von 'Processing'.
        body: enveloped({ photoId: M.uuid(), status: 'Failed', reason: M.string('Tabelle nicht lesbar') }),
      });

    await p.executeTest(async () => {
      const job = await api<{ status: string }>(endpoints.photo(photoId));
      expect(job.status).toBe('Failed');
    });
  });
});
