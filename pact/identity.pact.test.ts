import {
  pact,
  against,
  M,
  enveloped,
  jsonHeadersIn,
  authHeadersIn,
  authResponseHeaders,
  privateHeaders,
  problem,
  unauthorized,
  problems,
} from './setup';
import { api, apiWithMeta, signOut, ApiError } from '../src/api/client';
import { register, registrationRequest, login, requestPasswordReset, confirmPasswordReset } from '../src/api/session';
import { setTimeProvider, resetTimeProvider } from '../src/time';
import { setLanguageProvider, resetLanguageProvider } from '../src/language';
import { __seedSession, __readSession } from './stubs/expoSecureStore';
import type { Session, SignIn, AccountUser, AccountDeletion } from '../src/api/types';

/**
 * Needed by: `app/login.tsx` and `app/register.tsx` (both through
 * `src/api/session.ts`), the account line in `app/(tabs)/settings.tsx` and the
 * 401 handling in `src/api/client.ts`.
 *
 * The sign-in form knows exactly two outcomes, hence one success and one error
 * case. Registration has three fields and needs more: the taken email as its
 * own state, and every rule violation reasoned per field.
 *
 * The language stands here as a **pair** — the same violation asked in German
 * and in English. A single interaction could not show it: its wording is a
 * matcher, and a matcher takes any language.
 */
const provider = () => pact('nutritrack-identity');

/**
 * The zone as the device names it: a matcher, because the form is assured and
 * not Berlin. The form is deliberately wide — beside `Area/City`, `UTC` is a
 * valid identifier too, and Android may deliver an offset (`GMT+01:00`) where
 * it resolves no named zone. Assured is only what the client can really keep
 * (`docs/decisions/2026-08-20-0957-die-zonenform-steht-als-matcher-die-versatz-zone-als-eigene-interaktion.md`).
 */
const anyTimeZoneId = M.regex('^[A-Za-z0-9_+:/-]+$', 'Europe/Berlin');

/** The key arises in the form, not in the test — hence a matcher. */
const anyIdempotencyKey = M.uuid();

/** The value the form draws in this run; the contract carries it as a form. */
const attemptKey = '3f2a1b0c-4d5e-4f60-8a91-b2c3d4e5f607';

/** A second attempt draws a second key; the code stays the same one. */
const secondAttemptKey = '7c1d2e3f-8a9b-4c0d-9e1f-2a3b4c5d6e70';

const session = {
  tokenType: 'Bearer',
  accessToken: M.string('eyJhbGciOi...'),
  expiresIn: M.integer(900),
  refreshToken: M.string('rt_...'),
  refreshExpiresIn: M.integer(5184000),
};

/** `locale` and `timeZoneId` are the **effective** values, not the ones asked for. */
const user = {
  id: M.uuid(),
  email: M.string('a@b.de'),
  displayName: M.string('Markus'),
  // Anchored, like every regex in this repo: Pact compares substrings, so
  // without anchors any string carrying a "de" would pass.
  locale: M.regex('^(de|en)$', 'de'),
  timeZoneId: M.string('Europe/Berlin'),
};

/**
 * The point in time from which the deletion takes effect — as a form and not as
 * a value: which day it is, the server decides. Assured is that an instant
 * comes out which `new Date(...)` can read. An `M.string()` would take "soon"
 * as well, and the account line would then read "Invalid Date" — of all things
 * on the one path that cannot be taken back.
 */
const anyInstant = M.datetime("yyyy-MM-dd'T'HH:mm:ss'Z'", '2026-09-20T09:14:22Z');

const registration = { email: 'a@b.de', password: 'geheim123!', displayName: 'Markus' };

/**
 * One character over the bound in `src/api/session.ts`. Written out and not
 * `maxPasswordLength + 1`: the contract carries the value the other side has to
 * refuse, and a constant that moves would move the assurance with it silently.
 */
const overlongPassword = 'x'.repeat(129);

