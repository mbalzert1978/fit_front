import { api, storeSession } from './client';
import { time } from '../time';
import { language } from '../language';
import type { SignIn } from './types';

export { hasSession, signOut } from './client';

/**
 * Sign-in. Only the session is stored, over the same path the renewal in
 * `client.ts` takes; arriving incomplete, it leaves no session at all rather
 * than half a one.
 */
export async function login(email: string, password: string): Promise<SignIn> {
  const signedIn = await api<SignIn>('/identity/login', { method: 'POST', body: { email, password } });
  await storeSession(signedIn.session);
  return signedIn;
}

/**
 * The one rule the form knows itself. Everything else — character classes,
 * blocked passwords, the shape of the email — the server knows and says per
 * field in `problem+json`.
 */
export const minPasswordLength = 10;

/** Upper bound of the display name. The form observes it, the server checks again. */
export const maxDisplayNameLength = 60;

/** What comes from the user; language and time zone come from the device. */
export type Registration = { email: string; password: string; displayName: string };

/**
 * The body that really goes out, assembled in exactly one place: the
 * `Idempotency-Key` hangs on the whole of it, language and zone included
 * (`docs/decisions/2026-08-21-1104-der-schluessel-haengt-am-ganzen-rumpf.md`).
 */
export type RegistrationRequest = Registration & { locale: string; timeZoneId: string };

/**
 * `locale` and `timeZoneId` are fields and not headers: `Accept-Language`
 * negotiates one response, these two stay with the account. Both come from a
 * seam — the language from `src/language.ts`, the same one that fills
 * `Accept-Language` here, the zone from `src/time.ts`, which throws rather than
 * let an account arise with a tacitly set zone.
 */
export function registrationRequest(r: Registration): RegistrationRequest {
  return { ...r, locale: language.tag(), timeZoneId: time.timeZoneId() };
}

/**
 * Registration. It delivers the same response as sign-in and creates the same
 * session — whoever creates an account is thereby signed in
 * (`docs/decisions/2026-08-20-0843-registrierung-legt-konto-und-sitzung-in-einem-aufruf-an.md`).
 *
 * The `idempotencyKey` comes from outside: only the form knows whether a second
 * attempt carries the same data. Without it a user whose response got lost on
 * the way back reads "email already registered" — taken by themselves.
 */
export async function register(request: RegistrationRequest, idempotencyKey: string): Promise<SignIn> {
  const signedIn = await api<SignIn>('/identity/register', {
    method: 'POST',
    idempotencyKey,
    body: request,
  });
  await storeSession(signedIn.session);
  return signedIn;
}
