import * as FileSystem from 'expo-file-system';
import { OfflineError } from './client';

/**
 * The only HTTP path in this repo that does **not** go through
 * `src/api/client.ts`: the destination is a foreign origin, the signature in the
 * URL is the authorization, and sending the bearer token there would hand it to
 * a third party.
 *
 * What it expressly is not: a second general HTTP path. One task, one caller
 * (`src/api/photoUpload.ts`). Reasoning:
 * `docs/decisions/2026-08-18-1800-foto-upload-ueber-presigned-url.md`.
 */

/** Carries the status, because the decision to fetch a fresh target hangs on it. */
export class SignedUploadError extends Error {
  constructor(readonly status: number) {
    super(`Upload abgelehnt (${status})`);
  }
}

/**
 * Places the bytes of a file under a signed URL.
 *
 * `headers` are the ones the server co-signed and go out unchanged: a single
 * deviation gets a signature mismatch instead of a hint. `fetch` is out of the
 * question here — in React Native it knows no body from a `file://` URI, while
 * `uploadAsync` streams natively and still sets the headers exactly.
 */
export async function putToSignedUrl(uploadUrl: string, fileUri: string, headers: Record<string, string>): Promise<void> {
  // Never in the clear, not even when our own API names an `http` address. No
  // `SignedUploadError`: a fresh target from the same source would be as wrong.
  if (!uploadUrl.startsWith('https://')) throw new Error('Upload-Ziel ist kein https');

  let res;
  try {
    res = await FileSystem.uploadAsync(uploadUrl, fileUri, {
      httpMethod: 'PUT',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers,
    });
  } catch {
    throw new OfflineError('Keine Verbindung zum Objektspeicher');
  }

  if (res.status < 200 || res.status >= 300) throw new SignedUploadError(res.status);
}
