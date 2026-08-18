import * as SecureStore from 'expo-secure-store';
import type { DiaryDate } from './diaryDate';

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
  get type() { return this.problem.type; }
  get status() { return this.problem.status; }
  get errors() { return this.problem.errors; }
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

async function storeTokens(t: { accessToken: string; refreshToken: string }) {
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
 * Eine einzige fetch-Hülle: Basis-URL, Authorization, Accept-Language,
 * Idempotency-Key, problem+json → ApiError. Bei 401 einmalig Token erneuern
 * und wiederholen; scheitert auch das, abmelden.
 */
export async function api<T>(path: string, o: Options = {}): Promise<T> {
  let access = await token('accessToken');
  let res = await raw(path, o, access);

  if (res.status === 401) {
    const refreshToken = await token('refreshToken');
    if (refreshToken) {
      const r = await raw('/identity/refresh', { method: 'POST', body: { refreshToken } }, null);
      if (r.ok) {
        const fresh = (await r.json()) as { accessToken: string; refreshToken: string };
        await storeTokens(fresh);
        access = fresh.accessToken;
        res = await raw(path, o, access);
      } else {
        await signOut();
      }
    } else {
      await signOut();
    }
  }

  if (res.status === 204) return undefined as T;
  if (!res.ok) {
    const problem = (await res.json().catch(() => null)) as ProblemDetails | null;
    throw new ApiError(problem ?? { type: 'about:blank', title: 'Unbekannter Fehler', status: res.status });
  }
  return (await res.json()) as T;
}

/* Endpunkte, die das Grundgerüst braucht. Der vollständige, typisierte Client
   wird mit openapi-typescript aus der Swagger-Datei erzeugt (npm run api:types). */

export const endpoints = {
  diaryDay: (date: DiaryDate) => `/diary/days/${date}`,
  productByBarcode: (ean: string) => `/catalog/products/by-barcode/${ean}`,
  photo: (photoId: string) => `/catalog/photos/${photoId}`,
  entries: (date: DiaryDate) => `/diary/days/${date}/entries`,
} as const;
