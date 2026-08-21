import * as FileSystem from 'expo-file-system';
import { api, endpoints } from './client';
import { newId } from './ids';
import { putToSignedUrl, SignedUploadError } from './signedUpload';
import type { PhotoUploadTarget } from './types';

/**
 * The photo upload in three steps: fetch the target, place the bytes, report
 * completion. No `Idempotency-Key` on any of them — a key would hand out the
 * stored first response again, and with it the expired upload URL the retry is
 * happening because of. Reasoning:
 * `docs/decisions/2026-08-18-1800-foto-upload-ueber-presigned-url.md`.
 */

/** What `expo-image-manipulator` produces. Stands in the body and in the signature of the upload URL. */
const CONTENT_TYPE = 'image/jpeg';

/** Covers clock skew and the duration of the `PUT` itself. */
const EXPIRY_SKEW_MS = 5_000;

async function byteSizeOf(fileUri: string): Promise<number> {
  const info = await FileSystem.getInfoAsync(fileUri, { size: true });
  if (!info.exists) throw new Error('Aufgenommenes Bild nicht gefunden');
  return info.size;
}

/**
 * Step 1. The size travels along so the server can sign it and reject an
 * oversized image before the bytes flow.
 */
const requestTarget = (photoId: string, byteSize: number, barcode?: string) =>
  api<PhotoUploadTarget>(endpoints.photo(photoId), {
    method: 'PUT',
    body: { contentType: CONTENT_TYPE, byteSize, ...(barcode ? { barcode } : {}) },
  });

/**
 * Returns the `photoId` under which the progress screen polls the OCR job.
 *
 * On an expired signature a fresh target is fetched once, with the **same**
 * `photoId`: a new one would mean a second photo and a second OCR job for the
 * same shot.
 */
export async function uploadNutritionPhoto(fileUri: string, barcode?: string): Promise<string> {
  const photoId = newId();
  const byteSize = await byteSizeOf(fileUri);
  const ask = () => requestTarget(photoId, byteSize, barcode);

  const target = await ask();
  const expiresAt = Date.now() + target.expiresIn * 1000 - EXPIRY_SKEW_MS;
  try {
    await putToSignedUrl(target.uploadUrl, fileUri, target.uploadHeaders);
  } catch (e) {
    if (!(e instanceof SignedUploadError) || Date.now() < expiresAt) throw e;
    const fresh = await ask();
    await putToSignedUrl(fresh.uploadUrl, fileUri, fresh.uploadHeaders);
  }

  // Step 3. Only this report kicks off the OCR — the object store says nothing
  // to our own API.
  await api(endpoints.photoUpload(photoId), { method: 'PUT' });
  return photoId;
}
