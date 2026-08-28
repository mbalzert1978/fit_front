import * as SecureStore from 'expo-secure-store';
import type { DiaryDate } from './diaryDate';
import type { Session, Envelope, Meta } from './types';
import { clientProblems } from './problems';
import { language, preferLanguage } from '../language';
import { texts } from '../i18n';

/**
 * A response with the envelope off. The `ETag` stays in `headers` like any
 * other header — a second field beside it would be a second truth.
 */
export type ApiResponse<T> = { data: T; meta: Meta | null; headers: Headers };

/**
 * A `.env` from the wrong environment tears the app apart at startup rather
 * than transmitting tokens and health data in the clear
 * (`.rules/app/http-schicht.md`).
 */
const LOOPBACK = /^http:\/\/(127\.0\.0\.1|localhost|\[::1\]|10\.0\.2\.2)(:\d+)?\/?$/;

function checked(url: string | undefined): string {
  if (!url) throw new Error('EXPO_PUBLIC_API_URL fehlt (.env)');
  if (!url.startsWith('https://') && !LOOPBACK.test(url)) {
    throw new Error('EXPO_PUBLIC_API_URL muss https sein (Klartext nur gegen 127.0.0.1/localhost)');
  }
  return url;
}

let BASE = checked(process.env.EXPO_PUBLIC_API_URL);

/**
 * The pact mock server picks its own port at run time, so its address cannot be
 * known at import (`pact/setup.ts`). The same check applies to it as to `.env`:
 * a base URL set here is no less able to leak a token than one read from a file.
 */
export function useBaseUrl(url: string): void {
  BASE = checked(url);
}

/**
 * The error shape per RFC 9457; `errors` is the extension for the per-field
 * reasoning. Without `type`, `about:blank` applies per RFC — the response then
 * speaks with its status alone.
 */
export type ProblemDetails = {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
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
  /** The sentence about this occurrence (RFC 9457). Where it stands, the server speaks. */
  get detail() {
    return this.problem.detail;
  }
}

/** Network error — triggers no dialog. */
export class OfflineError extends Error {}

type Options = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  idempotencyKey?: string;
  ifMatch?: string;
};

/* Session */

/**
 * One record under one key: a half-written pair — fresh access token beside the
 * old refresh token — would count at the server as reuse on the next renewal
 * and end all of the user's sessions.
 */
type StoredSession = {
  accessToken: string;
  refreshToken: string;
  /** Milliseconds since the epoch; `0` where the server named no lifetime. */
  accessTokenExpiresAt: number;
  refreshTokenExpiresAt: number;
};

const SESSION_KEY = 'session';

/** The separate keys of the earlier version. */
const LEGACY_KEYS = ['accessToken', 'refreshToken'] as const;

/**
 * On **every** write, not only on sign-out: whoever comes from the old version
 * signs in once and never signs out, so the old refresh token would stay valid
 * and unknown to the app. Deleting into the void costs nothing.
 */
const clearLegacy = () => Promise.all(LEGACY_KEYS.map((k) => SecureStore.deleteItemAsync(k)));

/**
 * Keeps the session out of iCloud and iTunes backups — otherwise it travels
 * onto a second device and signs in there without a password.
 */
const KEYCHAIN = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

/** Lead time after which a token counts as expired — covers clock skew. */
const CLOCK_SKEW_MS = 30_000;

async function readSession(): Promise<StoredSession | null> {
  const stored = await SecureStore.getItemAsync(SESSION_KEY);
  if (!stored) return null;
  try {
    const s = JSON.parse(stored) as StoredSession;
    return typeof s?.accessToken === 'string' && s.accessToken ? s : null;
  } catch {
    return null;
  }
}

async function clearSession() {
  await SecureStore.deleteItemAsync(SESSION_KEY);
  await clearLegacy();
}

const secondsFromNow = (s: unknown) => (typeof s === 'number' && s > 0 ? Date.now() + s * 1000 : 0);

/**
 * The only place where a session goes into secure storage. Checked before the
 * write: half a session would pass `hasSession()` as valid.
 */
export async function storeSession(t: Session) {
  if (!t?.accessToken || !t?.refreshToken) {
    await clearSession();
    throw new ApiError({ type: clientProblems.malformedTokenResponse, title: texts().errorIncompleteTokenPair, status: 502 });
  }
  const session: StoredSession = {
    accessToken: t.accessToken,
    refreshToken: t.refreshToken,
    accessTokenExpiresAt: secondsFromNow(t.expiresIn),
    refreshTokenExpiresAt: secondsFromNow(t.refreshExpiresIn),
  };
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session), KEYCHAIN);
  await clearLegacy();
}

