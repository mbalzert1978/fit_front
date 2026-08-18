import * as SecureStore from 'expo-secure-store';
import type { DiaryDate } from './diaryDate';
import type { AuthTokens, Envelope, Meta } from './types';

/**
 * Was eine Antwort trägt, nachdem der Umschlag ab ist: die Nutzlast aus `data`,
 * die Begleitinformation aus `meta` und die Header, die fachlich zählen. `meta`
 * ist `null`, wo es keinen Rumpf gibt (204); `etag` dort, wo der Server keinen
 * schickt.
 */
export type ApiResponse<T> = { data: T; meta: Meta | null; etag: string | null };

const BASE = process.env.EXPO_PUBLIC_API_URL;
if (!BASE) throw new Error('EXPO_PUBLIC_API_URL fehlt (.env)');

export type ProblemDetails = {
  type: string;
  title: string;
  status: number;
  detail?: string;
  errors?: Record<string, string[]>;
};

export class ApiError extends Error {
  constructor(readonly problem: ProblemDetails) {
    super(problem.title);
  }
  get type() {
    return this.problem.type;
  }
  get status() {
    return this.problem.status;
  }
  get errors() {
    return this.problem.errors;
  }
}

/** Netzwerkfehler: löst keinen Dialog aus, sondern den Rückfall auf die Outbox. */
export class OfflineError extends Error {}

type Options = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  idempotencyKey?: string;
  ifMatch?: string;
  language?: string;
  formData?: FormData;
};

async function token(key: 'accessToken' | 'refreshToken') {
  return SecureStore.getItemAsync(key);
}

/** Die einzige Stelle, an der ein Token-Paar in den sicheren Speicher geht. */
export async function storeTokens(t: AuthTokens) {
  await SecureStore.setItemAsync('accessToken', t.accessToken);
  await SecureStore.setItemAsync('refreshToken', t.refreshToken);
}

export async function signOut() {
  await SecureStore.deleteItemAsync('accessToken');
  await SecureStore.deleteItemAsync('refreshToken');
}

async function raw(path: string, o: Options, access: string | null): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json', 'Accept-Language': o.language ?? 'de' };
  if (access) headers.Authorization = `Bearer ${access}`;
  if (o.idempotencyKey) headers['Idempotency-Key'] = o.idempotencyKey;
  if (o.ifMatch) headers['If-Match'] = o.ifMatch;
  if (o.body !== undefined) headers['Content-Type'] = 'application/json';
  try {
    return await fetch(`${BASE}/api/v1${path}`, {
      method: o.method ?? 'GET',
      headers,
      body: o.formData ?? (o.body !== undefined ? JSON.stringify(o.body) : undefined),
    });
  } catch {
    throw new OfflineError('Keine Verbindung');
  }
}

/** Erneuert das Token-Paar und liefert den frischen Access-Token, oder `null`. */
async function renew(): Promise<string | null> {
  const refreshToken = await token('refreshToken');
  if (!refreshToken) return null;
  const r = await raw('/identity/refresh', { method: 'POST', body: { refreshToken } }, null);
  if (!r.ok) return null;
  const fresh = ((await r.json()) as Envelope<AuthTokens>).data;
  await storeTokens(fresh);
  return fresh.accessToken;
}

/**
 * Eine einzige fetch-Hülle: Basis-URL, Authorization, Accept-Language,
 * Idempotency-Key, problem+json → ApiError. Bei 401 einmalig Token erneuern
 * und wiederholen; scheitert auch das, abmelden.
 */
async function send(path: string, o: Options): Promise<Response> {
  const res = await raw(path, o, await token('accessToken'));
  if (res.status !== 401) return res;

  const access = await renew();
  if (!access) {
    await signOut();
    return res;
  }
  return raw(path, o, access);
}

/**
 * Antwort samt Umschlag. Das Auspacken von `data`/`meta` passiert hier und
 * nirgends sonst; `etag` kommt aus dem gleichnamigen Header, nicht aus dem
 * Rumpf. Fehler bleiben davon unberührt — `problem+json` trägt keinen Umschlag.
 * Eine Antwort ohne Rumpf (204) hat weder `meta` noch Nutzlast.
 */
export async function apiWithMeta<T>(path: string, o: Options = {}): Promise<ApiResponse<T>> {
  const res = await send(path, o);
  const etag = res.headers.get('ETag');

  if (res.status === 204) return { data: undefined as T, meta: null, etag };
  if (!res.ok) {
    const problem = (await res.json().catch(() => null)) as ProblemDetails | null;
    throw new ApiError(problem ?? { type: 'about:blank', title: 'Unbekannter Fehler', status: res.status });
  }
  const envelope = (await res.json()) as Envelope<T>;
  return { data: envelope.data, meta: envelope.meta, etag };
}

/** Der übliche Weg: nur die Nutzlast. Wer `meta` oder den ETag braucht, nimmt `apiWithMeta`. */
export async function api<T>(path: string, o: Options = {}): Promise<T> {
  return (await apiWithMeta<T>(path, o)).data;
}

/* Endpunkte, die das Grundgerüst braucht. Der vollständige, typisierte Client
   wird mit openapi-typescript aus der Swagger-Datei erzeugt (npm run api:types). */

export const endpoints = {
  diaryDay: (date: DiaryDate) => `/diary/days/${date}`,
  productByBarcode: (ean: string) => `/catalog/products/by-barcode/${ean}`,
  photo: (photoId: string) => `/catalog/photos/${photoId}`,
  entries: (date: DiaryDate) => `/diary/days/${date}/entries`,
} as const;
