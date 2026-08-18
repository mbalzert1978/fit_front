import * as FileSystem from 'expo-file-system';
import { api, endpoints } from './client';
import { newId } from './ids';
import { putToSignedUrl, SignedUploadError } from './signedUpload';
import type { PhotoUploadTarget } from './types';

/**
 * Der Foto-Upload in drei Schritten: Ziel holen, Bytes legen, Abschluss melden.
 *
 * Alle drei Schritte gegen die eigene API sind `PUT` auf eine Adresse, die der
 * Client schon kennt — er erzeugt die `photoId` selbst. Das ist kein Zufall,
 * sondern der Grund, warum hier kein `Idempotency-Key` steht: ein Schlüssel
 * liefert die *gespeicherte erste* Antwort erneut aus, und damit genau die
 * abgelaufene Upload-URL, wegen der wiederholt wird. `PUT` sagt stattdessen
 * „dieses Foto, dieser Zustand" und darf beliebig oft dasselbe bedeuten.
 */

/** Was `expo-image-manipulator` erzeugt. Steht im Rumpf und in der Signatur der Upload-URL. */
const CONTENT_TYPE = 'image/jpeg';

/**
 * Vorlauf, mit dem eine Upload-URL als abgelaufen gilt. Deckt Uhrenversatz und
 * die Laufzeit des `PUT` selbst ab: eine URL, die in zwei Sekunden abläuft, ist
 * für ein Bild von einigen hundert Kilobyte bereits abgelaufen.
 */
const EXPIRY_SKEW_MS = 5_000;

async function byteSizeOf(fileUri: string): Promise<number> {
  const info = await FileSystem.getInfoAsync(fileUri, { size: true });
  if (!info.exists) throw new Error('Aufgenommenes Bild nicht gefunden');
  return info.size;
}

/**
 * Schritt 1. Die Größe geht mit, damit der Server sie in die Signatur nehmen
 * und ein zu großes Bild ablehnen kann, **bevor** die Bytes fließen — im alten
 * Multipart-Weg fiel das erst nach der Übertragung auf.
 */
const requestTarget = (photoId: string, byteSize: number, barcode?: string) =>
  api<PhotoUploadTarget>(endpoints.photo(photoId), {
    method: 'PUT',
    body: { contentType: CONTENT_TYPE, byteSize, ...(barcode ? { barcode } : {}) },
  });

/**
 * Lädt die fotografierte Nährwerttabelle hoch und gibt die `photoId` zurück,
 * unter der der Fortschritts-Screen den OCR-Auftrag abfragt.
 *
 * Weist der Objektspeicher die Bytes zurück, **nachdem** die Signatur abgelaufen
 * ist, wird genau einmal ein frisches Ziel geholt — mit derselben `photoId`,
 * nie mit einer neuen. Eine neue erzeugte ein zweites Foto und einen zweiten
 * OCR-Auftrag für dieselbe Aufnahme.
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

  // Schritt 3. Erst diese Meldung stößt die OCR an; der Objektspeicher selbst
  // sagt der eigenen API nichts.
  await api(endpoints.photoUpload(photoId), { method: 'PUT' });
  return photoId;
}
