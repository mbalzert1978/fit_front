import * as SecureStore from 'expo-secure-store';
import type { DiaryDate } from './diaryDate';
import type { Session, Envelope, Meta } from './types';
import { clientProblems } from './problems';
import { language, preferLanguage } from '../language';

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

/**
 * Klartext ausschließlich gegen die eigene Maschine — Entwicklungsserver und
 * Pact-Mock. Jede andere Basis muss `https` sein: über sie gehen Bearer-Token,
 * Anmeldedaten und Gesundheitsdaten. Eine `.env` aus der falschen Umgebung soll
 * die App beim Start zerreißen und nicht still im Klartext funken.
 */
const LOOPBACK = /^http:\/\/(127\.0\.0\.1|localhost|\[::1\]|10\.0\.2\.2)(:\d+)?\/?$/;
if (!BASE.startsWith('https://') && !LOOPBACK.test(BASE)) {
  throw new Error('EXPO_PUBLIC_API_URL muss https sein (Klartext nur gegen 127.0.0.1/localhost)');
}

/**
 * Die Fehlerform nach RFC 9457. `type` ist die Kennung der Fehlerart (eine URI,
 * siehe `problems.ts`), `title` benennt die Art, `detail` erklärt **diesen**
 * Vorfall, `instance` benennt ihn. `errors` ist die Erweiterung für die
 * feldweise Begründung: Feldname des Anfrage-Rumpfes auf Sätze.
 *
 * Fehlt `type`, gilt nach RFC `about:blank` — die Antwort sagt dann nur mit
 * ihrem Status, was los ist.
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
  /** Der Satz zu diesem Vorfall (RFC 7807). Wo er steht, redet der Server. */
  get detail() {
    return this.problem.detail;
  }
}

/** Netzwerkfehler: löst keinen Dialog aus, sondern den Rückfall auf die Outbox. */
export class OfflineError extends Error {}

type Options = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  idempotencyKey?: string;
  ifMatch?: string;
  formData?: FormData;
};

/* Sitzung */

/**
 * Die Sitzung liegt als **ein** Datensatz unter **einem** Schlüssel. Zwei
 * getrennte Schlüssel konnten einen halben Zustand hinterlassen, wenn der
 * zweite Schreibvorgang scheitert: ein frischer Access-Token neben dem alten
 * Refresh-Token. Der ginge bei der nächsten Erneuerung hinaus, und weil der
 * Server ihn rotiert, gilt er dort als wiederverwendeter — was alle Sitzungen
 * des Nutzers beendet. Ein Datensatz lässt sich nur ganz oder gar nicht
 * schreiben.
 */
type StoredSession = {
  accessToken: string;
  refreshToken: string;
  /** Millisekunden seit Epoche; `0`, wo der Server keine Laufzeit genannt hat. */
  accessTokenExpiresAt: number;
  refreshTokenExpiresAt: number;
};

const SESSION_KEY = 'session';

/** Die getrennten Schlüssel der früheren Fassung. */
const LEGACY_KEYS = ['accessToken', 'refreshToken'] as const;

/**
 * Räumt die Schlüssel der früheren Fassung ab — bei **jedem** Schreiben einer
 * Sitzung, nicht nur beim Abmelden. Wer von der alten Fassung kommt, findet
 * keine Sitzung, meldet sich einmal neu an und meldet sich danach nie ab: der
 * alte Refresh-Token bliebe sonst liegen, bis er von selbst abläuft — gültig,
 * nie entwertet und der App unbekannt, also auch von ihr nicht abzumelden. Ein
 * Löschen ins Leere kostet nichts.
 */
const clearLegacy = () => Promise.all(LEGACY_KEYS.map((k) => SecureStore.deleteItemAsync(k)));

/**
 * `WHEN_UNLOCKED_THIS_DEVICE_ONLY` hält die Sitzung aus iCloud- und
 * iTunes-Backups heraus. Ohne diese Angabe wandert sie mit einem Backup auf ein
 * zweites Gerät und meldet dort an, ohne dass jemand ein Passwort eingibt.
 */
const KEYCHAIN = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

/** Vorlauf, mit dem ein Token als abgelaufen gilt — deckt Uhrenversatz ab. */
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

/** Löscht die Sitzung im Gerät, ohne das Backend zu behelligen. */
async function clearSession() {
  await SecureStore.deleteItemAsync(SESSION_KEY);
  await clearLegacy();
}

const secondsFromNow = (s: unknown) => (typeof s === 'number' && s > 0 ? Date.now() + s * 1000 : 0);

/**
 * Die einzige Stelle, an der eine Sitzung in den sicheren Speicher geht. Beide
 * Token werden geprüft, **bevor** geschrieben wird: eine Antwort ohne
 * vollständiges Paar darf keine halbe Sitzung hinterlassen, die `hasSession()`
 * anschließend für gültig hält.
 */