describe('Identity', () => {
  it('gibt bei Anmeldung Konto und Sitzung im Umschlag zurück', async () => {
    const p = provider();
    p.given('Nutzer a@b.de existiert mit Passwort geheim123')
      .uponReceiving('Anmeldung mit gültigen Daten')
      .withRequest({
        method: 'POST',
        path: '/api/v1/identity/login',
        headers: jsonHeadersIn('de'),
        body: { email: 'a@b.de', password: 'geheim123' },
      })
      .willRespondWith({
        status: 200,
        headers: authResponseHeaders,
        body: enveloped({ user, session }),
      });

    await against(p, async () => {
      const r = await apiWithMeta<SignIn>('/identity/login', {
        method: 'POST',
        body: { email: 'a@b.de', password: 'geheim123' },
      });
      const s = r.data;
      // session.ts stores both tokens; without them no further request is possible.
      expect(s.session.accessToken).toBeTruthy();
      expect(s.session.refreshToken).toBeTruthy();
      // The token type stands in the response instead of being wired into the client.
      expect(s.session.tokenType).toBe('Bearer');
      expect(s.user.id).toBeTruthy();
      // The request id must not shift between header and body: both name the same
      // call, or the thread leads nowhere.
      expect(r.headers.get('X-Request-Id')).toBeTruthy();
      expect(r.headers.get('X-Request-Id')).toBe(r.meta?.requestId);
      // Tokens belong in no cache.
      expect(r.headers.get('Cache-Control')).toBe('no-store');
    });
  });

  it('legt ein Konto an und gibt dieselbe Sitzung zurück wie die Anmeldung', async () => {
    const p = provider();
    p.given('Keine Registrierung mit a@b.de vorhanden')
      .uponReceiving('Registrierung mit freier E-Mail')
      .withRequest({
        method: 'POST',
        path: '/api/v1/identity/register',
        // Without the key a user whose response got lost on the way back would
        // read "email already registered" on the second try — taken by
        // themselves, a second earlier.
        headers: { ...jsonHeadersIn('de'), 'Idempotency-Key': anyIdempotencyKey },
        // The body as `register()` sends it: the test calls the wrapper itself
        // and not `api()`. `locale` and `timeZoneId` are traits that stay with
        // the account, so they travel in the body and not only as a header that
        // negotiates this one response.
        body: { ...registration, locale: 'de', timeZoneId: anyTimeZoneId },
      })
      .willRespondWith({
        status: 201,
        // `Location` names the created resource (RFC 9110 §15.3.2), and it has
        // exactly one name in this API — an id-carrying URI would be a name
        // nobody uses.
        headers: { ...authResponseHeaders, Location: '/api/v1/identity/me' },
        // The same payload as sign-in: `app/register.tsx` goes straight to the
        // diary afterwards and needs the session at once.
        body: enveloped({ user, session }),
      });

    await against(p, async () => {
      const s = await register(registrationRequest(registration), attemptKey);
      expect(s.session.accessToken).toBeTruthy();
      expect(s.session.refreshToken).toBeTruthy();
      expect(s.session.tokenType).toBe('Bearer');
      expect(s.user.id).toBeTruthy();
      // And the session lies on the device afterwards — creating an account signs you in.
      expect(__readSession()).toBeTruthy();
    });
  });

  it('nimmt eine Zone ohne Ortsnamen an und gibt die wirksame zurück', async () => {
    const p = provider();
    p.given('Keine Registrierung mit a@b.de vorhanden')
      .uponReceiving('Registrierung mit einer Versatz-Zone')
      .withRequest({
        method: 'POST',
        path: '/api/v1/identity/register',
        headers: { ...jsonHeadersIn('de'), 'Idempotency-Key': anyIdempotencyKey },
        // The value itself and no matcher: `GMT+01:00` **is** the assurance.
        // Android delivers this form where it resolves no named zone, and an
        // account has to come about then too.
        body: { ...registration, locale: 'de', timeZoneId: 'GMT+01:00' },
      })
      .willRespondWith({
        status: 201,
        headers: { ...authResponseHeaders, Location: '/api/v1/identity/me' },
        // The other half of the assurance, also as a value: the server
        // **normalises** the offset to `±HH:MM` — one of the two zone forms in
        // RFC 9557 §4.1. Not to `Etc/GMT-1`, where the sign is inverted and
        // half-hour offsets have no zone at all.
        body: enveloped({ user: { ...user, timeZoneId: '+01:00' }, session }),
      });

    await against(p, async () => {
      // Through the seam, so the value takes the same path as on the device —
      // written into the body by hand it would assure nothing.
      setTimeProvider({ now: () => new Date(), timeZoneId: () => 'GMT+01:00' });
      try {
        const s = await register(registrationRequest(registration), attemptKey);
        // The request was a wish, the response is the truth about the account.
        expect(s.user.timeZoneId).toBe('+01:00');
      } finally {
        resetTimeProvider();
      }
    });
  });

  it('lehnt eine schon vergebene E-Mail mit 409 ab', async () => {
    const p = provider();
    p.given('Nutzer a@b.de existiert mit Passwort geheim123')
      .uponReceiving('Registrierung mit vergebener E-Mail')
      .withRequest({
        method: 'POST',
        path: '/api/v1/identity/register',
        headers: { ...jsonHeadersIn('de'), 'Idempotency-Key': anyIdempotencyKey },
        body: { ...registration, locale: 'de', timeZoneId: anyTimeZoneId },
      })
      // Two assurances in one: the `type` the screen tells this case apart by,
      // and `detail`. No `errors` — a taken address violates no field rule.
      .willRespondWith(
        problem(problems.emailAlreadyRegistered, 'Diese E-Mail-Adresse ist bereits registriert', 409, {
          detail: 'Die E-Mail-Adresse a@b.de ist bereits mit einem anderen Konto verknüpft',
        }),
      );

    await against(p, async () => {
      const e = await register(registrationRequest(registration), attemptKey).catch((err: unknown) => err);
      expect(e).toBeInstanceOf(ApiError);
      const error = e as ApiError;
      expect(error.type).toBe(problems.emailAlreadyRegistered);
      expect(error.detail).toEqual(expect.any(String));
    });
  });

  it('prüft die Felder, bevor es die vergebene Adresse bemerkt', async () => {
    const p = provider();
    // The same state as the 409 above, word for word: a second wording would be
    // a second state the provider has to be able to produce.
    p.given('Nutzer a@b.de existiert mit Passwort geheim123')
      .uponReceiving('Registrierung mit vergebener E-Mail und zugleich ungültigen Feldern')
      .withRequest({
        method: 'POST',
        path: '/api/v1/identity/register',
        headers: { ...jsonHeadersIn('de'), 'Idempotency-Key': anyIdempotencyKey },
        // Taken address **and** two field violations in one body: only this
        // combination can tell the two checks apart.
        body: { ...registration, password: 'kurz', displayName: 'a', locale: 'de', timeZoneId: anyTimeZoneId },
      })
      // **422 and not 409** — that is the whole point of this interaction.
      // Without it the order of the two checks is open, and the backend would
      // be free to answer 409 first. Then `password: "kurz"` becomes an oracle:
      // whoever gets 422 knows the address is free, whoever gets 409 knows it
      // is taken — and learns it without ever sending a password that could
      // create an account.
      .willRespondWith(
        problem(problems.validationFailed, 'Die Eingabe ist ungültig', 422, {
          detail: 'Bitte überprüfen Sie die mit Fehlern markierten Felder',
          errors: {
            // No `email` entry: the address itself breaks no field rule. That
            // it is taken stays unsaid here — it is the conflict check's word,
            // and that one has not run yet.
            password: M.eachLike('Das Passwort muss mindestens 10 Zeichen lang sein (aktuell: 4)'),
            displayName: M.eachLike('Der Name muss mindestens 2 Zeichen lang sein (aktuell: 1)'),
          },
        }),
      );

    await against(p, async () => {
      const e = await register(registrationRequest({ email: registration.email, password: 'kurz', displayName: 'a' }), attemptKey).catch(
        (err: unknown) => err,
      );
      expect(e).toBeInstanceOf(ApiError);
      const error = e as ApiError;
      expect(error.status).toBe(422);
      expect(error.type).toBe(problems.validationFailed);
      // Explicitly **not** the conflict: field validation comes first.
      expect(error.type).not.toBe(problems.emailAlreadyRegistered);
      expect(error.errors?.password?.[0]).toEqual(expect.any(String));
      expect(error.errors?.displayName?.[0]).toEqual(expect.any(String));
    });
  });

  it('sagt feldweise, was an den Angaben nicht stimmt', async () => {
    const p = provider();
    p.given('Keine Registrierung mit a@b.de vorhanden')
      .uponReceiving('Registrierung mit ungültiger E-Mail, zu kurzem Passwort und zu kurzem Namen')
      .withRequest({
        method: 'POST',
        path: '/api/v1/identity/register',
        headers: { ...jsonHeadersIn('de'), 'Idempotency-Key': anyIdempotencyKey },
        body: {
          email: 'kein-at-zeichen',
          password: 'kurz',
          // A name the form cannot judge: too short is a rule of the server.
          displayName: 'a',
          locale: 'de',
          timeZoneId: anyTimeZoneId,
        },
      })
      // **422 and not 400** (RFC 9110 §15.5.21): the body was readable, its
      // data was not
      // (`docs/decisions/2026-08-20-1248-regelverstoesse-sind-422-der-kaputte-rumpf-bleibt-400.md`).
      // Ordered is the reasoning **per field**, not one collected sentence: the
      // form has three inputs and has to mark the right one. Both violations
      // come in one response — one after the other would be a second failure
      // for the same attempt.
      .willRespondWith(
        problem(problems.validationFailed, 'Die Eingabe ist ungültig', 422, {
          detail: 'Bitte überprüfen Sie die mit Fehlern markierten Felder',
          errors: {
            // The examples stand as precisely as the sentences really arrive:
            // they show how much room the form has to plan for.
            email: M.eachLike('Die E-Mail-Adresse benötigt genau ein @-Zeichen (gefunden: 0)'),
            password: M.eachLike('Das Passwort muss mindestens 10 Zeichen lang sein (aktuell: 4)'),
            // The third key stands in the contract because the form marks three
            // fields. Left open, the other side could call it `name` — green
            // verification, silent name field.
            displayName: M.eachLike('Der Name muss mindestens 2 Zeichen lang sein (aktuell: 1)'),
          },
        }),
      );

    await against(p, async () => {
      // The form keeps its one own rule, but it is not the only judge: what it
      // cannot catch deliberately goes past here.
      const e = await register(registrationRequest({ email: 'kein-at-zeichen', password: 'kurz', displayName: 'a' }), attemptKey).catch(
        (err: unknown) => err,
      );
      expect(e).toBeInstanceOf(ApiError);
      const error = e as ApiError;
      expect(error.status).toBe(422);
      expect(error.type).toBe(problems.validationFailed);
      // Exactly what `app/register.tsx` reads: field name → at least one sentence.
      expect(error.errors?.email?.[0]).toEqual(expect.any(String));
      expect(error.errors?.password?.[0]).toEqual(expect.any(String));
      expect(error.errors?.displayName?.[0]).toEqual(expect.any(String));
    });
  });

  it('antwortet in der Sprache, in der gefragt wurde', async () => {
    const p = provider();
    p.given('Keine Registrierung mit a@b.de vorhanden')
      .uponReceiving('Registrierung mit ungültigen Angaben, auf Englisch gefragt')
      .withRequest({
        method: 'POST',
        path: '/api/v1/identity/register',
        // The same case as above with one difference, the language: only a pair
        // shows that the sentences follow the request and not the server's taste.
        headers: { ...jsonHeadersIn('en'), 'Idempotency-Key': anyIdempotencyKey },
        body: {
          email: 'kein-at-zeichen',
          password: 'kurz',
          // A name the form cannot judge: too short is a rule of the server.
          displayName: 'a',
          // `locale` travels along from the same seam that fills
          // `Accept-Language`: an account whose language differs from the one
          // the user is reading in cannot come about.
          locale: 'en',
          timeZoneId: anyTimeZoneId,
        },
      })
      // The same `type` as in the German case: an identifier belongs to the
      // protocol and has no language. `title`, `detail` and `errors` change.
      .willRespondWith(
        problem(problems.validationFailed, 'The input is invalid', 422, {
          language: 'en',
          detail: 'Please check the fields marked with errors',
          errors: {
            email: M.eachLike('The email address requires exactly one @ sign (found: 0)'),
            password: M.eachLike('The password must be at least 10 characters long (current: 4)'),
            displayName: M.eachLike('The name must be at least 2 characters long (current: 1)'),
          },
        }),
      );

    await against(p, async () => {
      // Through the seam, so the language takes the same path as on the device
      // of an English-speaking user.
      setLanguageProvider({ tag: () => 'en' });
      try {
        const e = await register(registrationRequest({ email: 'kein-at-zeichen', password: 'kurz', displayName: 'a' }), attemptKey).catch(
          (err: unknown) => err,
        );
        expect(e).toBeInstanceOf(ApiError);
        const error = e as ApiError;
        // As explicit as in the German case: 422 is the assurance, not 400, and
        // it holds in both languages alike.
        expect(error.status).toBe(422);
        expect(error.type).toBe(problems.validationFailed);
        expect(error.errors?.email?.[0]).toEqual(expect.any(String));
      } finally {
        resetLanguageProvider();
      }
    });
  });

  it('lehnt falsche Daten mit 401 ab', async () => {
    const p = provider();
    p.given('Nutzer a@b.de existiert mit Passwort geheim123')
      .uponReceiving('Anmeldung mit falschem Passwort')
      .withRequest({
        method: 'POST',
        path: '/api/v1/identity/login',
        headers: jsonHeadersIn('de'),
        body: { email: 'a@b.de', password: 'falsch' },
      })
      // Errors carry no envelope: problem+json stays as it is.
      .willRespondWith(problem(problems.invalidCredentials, 'Anmeldung fehlgeschlagen', 401));

    await against(p, async () => {
      await expect(login('a@b.de', 'falsch')).rejects.toMatchObject({ type: problems.invalidCredentials });
    });
  });

  it('nennt das angemeldete Konto', async () => {
    const p = provider();
    p.given('Nutzer a@b.de ist angemeldet')
      .uponReceiving('Eigenes Konto laden')
      .withRequest({ method: 'GET', path: '/api/v1/identity/me', headers: authHeadersIn('de') })
      .willRespondWith({ status: 200, headers: privateHeaders, body: enveloped(user) });

    await against(p, async () => {
      // Read by the account line in `app/(tabs)/settings.tsx` — without a
      // reader this endpoint would be an assurance nobody needs.
      const me = await api<AccountUser>('/identity/me');
      expect(me.displayName).toBeTruthy();
      expect(me.email).toBeTruthy();
    });
  });

  it('lehnt ein Passwort über der Obergrenze feldweise ab', async () => {
    const p = provider();
    p.given('Keine Registrierung mit a@b.de vorhanden')
      .uponReceiving('Registrierung mit einem Passwort über der Obergrenze')
      .withRequest({
        method: 'POST',
        path: '/api/v1/identity/register',
        headers: { ...jsonHeadersIn('de'), 'Idempotency-Key': anyIdempotencyKey },
        body: { ...registration, password: overlongPassword, locale: 'de', timeZoneId: anyTimeZoneId },
      })
      // Without an upper bound the caller picks how much work the other side
      // does per attempt: a megabyte of password is one hash over a megabyte,
      // and a handful of requests is a machine. **422** and not 400 — the body
      // is readable, the value in it breaks a rule, and the form has a field to
      // mark for it. The bound itself is the assurance, not the wording.
      .willRespondWith(
        problem(problems.validationFailed, 'Die Eingabe ist ungültig', 422, {
          detail: 'Bitte überprüfen Sie die mit Fehlern markierten Felder',
          errors: {
            password: M.eachLike('Das Passwort darf höchstens 128 Zeichen lang sein (aktuell: 129)'),
          },
        }),
      );

    await against(p, async () => {
      // Past the form on purpose: it keeps the bound itself, and the contract
      // exists precisely because it must not be the only one who does.
      const e = await register(registrationRequest({ ...registration, password: overlongPassword }), attemptKey).catch(
        (err: unknown) => err,
      );
      expect(e).toBeInstanceOf(ApiError);
      const error = e as ApiError;
      expect(error.status).toBe(422);
      expect(error.errors?.password?.[0]).toEqual(expect.any(String));
    });
  });

  it('gibt auf einen schon vergebenen Schlüssel mit anderem Rumpf keine zweite Antwort', async () => {
    const p = provider();
    p.given('Unter dem Registrierungs-Schlüssel liegt schon ein Versuch mit anderem Rumpf')
      .uponReceiving('Registrierung unter einem schon vergebenen Schlüssel')
      .withRequest({
        method: 'POST',
        path: '/api/v1/identity/register',
        // The key as a **value** and no matcher: the state names the key that
        // was spent, and the assurance is about this one and no other.
        headers: { ...jsonHeadersIn('de'), 'Idempotency-Key': attemptKey },
        body: { ...registration, password: 'einanderes123!', locale: 'de', timeZoneId: anyTimeZoneId },
      })
      // No screen tells this case apart, and the form cannot produce it — the
      // key hangs on the whole body. It stands here for what the other side
      // would otherwise be free to do: **replay** the first response. The user
      // corrects their password, tries again, reads 201 and a session — and the
      // account carries the password from the first attempt, which they never
      // learn. **409** and not 400: the body is sound, the state it lands in is
      // not.
      .willRespondWith(
        problem(problems.idempotencyKeyReused, 'Dieser Schlüssel gehört zu einem anderen Versuch', 409, {
          detail: 'Unter diesem Idempotency-Key wurde bereits ein Aufruf mit anderem Inhalt beantwortet',
        }),
      );

    await against(p, async () => {
      const e = await register(registrationRequest({ ...registration, password: 'einanderes123!' }), attemptKey).catch(
        (err: unknown) => err,
      );
      expect(e).toBeInstanceOf(ApiError);
      const error = e as ApiError;
      expect(error.status).toBe(409);
      expect(error.type).toBe(problems.idempotencyKeyReused);
    });
  });

  it('lässt ein frisch angelegtes Konto sofort an seine eigenen Daten', async () => {
    const p = provider();
    // Its own state: the account exists, its address was never proven. The
    // session out of `/identity/register` is the only thing standing behind it.
    p.given('Nutzer a@b.de ist frisch registriert und hat seine Adresse nicht bestätigt')
      .uponReceiving('Eigenes Konto direkt nach der Registrierung laden')
      .withRequest({ method: 'GET', path: '/api/v1/identity/me', headers: authHeadersIn('de') })
      // Without this assurance the backend would be free to hold an unconfirmed
      // account at arm's length — a 403 here, and the diary the screen jumps to
      // after registering would stand empty with no way forward. What a proof
      // of address changes about this is a decision of its own
      // (`docs/decisions/2026-08-22-1520-die-registrierung-liefert-eine-sitzung-ohne-nachweis-ueber-die-adresse.md`).
      .willRespondWith({ status: 200, headers: privateHeaders, body: enveloped(user) });

    await against(p, async () => {
      const me = await api<AccountUser>('/identity/me');
      expect(me.email).toBeTruthy();
    });
  });

  it('gibt das eigene Konto ohne gültigen Token nicht heraus', async () => {
    const p = provider();
    p.given('Access-Token ist abgelaufen')
      .uponReceiving('Eigenes Konto mit abgelaufenem Token laden')
      .withRequest({ method: 'GET', path: '/api/v1/identity/me', headers: authHeadersIn('de') })
      .willRespondWith(unauthorized());

    await against(p, async () => {
      await expect(api('/identity/me')).rejects.toMatchObject({ type: problems.tokenExpired, status: 401 });
    });
  });

  it('tauscht einen Refresh-Token gegen ein neues Paar', async () => {
    const p = provider();
    p.given('Nutzer hat einen gültigen Refresh-Token')
      .uponReceiving('Sitzung erneuern')
      .withRequest({
        method: 'POST',
        path: '/api/v1/identity/refresh',
        headers: jsonHeadersIn('de'),
        body: { refreshToken: M.string('rt_...') },
      })
      .willRespondWith({
        status: 200,
        headers: authResponseHeaders,
        // **Only** the session, no `user`: the renewal runs at every startup and
        // is not meant to touch the user store.
        body: enveloped({ session: { ...session, refreshToken: M.string('rt_neu') } }),
      });

    await against(p, async () => {
      // The fetch wrapper makes this call itself as soon as a response is 401.
      const r = await apiWithMeta<{ session: Session }>('/identity/refresh', {
        method: 'POST',
        body: { refreshToken: 'rt_alt' },
      });
      expect(r.data.session.accessToken).toBeTruthy();
      expect(r.data.session.refreshToken).toBeTruthy();
      // Here too: the same thread in the header as in the body.
      expect(r.headers.get('X-Request-Id')).toBe(r.meta?.requestId);
    });
  });

  it('nimmt die Kontolöschung an und nennt die Frist', async () => {
    const p = provider();
    p.given('Nutzer a@b.de ist angemeldet')
      .uponReceiving('Eigenes Konto löschen')
      // No `Idempotency-Key`
      // (`docs/decisions/2026-08-21-1329-die-kontoloeschung-nennt-ihre-frist.md`).
      .withRequest({ method: 'DELETE', path: '/api/v1/identity/me', headers: authHeadersIn('de') })
      .willRespondWith({
        // **202 and not 204**, with the instant in the body
        // (`docs/decisions/2026-08-21-1329-die-kontoloeschung-nennt-ihre-frist.md`).
        status: 202,
        headers: privateHeaders,
        body: enveloped({ deletionEffectiveUtc: anyInstant }),
      });

    await against(p, async () => {
      // This is what the account section in `app/(tabs)/settings.tsx` reads: it
      // shows the deadline and ends the session only on a second tap, see
      // `docs/decisions/2026-08-21-1329-die-kontoloeschung-nennt-ihre-frist.md`.
      const q = await api<AccountDeletion>('/identity/me', { method: 'DELETE' });
      expect(Number.isNaN(Date.parse(q.deletionEffectiveUtc))).toBe(false);
    });
  });

  it('löscht kein Konto ohne gültigen Token', async () => {
    const p = provider();
    p.given('Access-Token ist abgelaufen')
      .uponReceiving('Eigenes Konto mit abgelaufenem Token löschen')
      .withRequest({ method: 'DELETE', path: '/api/v1/identity/me', headers: authHeadersIn('de') })
      .willRespondWith(unauthorized());

    await against(p, async () => {
      await expect(api('/identity/me', { method: 'DELETE' })).rejects.toMatchObject({ type: problems.tokenExpired, status: 401 });
    });
  });

  /**
   * Password reset — the way back into an account nobody can sign in to
   * (`docs/decisions/2026-08-22-1100-passwort-vergessen-laeuft-ueber-einen-code-und-antwortet-immer-gleich.md`).
   * Read by `app/reset.tsx`, which asks in two steps.
   */
  it('nimmt die Anforderung eines Codes an', async () => {
    const p = provider();
    p.given('Nutzer a@b.de existiert mit Passwort geheim123')
      .uponReceiving('Code zum Zuruecksetzen anfordern')
      .withRequest({
        method: 'POST',
        path: '/api/v1/identity/password-reset',
        // No `Idempotency-Key`: whoever asks twice wants a second mail.
        headers: jsonHeadersIn('de'),
        body: { email: 'a@b.de' },
      })
      // **204 and not 202 with a body**: there is nothing to report that the
      // asker may know — every field would be a field telling on the account.
      .willRespondWith({ status: 204 });

    await against(p, async () => {
      await expect(requestPasswordReset('a@b.de')).resolves.toBeUndefined();
    });
  });

  it('antwortet auf eine unbekannte E-Mail genauso', async () => {
    const p = provider();
    // **This** interaction is the decision. Without it the backend could answer
    // honestly here and still verify green — and the endpoint would be a
    // directory: whoever tries a list of addresses learns for each one whether
    // it has an account here.
    p.given('Keine Registrierung mit unbekannt@b.de vorhanden')
      .uponReceiving('Code fuer eine unbekannte E-Mail anfordern')
      .withRequest({
        method: 'POST',
        path: '/api/v1/identity/password-reset',
        headers: jsonHeadersIn('de'),
        body: { email: 'unbekannt@b.de' },
      })
      .willRespondWith({ status: 204 });

    await against(p, async () => {
      await expect(requestPasswordReset('unbekannt@b.de')).resolves.toBeUndefined();
    });
  });

  it('loest den Code ein und gibt keine Sitzung zurueck', async () => {
    const p = provider();
    p.given('Fuer a@b.de ist ein Code zum Zuruecksetzen angefordert')
      .uponReceiving('Code einloesen und neues Passwort setzen')
      .withRequest({
        method: 'POST',
        path: '/api/v1/identity/password-reset/confirm',
        // The key hangs on the whole body: the code burns, and a lost response
        // would otherwise read "code invalid" on a password already set.
        headers: { ...jsonHeadersIn('de'), 'Idempotency-Key': anyIdempotencyKey },
        body: { email: 'a@b.de', code: '482913', password: 'neuesGeheim1!' },
      })
      // 204: no session comes back. Whoever chose a password uses it once.
      .willRespondWith({ status: 204 });

    await against(p, async () => {
      const request = { email: 'a@b.de', code: '482913', password: 'neuesGeheim1!' };
      // Nothing comes back: no session to store, hence the sign-in form follows.
      await expect(confirmPasswordReset(request, attemptKey)).resolves.toBeUndefined();
    });
  });

  it('lehnt einen falschen Code mit 401 ab', async () => {
    const p = provider();
    p.given('Fuer a@b.de ist ein Code zum Zuruecksetzen angefordert')
      .uponReceiving('Code einloesen mit falschem Code')
      .withRequest({
        method: 'POST',
        path: '/api/v1/identity/password-reset/confirm',
        headers: { ...jsonHeadersIn('de'), 'Idempotency-Key': anyIdempotencyKey },
        body: { email: 'a@b.de', code: '000000', password: 'neuesGeheim1!' },
      })
      // The known identifier and no new one: the code **is** a credential, and a
      // second name for the same thing is a second name to keep in step.
      .willRespondWith(problem(problems.invalidCredentials, 'Der Code ist ungültig oder abgelaufen', 401));

    await against(p, async () => {
      const request = { email: 'a@b.de', code: '000000', password: 'neuesGeheim1!' };
      await expect(confirmPasswordReset(request, attemptKey)).rejects.toMatchObject({
        type: problems.invalidCredentials,
        status: 401,
      });
    });
  });

  it('sagt beim Zuruecksetzen feldweise, was am Passwort nicht stimmt', async () => {
    const p = provider();
    p.given('Fuer a@b.de ist ein Code zum Zuruecksetzen angefordert')
      .uponReceiving('Code einloesen mit zu kurzem Passwort')
      .withRequest({
        method: 'POST',
        path: '/api/v1/identity/password-reset/confirm',
        headers: { ...jsonHeadersIn('de'), 'Idempotency-Key': anyIdempotencyKey },
        body: { email: 'a@b.de', code: '482913', password: 'kurz' },
      })
      // 422 and per field, as everywhere: `app/reset.tsx` marks the password
      // field and shows the server's sentence at it.
      .willRespondWith(
        problem(problems.validationFailed, 'Die Eingabe ist ungültig', 422, {
          detail: 'Bitte überprüfen Sie die mit Fehlern markierten Felder',
          errors: { password: M.eachLike('Das Passwort muss mindestens 10 Zeichen lang sein (aktuell: 4)') },
        }),
      );

    await against(p, async () => {
      const request = { email: 'a@b.de', code: '482913', password: 'kurz' };
      const e = await confirmPasswordReset(request, attemptKey).catch((err: unknown) => err);
      expect(e).toBeInstanceOf(ApiError);
      const error = e as ApiError;
      expect(error.status).toBe(422);
      // Exactly what the screen reads: field name onto at least one sentence.
      expect(error.errors?.password?.[0]).toEqual(expect.any(String));
    });
  });

  it('beendet die alten Sitzungen mit dem Zuruecksetzen', async () => {
    const p = provider();
    // Without this interaction the provider may let the old sessions run on: a
    // stolen refresh token would survive the very act meant to get rid of it,
    // and the reset would take back the password without taking back the access.
    p.given('Fuer a@b.de ist ein Code eingeloest')
      .uponReceiving('Sitzung mit einem Refresh-Token von vor dem Zuruecksetzen erneuern')
      .withRequest({
        method: 'POST',
        path: '/api/v1/identity/refresh',
        headers: jsonHeadersIn('de'),
        body: { refreshToken: M.string('rt_vor_dem_zuruecksetzen') },
      })
      .willRespondWith(unauthorized());

    await against(p, async () => {
      await expect(
        apiWithMeta<{ session: Session }>('/identity/refresh', { method: 'POST', body: { refreshToken: 'rt_vor_dem_zuruecksetzen' } }),
      ).rejects.toMatchObject({ type: problems.tokenExpired, status: 401 });
    });
  });

  it('gibt beim Einloesen kein Verzeichnis her', async () => {
    const p = provider();
    // The protection against enumeration stands only at `/password-reset`. Left
    // out here, a `404 "kein Konto"` at the second endpoint verifies green — and
    // the same list of addresses is answered one call further along.
    p.given('Keine Registrierung mit unbekannt@b.de vorhanden')
      .uponReceiving('Code einloesen fuer eine unbekannte E-Mail')
      .withRequest({
        method: 'POST',
        path: '/api/v1/identity/password-reset/confirm',
        headers: { ...jsonHeadersIn('de'), 'Idempotency-Key': anyIdempotencyKey },
        body: { email: 'unbekannt@b.de', code: '482913', password: 'neuesGeheim1!' },
      })
      // The **same** answer as for a wrong code, down to the identifier.
      .willRespondWith(problem(problems.invalidCredentials, 'Der Code ist ungültig oder abgelaufen', 401));

    await against(p, async () => {
      const request = { email: 'unbekannt@b.de', code: '482913', password: 'neuesGeheim1!' };
      await expect(confirmPasswordReset(request, attemptKey)).rejects.toMatchObject({
        type: problems.invalidCredentials,
        status: 401,
      });
    });
  });

  it('prueft den Code vor den Feldern', async () => {
    const p = provider();
    // The two error cases above each change one thing at a time and leave the
    // order open. Checking the fields first makes a deliberately short password
    // an oracle for the code: the 422 tells the code was right, and a rejected
    // body does not burn it — the attempt is free and repeatable.
    p.given('Fuer a@b.de ist ein Code zum Zuruecksetzen angefordert')
      .uponReceiving('Code einloesen mit falschem Code und zu kurzem Passwort')
      .withRequest({
        method: 'POST',
        path: '/api/v1/identity/password-reset/confirm',
        headers: { ...jsonHeadersIn('de'), 'Idempotency-Key': anyIdempotencyKey },
        body: { email: 'a@b.de', code: '000000', password: 'kurz' },
      })
      // 401 and not 422: the credential decides, the fields come after.
      .willRespondWith(problem(problems.invalidCredentials, 'Der Code ist ungültig oder abgelaufen', 401));

    await against(p, async () => {
      const request = { email: 'a@b.de', code: '000000', password: 'kurz' };
      await expect(confirmPasswordReset(request, attemptKey)).rejects.toMatchObject({
        type: problems.invalidCredentials,
        status: 401,
      });
    });
  });

  it('verbrennt den Code beim Einloesen', async () => {
    const p = provider();
    // That the code is used up stood only in a comment. The **different** key is
    // the point: on the same key and the same body the server would repeat its
    // stored first answer, and a code valid for ever would verify green.
    p.given('Der Code 482913 wurde bereits eingeloest')
      .uponReceiving('Denselben Code ein zweites Mal einloesen')
      .withRequest({
        method: 'POST',
        path: '/api/v1/identity/password-reset/confirm',
        headers: { ...jsonHeadersIn('de'), 'Idempotency-Key': anyIdempotencyKey },
        body: { email: 'a@b.de', code: '482913', password: 'nochEinAnderes1!' },
      })
      .willRespondWith(problem(problems.invalidCredentials, 'Der Code ist ungültig oder abgelaufen', 401));

    await against(p, async () => {
      const request = { email: 'a@b.de', code: '482913', password: 'nochEinAnderes1!' };
      await expect(confirmPasswordReset(request, secondAttemptKey)).rejects.toMatchObject({
        type: problems.invalidCredentials,
        status: 401,
      });
    });
  });

  it('entwertet den Refresh-Token beim Abmelden', async () => {
    const p = provider();
    p.given('Nutzer hat einen gültigen Refresh-Token')
      .uponReceiving('Abmelden')
      .withRequest({
        method: 'POST',
        path: '/api/v1/identity/logout',
        headers: jsonHeadersIn('de'),
        body: { refreshToken: M.string('rt_...') },
      })
      .willRespondWith({ status: 204 });

    await against(p, async () => {
      __seedSession('rt_alt');
      // Signing out is not a local matter: without this call the refresh token
      // stays valid for its full lifetime, and a device backup still carries it.
      await signOut();
      // And nothing is left on the device to restore a session from.
      expect(__readSession()).toBeNull();
    });
  });
});
