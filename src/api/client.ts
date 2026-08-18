import * as SecureStore from 'expo-secure-store';
import type { DiaryDate } from './diaryDate';
import type { AuthTokens, Envelope, Meta } from './types';

/**
 * Was eine Antwort trägt, nachdem der Umschlag ab ist: die Nutzlast aus `data`,
 * die Begleitinformation aus `meta` und die Antwort-Header vollständig. `meta`
 * ist `null`, wo es keinen Rumpf gibt (204). Der `ETag` steht in `headers` wie
 * jeder andere Header auch — es gibt kein zweites Feld daneben, sonst gäbe es
 * zwei Wahrheiten für denselben Wert.
 */
export type ApiResponse<T> = { data: T; meta: Meta | null; headers: Headers };

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

/**
 * Die einzige Stelle, an der ein Umschlag aufgeht. Beide Wege nach draußen —
 * `apiWithMeta` und die Erneuerung — kommen hier durch; deshalb steht `data`,
 * `meta` und `headers` genau einmal im Repo zusammengesetzt. Fehler bleiben
 * unberührt (`problem+json` trägt keinen Umschlag), eine Antwort ohne Rumpf
 * (204) hat weder `meta` noch Nutzlast.
 */
async function unwrap<T>(res: Response): Promise<ApiResponse<T>> {
  const headers = res.headers;
  if (res.status === 204) return { data: undefined as T, meta: null, headers };
  if (!res.ok) {
    const problem = (await res.json().catch(() => null)) as ProblemDetails | null;
    throw new ApiError(problem ?? { type: 'about:blank', title: 'Unbekannter Fehler', status: res.status });
  }
  const envelope = (await res.json()) as Envelope<T>;
  return { data: envelope.data, meta: envelope.meta, headers };
}

/** Erneuert das Token-Paar und liefert den frischen Access-Token, oder `null`. */
async function renew(): Promise<string | null> {
  const refreshToken = await token('refreshToken');
  if (!refreshToken) return null;
  const r = await raw('/identity/refresh', { method: 'POST', body: { refreshToken } }, null);
  if (!r.ok) return null;
  const fresh = (await unwrap<AuthTokens>(r)).data;
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
 * Antwort samt Umschlag: Nutzlast, `meta` und die Antwort-Header. Der `ETag`
 * kommt aus `headers`, nicht aus dem Rumpf; `meta.requestId` lässt sich hier
 * gegen `X-Request-Id` halten, weil beides denselben Aufruf beschreibt.
 */
export async function apiWithMeta<T>(path: string, o: Options = {}): Promise<ApiResponse<T>> {
  return unwrap<T>(await send(path, o));
}

/** Der übliche Weg: nur die Nutzlast. Wer `meta` oder einen Header braucht, nimmt `apiWithMeta`. */
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
