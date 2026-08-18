import * as FileSystem from 'expo-file-system';
import { OfflineError } from './client';

/**
 * Der einzige HTTP-Weg dieses Repos, der **nicht** durch `src/api/client.ts` geht.
 *
 * `client.ts` ist der Zugang zur eigenen API: Basis-URL, `Authorization`,
 * `Accept-Language`, der `data`/`meta`-Umschlag, `problem+json` und die
 * Erneuerung nach 401. Nichts davon gilt hier. Das Ziel ist ein fremder Origin,
 * die Signatur in der URL ist die Autorisierung, und der Objektspeicher
 * antwortet mit leerem Rumpf statt mit einem Umschlag. Den Bearer-Token an
 * diese Adresse mitzuschicken wäre nicht überflüssig, sondern falsch — er ginge
 * an einen Dritten.
 *
 * Deshalb steht diese Funktion daneben statt darin. Was sie ausdrücklich nicht
 * ist: ein zweiter allgemeiner HTTP-Weg. Eine Aufgabe, ein Aufrufer
 * (`src/api/photoUpload.ts`). Wächst hier ein zweiter Endpunkt hinein, ist das
 * der Moment, an dem die Naht neu gezogen wird — nicht der, an dem sie
 * aufweicht. Die Begründung steht in
 * `docs/decisions/2026-08-18-1800-foto-upload-ueber-presigned-url.md`.
 */

/**
 * Der Objektspeicher hat die Bytes nicht angenommen. Trägt den Status, weil an
 * ihm die Entscheidung hängt, ob ein frisches Ziel zu holen ist.
 */
export class SignedUploadError extends Error {
  constructor(readonly status: number) {
    super(`Upload abgelehnt (${status})`);
  }
}

/**
 * Legt die Bytes einer Datei unter einer signierten URL ab.
 *
 * `headers` sind die Header, die der Server mitsigniert hat, und gehen
 * unverändert hinaus: weicht auch nur einer ab, antwortet der Objektspeicher
 * mit einer Signaturabweichung statt mit einem Hinweis, was fehlt.
 *
 * `fetch` scheidet für diesen einen Aufruf aus. Es kennt in React Native keinen
 * Rumpf aus einem `file://`-URI; die Bytes müssten erst als Base64 durch den
 * JS-Speicher, um sie danach wieder zu verwerfen. `uploadAsync` streamt die
 * Datei nativ und lässt gleichzeitig zu, die Header exakt zu setzen.
 */
export async function putToSignedUrl(uploadUrl: string, fileUri: string, headers: Record<string, string>): Promise<void> {
  // Ein Foto der Nährwerttabelle geht nie im Klartext hinaus, auch nicht, wenn
  // die eigene API eine `http`-Adresse nennt. Kein `SignedUploadError`: ein
  // frisches Ziel von derselben Quelle wäre genauso falsch.
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