/**
 * Signed in is whoever holds a refresh token that is still running — not
 * whoever holds an access token, which is done for after fifteen minutes while
 * the session is not.
 */
export async function hasSession() {
  const s = await readSession();
  if (!s?.refreshToken) return false;
  return s.refreshTokenExpiresAt === 0 || Date.now() < s.refreshTokenExpiresAt;
}

let signedOutHandler: (() => void) | null = null;

/**
 * Registered exactly once, in `app/_layout.tsx`: the HTTP layer knows neither
 * router nor query cache and is not meant to.
 */
export function onSignedOut(fn: () => void) {
  signedOutHandler = fn;
}

/**
 * Server-side first, local afterwards: deleted only locally, the refresh token
 * stays valid for its full lifetime and a device backup still carries access.
 * If the call fails, sign-out happens locally regardless.
 */
export async function signOut() {
  const s = await readSession();
  if (s?.refreshToken) {
    try {
      await raw('/identity/logout', { method: 'POST', body: { refreshToken: s.refreshToken } }, null);
    } catch {
      /* Sign-out happens locally regardless. */
    }
  }
  await clearSession();
  // The chosen language belonged to this account. If it stayed, the next user on
  // the same device would read in a language they never chose.
  preferLanguage(null);
  signedOutHandler?.();
}

/* Request and response */

/**
 * `Accept-Language` stands on **every** request (`.rules/app/vertraege.md` rule 10). The
 * value comes from the seam `src/language.ts` and not from a literal here: the
 * same language travels along as `locale` when an account is created.
 */
async function raw(path: string, o: Options, access: string | null): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json', 'Accept-Language': language.tag() };
  if (access) headers.Authorization = `Bearer ${access}`;
  if (o.idempotencyKey) headers['Idempotency-Key'] = o.idempotencyKey;
  if (o.ifMatch) headers['If-Match'] = o.ifMatch;
  if (o.body !== undefined) headers['Content-Type'] = 'application/json';
  try {
    return await fetch(`${BASE}/api/v1${path}`, {
      method: o.method ?? 'GET',
      headers,
      body: o.body !== undefined ? JSON.stringify(o.body) : undefined,
    });
  } catch {
    throw new OfflineError('Keine Verbindung');
  }
}

/**
 * Field name onto a list of sentences. A bare string is wrapped, not discarded:
 * `Object.entries` would let it fall apart into characters and the `FormField`
 * would show it letter by letter.
 */
function asFieldErrors(v: unknown): Record<string, string[]> | undefined {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return undefined;
  const fields: Record<string, string[]> = {};
  for (const [field, raw] of Object.entries(v)) {
    const messages = (Array.isArray(raw) ? raw : [raw]).filter((s): s is string => typeof s === 'string');
    if (messages.length > 0) fields[field] = messages;
  }
  return Object.keys(fields).length > 0 ? fields : undefined;
}

/**
 * Checked, not asserted (`.rules/app/http-schicht.md`): its first reader,
 * `splitHints` in `app/register.tsx`, has no second chance. The status comes
 * from the transport, not from the body — only the former is observed.
 */
function asProblem(body: unknown, status: number): ProblemDetails {
  const p = (typeof body === 'object' && body !== null ? body : {}) as Partial<Record<keyof ProblemDetails, unknown>>;
  const text = (v: unknown) => (typeof v === 'string' && v ? v : undefined);
  const errors = asFieldErrors(p.errors);
  return {
    type: text(p.type) ?? 'about:blank',
    title: text(p.title) ?? texts().errorUnknown,
    status,
    detail: text(p.detail),
    instance: text(p.instance),
    ...(errors ? { errors } : {}),
  };
}

/**
 * The only place where an envelope is opened — both `apiWithMeta` and the
 * renewal come through here. Errors stay untouched (`problem+json` carries no
 * envelope). The envelope is checked, not asserted: an `as` cast would pass a
 * missing `data` through as an `undefined` payload that an empty list makes
 * look harmless.
 */