export async function storeSession(t: Session) {
  if (!t?.accessToken || !t?.refreshToken) {
    await clearSession();
    throw new ApiError({ type: clientProblems.malformedTokenResponse, title: 'Antwort ohne vollständiges Token-Paar', status: 502 });
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
 * Angemeldet ist, wer einen Refresh-Token hat, der noch läuft. Am Access-Token
 * allein hängt es nicht: der ist nach fünfzehn Minuten hinüber, die Sitzung
 * deshalb aber nicht — und umgekehrt ist ein vorhandener, längst abgelaufener
 * Access-Token kein Grund, die App hinter der Anmeldung zu starten.
 */
export async function hasSession() {
  const s = await readSession();
  if (!s?.refreshToken) return false;
  return s.refreshTokenExpiresAt === 0 || Date.now() < s.refreshTokenExpiresAt;
}

let signedOutHandler: (() => void) | null = null;

/**
 * Was zu tun ist, wenn eine Sitzung endet: Cache leeren und zur Anmeldung
 * führen. Registriert wird das genau einmal, in `app/_layout.tsx` — die
 * HTTP-Schicht kennt weder Router noch Query-Cache und soll beide nicht kennen.
 */
export function onSignedOut(fn: () => void) {
  signedOutHandler = fn;
}

/**
 * Abmelden heißt: der Refresh-Token wird **serverseitig** entwertet und erst
 * danach lokal gelöscht. Nur lokal zu löschen ließe ihn über seine volle
 * Laufzeit gültig — wer ihn aus einem Gerätebackup zieht, hätte damit weiter
 * Zugriff. Scheitert der Aufruf (offline, Server weg), wird trotzdem lokal
 * abgemeldet: ein Gerät, das nicht abmelden kann, darf nicht angemeldet
 * bleiben.
 */
export async function signOut() {
  const s = await readSession();
  if (s?.refreshToken) {
    try {
      await raw('/identity/logout', { method: 'POST', body: { refreshToken: s.refreshToken } }, null);
    } catch {
      /* Lokal wird trotzdem abgemeldet. */
    }
  }
  await clearSession();
  // Die gewählte Sprache gehörte diesem Konto. Bliebe sie stehen, läse der
  // nächste Nutzer auf demselben Gerät in einer Sprache, die er nie gewählt hat.
  preferLanguage(null);
  signedOutHandler?.();
}

/* Anfrage und Antwort */

/**
 * `Accept-Language` steht an **jeder** Anfrage, nicht nur an denen, deren
 * Fehler heute jemand anzeigt. Der Server entscheidet allein an dieser Zeile,
 * in welcher Sprache seine Sätze kommen — `title`, `detail` und jeder Satz in
 * `errors`. Fehlt sie, fällt er auf seine Vorgabe zurück, und ein englischer
 * Nutzer läse deutsche Fehlermeldungen, ohne dass es irgendwo auffiele.
 *
 * Der Wert kommt aus der Naht `src/language.ts` und nicht aus einem Literal
 * hier: dieselbe Sprache reist beim Anlegen eines Kontos als `locale` mit.
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
      body: o.formData ?? (o.body !== undefined ? JSON.stringify(o.body) : undefined),
    });
  } catch {
    throw new OfflineError('Keine Verbindung');
  }
}

/**
 * Die Sätze zu den Feldern, so wie ein Screen sie liest: Feldname auf eine Liste
 * von Sätzen. Was diese Form nicht hat, kommt nicht durch — ein einzelner String
 * zerfiele in `Object.entries` in seine Zeichen und stünde im `FormField`
 * Buchstabe für Buchstabe. Eingepackt statt verworfen wird er trotzdem: er ist
 * die Begründung, die der Nutzer lesen soll.
 */
function asFieldErrors(v: unknown): Record<string, string[]> | undefined {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return undefined;
  const felder: Record<string, string[]> = {};
  for (const [feld, roh] of Object.entries(v)) {
    const saetze = (Array.isArray(roh) ? roh : [roh]).filter((s): s is string => typeof s === 'string');
    if (saetze.length > 0) felder[feld] = saetze;
  }
  return Object.keys(felder).length > 0 ? felder : undefined;
}

/**
 * Die Fehlernutzlast wird geprüft wie der Umschlag und nicht behauptet: ein
 * `as`-Cast reichte jede Form durch, und ihr erster Leser (`splitHints` in
 * `app/register.tsx`) hat keine zweite Gelegenheit zu prüfen. Taugt ein Feld
 * nicht, gilt der Rückfall — `about:blank` ist nach RFC 9457 die Kennung dafür,
 * dass die Antwort nur mit ihrem Status spricht.
 *
 * Der Status kommt vom Transport, nicht aus dem Rumpf: beobachtet ist nur jener.
 */
function asProblem(body: unknown, status: number): ProblemDetails {
  const p = (typeof body === 'object' && body !== null ? body : {}) as Partial<Record<keyof ProblemDetails, unknown>>;
  const satz = (v: unknown) => (typeof v === 'string' && v ? v : undefined);
  const errors = asFieldErrors(p.errors);
  return {
    type: satz(p.type) ?? 'about:blank',
    title: satz(p.title) ?? 'Unbekannter Fehler',
    status,
    detail: satz(p.detail),
    instance: satz(p.instance),
    ...(errors ? { errors } : {}),
  };
}

/**
 * Die einzige Stelle, an der ein Umschlag aufgeht. Beide Wege nach draußen —
 * `apiWithMeta` und die Erneuerung — kommen hier durch; deshalb steht `data`,
 * `meta` und `headers` genau einmal im Repo zusammengesetzt. Fehler bleiben
 * unberührt (`problem+json` trägt keinen Umschlag), eine Antwort ohne Rumpf
 * (204) hat weder `meta` noch Nutzlast.
 *
 * Der Umschlag wird geprüft, nicht behauptet: ein `as`-Cast hätte eine Antwort
 * ohne `data` als `undefined`-Nutzlast durchgereicht, und die fällt erst
 * irgendwo im Screen auf — oder gar nicht, weil eine leere Liste harmlos
 * aussieht. Der Umschlag ist Vorgabe; fehlt er, ist die Antwort falsch und
 * nicht leer.
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
  // Nur `session`, kein `user`: die Erneuerung läuft bei jedem Start und nach
  // jedem abgelaufenen Access-Token. Sie soll den User-Store nicht anfassen.
  const fresh = (await unwrap<{ session: Session }>(r)).data;
  await storeSession(fresh.session);
  return fresh.session.accessToken;
}

let renewal: Promise<string | null> | null = null;

/**
 * Erneuert höchstens **einmal gleichzeitig**. Beim Start laufen ein halbes
 * Dutzend Abfragen parallel; liefe jede in ihre eigene Erneuerung, gingen sechs
 * Anfragen mit demselben Refresh-Token hinaus. Der Server rotiert ihn, also
 * verbraucht die erste ihn und die übrigen fünf legen einen bereits entwerteten
 * vor — was dort als Wiederverwendung gilt und alle Sitzungen des Nutzers
 * beendet. Alle Wartenden teilen sich deshalb dieselbe Zusage.
 */
function renew(): Promise<string | null> {
  renewal ??= renewOnce().finally(() => {
    renewal = null;
  });
  return renewal;
}

/** Wiederholbar ist, was der Server zweimal gleich beantwortet. */
const IDEMPOTENT = new Set(['GET', 'HEAD', 'PUT', 'DELETE']);

const mayReplay = (o: Options) => IDEMPOTENT.has(o.method ?? 'GET') || !!o.idempotencyKey;

/**
 * Eine einzige fetch-Hülle: Basis-URL, Authorization, Accept-Language,
 * Idempotency-Key, problem+json → ApiError.
 *
 * Erneuert wird **vorab**, sobald der Access-Token abgelaufen ist — damit
 * braucht der Normalfall den 401-Weg gar nicht. Bleibt der 401 trotzdem (der
 * Server hat die Sitzung verworfen), wird einmal erneuert und danach nur
 * wiederholt, was der Server zweimal gleich beantwortet: ein `POST` oder
 * `PATCH` ohne `Idempotency-Key` würde sonst eine bereits angewandte Wirkung
 * ein zweites Mal auslösen. Scheitert die Erneuerung, wird abgemeldet.
 */
async function send(path: string, o: Options): Promise<Response> {
  const s = await readSession();
  const expired = !!s && s.accessTokenExpiresAt > 0 && Date.now() >= s.accessTokenExpiresAt - CLOCK_SKEW_MS;
  const access = expired ? await renew() : (s?.accessToken ?? null);

  const res = await raw(path, o, access);
  if (res.status !== 401) return res;

  const fresh = await renew();
  if (!fresh) {
    await signOut();
    return res;
  }
  return mayReplay(o) ? raw(path, o, fresh) : res;
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

/**
 * Ein Pfadsegment, sicher eingesetzt. Ids kommen aus Deep-Links
 * (`nutritrack://product/<id>`) und Barcodes von der Kamera — beides Eingaben
 * von außen. Unkodiert könnte ein `/` oder ein `..` darin den Pfad verlassen
 * und einen anderen Endpunkt treffen als den gemeinten.
 */
export const pathSegment = (v: string) => encodeURIComponent(v);

export const endpoints = {
  diaryDay: (date: DiaryDate) => `/diary/days/${pathSegment(date)}`,
  productByBarcode: (ean: string) => `/catalog/products/by-barcode/${pathSegment(ean)}`,
  photo: (photoId: string) => `/catalog/photos/${pathSegment(photoId)}`,
  entries: (date: DiaryDate) => `/diary/days/${pathSegment(date)}/entries`,
} as const;
