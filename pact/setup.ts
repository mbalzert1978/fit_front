import path from 'path';
import { PactV3, MatchersV3 } from '@pact-foundation/pact';
import type { V3MockServer } from '@pact-foundation/pact';
import { useBaseUrl } from '../src/api/client';
import { problems } from '../src/api/problems';
import type { Language } from '../src/language';

/** From the app's own source and not a second literal here (`docs/regeln.md` rule 3). */
export { problems };

export const M = MatchersV3;

/** One pact per consumer/provider pair; the versioned file in ./pacts is the handover (`docs/regeln.md` rule 7). */
export function pact(provider: string) {
  return new PactV3({
    consumer: 'nutritrack-app',
    provider,
    dir: path.resolve(process.cwd(), 'pacts'),
    logLevel: 'warn',
  });
}

/**
 * Runs one interaction against its own mock server and points the client at it.
 *
 * No port is asked for, so every run gets a fresh one. A fixed port would make
 * the connection pool - which lives on `globalThis` and outlives a test file,
 * unlike the mock server - hand the next file a socket that is already closed.
 */
export function against(p: PactV3, run: (mock: V3MockServer) => Promise<unknown>) {
  return p.executeTest(async (mock) => {
    useBaseUrl(mock.url);
    return run(mock);
  });
}

const REQUEST_ID = '01JQ8Z3K7V9XW2P4M6N8R0T5YB';

/**
 * The envelope (`docs/regeln.md` rule 9). No screen reads `meta`, so it carries
 * loose matchers throughout: a new ULID or another timestamp must not break a
 * verification.
 */
export const enveloped = (data: unknown) => ({
  data,
  meta: {
    requestId: M.string(REQUEST_ID),
    timestamp: M.string('2026-08-18T09:14:22Z'),
    apiVersion: M.string('1'),
  },
});

/** JSON body, in both directions: on the request as on the response. */
export const jsonHeaders = { 'Content-Type': 'application/json' };

/**
 * Stands in **every** contract of a protected endpoint, not only where a screen
 * notices it: without it a backend serving the same endpoint unauthenticated
 * would verify green (`docs/regeln.md` rule 2).
 *
 * Not exported: only the forms **with** a language go out, because the client
 * always names one.
 */
const authHeaders = { Authorization: M.regex('Bearer .+', 'Bearer eyJ...') };

/**
 * A **fixed value** and not a matcher: an assurance about the form ("some
 * language tag") would say nothing about which language the server answers in
 * (`docs/regeln.md` rule 10).
 */
export const acceptLanguage = (tag: Language) => ({ 'Accept-Language': tag });

/** Request with a JSON body, in one language. */
export const jsonHeadersIn = (tag: Language) => ({ ...jsonHeaders, ...acceptLanguage(tag) });

/** Auth plus the language the client sends on every request. */
export const authHeadersIn = (tag: Language) => ({ ...authHeaders, ...acceptLanguage(tag) });

/** Auth on a request with a JSON body, in one language. */
export const jsonAuthHeadersIn = (tag: Language) => ({ ...authHeaders, ...jsonHeadersIn(tag) });

/**
 * Responses with personal data. Without `no-store`, NSURLCache and OkHttp put
 * the body unencrypted into the cache directory, where a backup reads it
 * without ever needing a token.
 *
 * The product catalogue is **not** among them: a curated product for a barcode
 * is the same for everyone, and caching it is wanted.
 */
export const privateHeaders = { ...jsonHeaders, 'Cache-Control': 'no-store' };

/**
 * Responses carrying tokens. Header and `meta.requestId` carry the **same
 * example**, because they name the same call. Pact cannot assure that equality
 * — a matcher knows only its own field — so the consumer test checks it against
 * the mock; towards the provider it stays a request, see Issue #30.
 */
export const authResponseHeaders = { ...privateHeaders, 'X-Request-Id': M.string(REQUEST_ID) };

/** Errors carry no envelope: `problem+json` stays as RFC 9457 describes it. */
export const problemHeaders = { 'Content-Type': 'application/problem+json' };

/**
 * The language the server answered in, as it names it: a full tag with region.
 * We ask with `de` and get `de-DE` — negotiation is his business.
 *
 * A fixed value and no matcher: that **some** language is named is no
 * assurance. Assured is that it is the one asked for.
 */
const negotiated: Record<Language, string> = { de: 'de-DE', en: 'en-US' };

/**
 * An error as an assurance, in the full RFC 9457 shape that stands in **every**
 * error assurance (`docs/regeln.md` rules 2 and 3). `type` is a fixed value:
 * the client decides on it, and another value is another kind of error.
 * `title`, `detail` and `instance` are matchers — their wording belongs to the
 * other side.
 *
 * `Content-Language` is the only part of the response that lets the negotiation
 * be **checked**: a matcher takes a German sentence as readily as an English
 * one. `language` is the language **this interaction asked in** and is repeated
 * here because the response has to carry it.
 */
export const problem = (
  type: string,
  title: string,
  status: number,
  extra?: { detail?: string; errors?: Record<string, unknown>; language?: Language },
) => ({
  status,
  headers: { ...problemHeaders, 'Content-Language': negotiated[extra?.language ?? 'de'] },
  body: {
    type,
    title: M.string(title),
    status,
    detail: M.string(extra?.detail ?? title),
    instance: M.regex('^/api/v1/.+', '/api/v1/example'),
    ...(extra?.errors ? { errors: extra.errors } : {}),
  },
});

/**
 * The whole renewal in `src/api/client.ts` hangs on this **401**: a 200 with an
 * empty body, a redirect or a 500 would run the app into a dead session without
 * it noticing. Hence the case stands in every context (`docs/regeln.md` rule 4).
 */
export const unauthorized = () => problem(problems.tokenExpired, 'Anmeldung abgelaufen', 401);

/** Someone else's resource. Without this assurance the backend would be free to serve it. */
export const forbidden = () => problem(problems.forbidden, 'Kein Zugriff auf diese Ressource', 403);