async function unwrap<T>(res: Response): Promise<ApiResponse<T>> {
  const headers = res.headers;
  if (res.status === 204) return { data: undefined as T, meta: null, headers };
  if (!res.ok) throw new ApiError(asProblem(await res.json().catch(() => null), res.status));
  const body = (await res.json().catch(() => null)) as Envelope<T> | null;
  if (!body || typeof body !== 'object' || !('data' in body)) {
    throw new ApiError({ type: clientProblems.malformedEnvelope, title: 'Antwort ohne data/meta-Umschlag', status: res.status });
  }
  return { data: body.data, meta: body.meta ?? null, headers };
}

async function renewOnce(): Promise<string | null> {
  const s = await readSession();
  if (!s?.refreshToken) return null;
  const r = await raw('/identity/refresh', { method: 'POST', body: { refreshToken: s.refreshToken } }, null);
  if (!r.ok) return null;
  // Only `session`, no `user`: the renewal runs at every startup and after every
  // expired access token. It is not meant to touch the user store.
  const fresh = (await unwrap<{ session: Session }>(r)).data;
  await storeSession(fresh.session);
  return fresh.session.accessToken;
}

let renewal: Promise<string | null> | null = null;

/**
 * At most **once concurrently**: the half dozen queries at startup would
 * otherwise each go out with the same refresh token, and the five that lose the
 * race present an already rotated one — which counts as reuse and ends all of
 * the user's sessions.
 */
function renew(): Promise<string | null> {
  renewal ??= renewOnce().finally(() => {
    renewal = null;
  });
  return renewal;
}

/** Repeatable is what the server answers the same way twice. */
const IDEMPOTENT = new Set(['GET', 'HEAD', 'PUT', 'DELETE']);

const mayReplay = (o: Options) => IDEMPOTENT.has(o.method ?? 'GET') || !!o.idempotencyKey;

/**
 * Renewed pre-emptively. `null` means there is no session — normal for sign-in,
 * registration and renewal. If the renewal fails, sign-out happens and a throw
 * follows rather than sending the request without `Authorization` to fetch a
 * 401 that is already settled here (`.rules/app/http-schicht.md`).
 */
async function accessForNext(): Promise<string | null> {
  const s = await readSession();
  const expired = !!s && s.accessTokenExpiresAt > 0 && Date.now() >= s.accessTokenExpiresAt - CLOCK_SKEW_MS;
  if (!expired) return s?.accessToken ?? null;
  const fresh = await renew();
  if (fresh) return fresh;
  await signOut();
  throw new ApiError({ type: clientProblems.sessionExpired, title: 'Anmeldung abgelaufen', status: 401 });
}

/**
 * The single fetch wrapper: base URL, Authorization, Accept-Language,
 * Idempotency-Key, problem+json → ApiError.
 *
 * Renewal happens up front, so the normal case never touches the 401 path. On a
 * remaining 401 only what the server answers the same way twice is repeated: a
 * `POST` without an `Idempotency-Key` would trigger an applied effect again.
 */
async function send(path: string, o: Options): Promise<Response> {
  const res = await raw(path, o, await accessForNext());
  if (res.status !== 401) return res;

  const fresh = await renew();
  if (!fresh) {
    await signOut();
    return res;
  }
  return mayReplay(o) ? raw(path, o, fresh) : res;
}

/** Payload, `meta` and the response headers — the `ETag` among them. */
export async function apiWithMeta<T>(path: string, o: Options = {}): Promise<ApiResponse<T>> {
  return unwrap<T>(await send(path, o));
}

/** The usual way: only the payload. Whoever needs `meta` or a header takes `apiWithMeta`. */
export async function api<T>(path: string, o: Options = {}): Promise<T> {
  return (await apiWithMeta<T>(path, o)).data;
}

/**
 * A path segment, safely inserted. Ids come from deep links and barcodes from
 * the camera; unencoded, a `/` or a `..` in them leaves the path and hits a
 * different endpoint.
 */
export const pathSegment = (v: string) => encodeURIComponent(v);

export const endpoints = {
  diaryDay: (date: DiaryDate) => `/diary/days/${pathSegment(date)}`,
  productByBarcode: (ean: string) => `/catalog/products/by-barcode/${pathSegment(ean)}`,
  photo: (photoId: string) => `/catalog/photos/${pathSegment(photoId)}`,
  photoUpload: (photoId: string) => `/catalog/photos/${pathSegment(photoId)}/upload`,
  entries: (date: DiaryDate) => `/diary/days/${pathSegment(date)}/entries`,
} as const;
