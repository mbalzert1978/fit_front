import {
  pact,
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
import { register, login } from '../src/api/session';
import { setTimeProvider, resetTimeProvider } from '../src/time';
import { setLanguageProvider, resetLanguageProvider } from '../src/language';
import { __seedSession, __readSession } from './stubs/expoSecureStore';
import type { Session, SignIn, AccountUser } from '../src/api/types';

/**
 * Bedarf: `app/login.tsx` und `app/register.tsx` (beide über
 * `src/api/session.ts`), die Kontozeile in `app/(tabs)/settings.tsx` sowie die
 * 401-Behandlung in `src/api/client.ts`. Die Anmeldemaske unterscheidet genau
 * zwei Ausgänge — angemeldet oder Feld rot; deshalb dort genau ein Erfolgs- und
 * ein Fehlerfall.
 *
 * Die Registrierung hat drei Felder und braucht deshalb mehr: die vergebene
 * E-Mail als eigenen Zustand (409) und alles, was gegen eine Regel verstößt,
 * feldweise begründet (`validation-failed`). Welche Regeln das sind, steht
 * nicht hier — sie gehören dem Server, und die Maske zeigt, was er sagt.
 *
 * Und die Sprache steht als eigenes Paar da: derselbe Verstoß, einmal auf
 * Deutsch und einmal auf Englisch gefragt. Eine einzelne Interaktion könnte das
 * nicht zeigen — ihr Wortlaut ist ein Matcher, und der nimmt jede Sprache an.
 *
 * Die Antwort hat **zwei benannte Teile**: `user` ist die erzeugte Ressource,
 * `session` das Token-Paar. Die Erneuerung liefert nur `session` — sie läuft bei
 * jedem Start und soll den User-Store nicht anfassen. Die Sitzung ist nach
 * OAuth 2 benannt (`tokenType`, `expiresIn`, `refreshExpiresIn`); dass die
 * Laufzeiten heute kein Screen liest, nimmt sie nicht aus der Zusage — die Form
 * der Auth-Antwort ist Vorgabe, nicht Ableitung aus dem heutigen Bedarf; siehe
 * `docs/regeln.md` Regel 2.
 */
const provider = () => pact('nutritrack-identity');

/**
 * Die Zonenkennung, wie das Gerät sie nennt — deshalb ein Matcher und nicht
 * dieser eine Ort: zugesagt ist die Form, nicht Berlin.
 *
 * Und die Form ist bewusst weit. Der Regelfall ist `Bereich/Ort`
 * (`Europe/Berlin`), aber `UTC` ist genauso eine gültige Kennung, und Android
 * kann eine Versatz-Kennung liefern, wenn es keine benannte Zone auflöst
 * (`GMT+01:00`). Der Client normalisiert nichts — das tut der Server, und was
 * dabei herauskommt, steht in seiner Antwort. Zugesagt ist hier deshalb nur,
 * was der Client wirklich einhalten kann: nicht leer, kein Leerzeichen, nichts
 * außerhalb dieser Zeichen. Leer kommt ohnehin nicht vor — ohne Zone entsteht
 * gar keine Anfrage (`timeZoneId()` in `src/time.ts` wirft).
 */
const anyTimeZoneId = M.regex('^[A-Za-z0-9_+:/-]+$', 'Europe/Berlin');

/** Der Schlüssel entsteht in der Maske, nicht im Test — deshalb ein Matcher. */
const anyIdempotencyKey = M.uuid();

/** Der Wert, den die Maske in diesem Lauf zieht; er steht im Vertrag als Form. */
const versuchsKey = '3f2a1b0c-4d5e-4f60-8a91-b2c3d4e5f607';

const session = {
  tokenType: 'Bearer',
  accessToken: M.string('eyJhbGciOi...'),
  expiresIn: M.integer(900),
  refreshToken: M.string('rt_...'),
  refreshExpiresIn: M.integer(5184000),
};

/**
 * Das Konto, wie der Server es führt. `locale` und `timeZoneId` sind hier die
 * **wirksamen** Werte: der Server nimmt entgegen, was das Gerät nennt, und gibt
 * zurück, was daraus geworden ist.
 */
const user = {
  id: M.uuid(),
  email: M.string('a@b.de'),
  displayName: M.string('Markus'),
  locale: M.regex('de|en', 'de'),
  timeZoneId: M.string('Europe/Berlin'),
};

const daten = { email: 'a@b.de', password: 'geheim123!', displayName: 'Markus' };

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

    await p.executeTest(async () => {
      const r = await apiWithMeta<SignIn>('/identity/login', {
        method: 'POST',
        body: { email: 'a@b.de', password: 'geheim123' },
      });
      const s = r.data;
      // session.ts legt beide Token ab; ohne sie ist keine weitere Anfrage möglich.
      expect(s.session.accessToken).toBeTruthy();
      expect(s.session.refreshToken).toBeTruthy();
      // Der Tokentyp steht in der Antwort, statt im Client fest verdrahtet zu sein.
      expect(s.session.tokenType).toBe('Bearer');
      expect(s.user.id).toBeTruthy();
      // Die Request-Id darf sich zwischen Header und Rumpf nicht verschieben:
      // beide bezeichnen denselben Aufruf, sonst führt der Faden ins Leere.
      expect(r.headers.get('X-Request-Id')).toBeTruthy();
      expect(r.headers.get('X-Request-Id')).toBe(r.meta?.requestId);
      // Token gehören in keinen Zwischenspeicher.
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
        // Der `Idempotency-Key` ist der Unterschied zwischen „wir wissen nicht,
        // ob es geklappt hat" und einem zweiten Versuch, der dieselbe Antwort
        // bekommt. Ohne ihn läse ein Nutzer, dessen Antwort auf dem Rückweg
        // verlorenging, beim zweiten Tippen „E-Mail bereits registriert" —
        // vergeben von ihm selbst, eine Sekunde zuvor.
        headers: { ...jsonHeadersIn('de'), 'Idempotency-Key': anyIdempotencyKey },
        // Der Rumpf steht hier so, wie `register()` in `src/api/session.ts` ihn
        // schickt — der Test ruft die Hülle selbst auf und nicht `api()` direkt.
        // `locale` und `timeZoneId` sind Merkmale, die am Konto bleiben; deshalb
        // reisen sie im Rumpf und nicht nur als Kopfzeile, die diese eine
        // Antwort verhandelt. Beide kommen aus einer Naht: die Sprache aus
        // `src/language.ts` — dieselbe, die oben als `Accept-Language` steht —,
        // die Zone aus `src/time.ts`.
        body: { ...daten, locale: 'de', timeZoneId: anyTimeZoneId },
      })
      .willRespondWith({
        status: 201,
        // `Location` nennt die erzeugte Ressource (RFC 9110 §15.3.2). Sie hat
        // in dieser API genau einen Namen: `/identity/me`. Eine zweite,
        // id-tragende URI wäre ein Name, den niemand benutzt — kein Screen
        // liest je ein fremdes Konto.
        headers: { ...authResponseHeaders, Location: '/api/v1/identity/me' },
        // Dieselbe Nutzlast wie die Anmeldung: `app/register.tsx` führt danach
        // direkt ins Tagebuch, und dafür braucht es die Sitzung sofort. Zwei
        // Formen für dieselbe Sache gäbe es sonst ohne Not.
        body: enveloped({ user, session }),
      });

    await p.executeTest(async () => {
      const s = await register(daten, versuchsKey);
      expect(s.session.accessToken).toBeTruthy();
      expect(s.session.refreshToken).toBeTruthy();
      expect(s.session.tokenType).toBe('Bearer');
      expect(s.user.id).toBeTruthy();
      // Und die Sitzung liegt danach im Gerät — wer ein Konto anlegt, ist drin.
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
        // Hier steht der Wert selbst und kein Matcher: `GMT+01:00` **ist** die
        // Zusage. Android liefert diese Form, wenn das System keine benannte
        // Zone auflöst; der Nutzer kann dafür nichts, und ein Konto muss auch
        // dann entstehen.
        body: { ...daten, locale: 'de', timeZoneId: 'GMT+01:00' },
      })
      .willRespondWith({
        status: 201,
        headers: { ...authResponseHeaders, Location: '/api/v1/identity/me' },
        // Und hier steht die andere Hälfte der Zusage, ebenfalls als Wert: der
        // Server nimmt die Versatz-Form nicht nur an, er **normalisiert** sie
        // auf `±HH:MM` — eine der beiden Zonenformen aus RFC 9557 §4.1, die
        // andere ist der IANA-Name. Nicht auf `Etc/GMT-1`: dort ist das
        // Vorzeichen invertiert, und für halbe Stunden (`GMT+05:30`, Indien)
        // gibt es diese Zonen gar nicht.
        body: enveloped({ user: { ...user, timeZoneId: '+01:00' }, session }),
      });

    await p.executeTest(async () => {
      // Über die Naht, damit der Wert denselben Weg nimmt wie auf dem Gerät —
      // von Hand in den Rumpf geschrieben wäre es eine Zusage über nichts.
      setTimeProvider({ now: () => new Date(), timeZoneId: () => 'GMT+01:00' });
      try {
        const s = await register(daten, versuchsKey);
        // Genau dafür ist die Rückgabe da: die Anfrage war ein Wunsch, die
        // Antwort ist die Wahrheit über das Konto.
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
        body: { ...daten, locale: 'de', timeZoneId: anyTimeZoneId },
      })
      // Zwei Zusagen in einer: der `type`, an dem der Screen diesen Fall von
      // jedem sonstigen Fehlschlag unterscheidet, **und** `detail` — der Satz zu
      // genau diesem Vorfall. Kein `errors`: eine vergebene Adresse verstößt
      // gegen keine Feldregel, und RFC 9457 hat für den Satz zum Vorfall schon
      // ein Feld. Auch hier redet der Server; die Maske hat nur einen Rückfall.
      .willRespondWith(
        problem(problems.emailAlreadyRegistered, 'Diese E-Mail-Adresse ist bereits registriert', 409, {
          detail: 'Die E-Mail-Adresse a@b.de ist bereits mit einem anderen Konto verknüpft',
        }),
      );

    await p.executeTest(async () => {
      const e = await register(daten, versuchsKey).catch((err: unknown) => err);
      expect(e).toBeInstanceOf(ApiError);
      const fehler = e as ApiError;
      expect(fehler.type).toBe(problems.emailAlreadyRegistered);
      expect(fehler.detail).toEqual(expect.any(String));
    });
  });

  it('sagt feldweise, was an den Angaben nicht stimmt', async () => {
    const p = provider();
    p.given('Keine Registrierung mit a@b.de vorhanden')
      .uponReceiving('Registrierung mit ungültiger E-Mail und zu kurzem Passwort')
      .withRequest({
        method: 'POST',
        path: '/api/v1/identity/register',
        headers: { ...jsonHeadersIn('de'), 'Idempotency-Key': anyIdempotencyKey },
        body: {
          email: 'kein-at-zeichen',
          password: 'kurz',
          displayName: 'Markus',
          locale: 'de',
          timeZoneId: anyTimeZoneId,
        },
      })
      // **422 und nicht 400** (RFC 9110 §15.5.21): der Rumpf war lesbar, seine
      // Angaben waren es nicht. 400 bleibt dem kaputten Rumpf vorbehalten —
      // fehlendes Pflichtfeld, unbekanntes Feld, kaputtes JSON. Der Unterschied
      // ist keiner für Feinschmecker: bei 422 hat der Nutzer etwas falsch
      // gemacht und bekommt seine Felder angestrichen, bei 400 haben *wir*
      // etwas Falsches geschickt und ihm ist nichts vorzuwerfen.
      //
      // Bestellt ist die **Begründung je Feld**, nicht ein Sammelsatz: die Maske
      // hat drei Eingaben und muss die richtige anstreichen. Beide Verstöße
      // kommen in einer Antwort — nacheinander wäre es für den Nutzer ein
      // zweiter Fehlschlag für denselben Versuch.
      //
      // Der Wortlaut ist Matcher und nicht Wert: was genau falsch ist, weiß der
      // Server, und seine Regeln kennt die Maske nicht. Sie zeigt den Satz, den
      // sie bekommt — deshalb trägt die Anfrage `Accept-Language`.
      .willRespondWith(
        problem(problems.validationFailed, 'Die Eingabe ist ungültig', 422, {
          detail: 'Bitte überprüfen Sie die mit Fehlern markierten Felder',
          errors: {
            // Die Beispiele stehen so genau da, wie die Sätze wirklich kommen:
            // sie zeigen, welchen Platz die Maske einplanen muss.
            email: M.eachLike('Die E-Mail-Adresse benötigt genau ein @-Zeichen (gefunden: 0)'),
            password: M.eachLike('Das Passwort muss mindestens 10 Zeichen lang sein (aktuell: 4)'),
          },
        }),
      );

    await p.executeTest(async () => {
      // Die Maske hält ihre eine eigene Regel ein (`minPasswordLength`), aber
      // sie ist nicht der einzige Prüfer: hier geht bewusst vorbei, was sie
      // nicht abfangen kann.
      const e = await register({ email: 'kein-at-zeichen', password: 'kurz', displayName: 'Markus' }, versuchsKey).catch(
        (err: unknown) => err,
      );
      expect(e).toBeInstanceOf(ApiError);
      const fehler = e as ApiError;
      expect(fehler.status).toBe(422);
      expect(fehler.type).toBe(problems.validationFailed);
      // Genau das liest `app/register.tsx`: Feldname → mindestens ein Satz.
      expect(fehler.errors?.email?.[0]).toEqual(expect.any(String));
      expect(fehler.errors?.password?.[0]).toEqual(expect.any(String));
    });
  });

  it('antwortet in der Sprache, in der gefragt wurde', async () => {
    const p = provider();
    p.given('Keine Registrierung mit a@b.de vorhanden')
      .uponReceiving('Registrierung mit ungültiger E-Mail, auf Englisch gefragt')
      .withRequest({
        method: 'POST',
        path: '/api/v1/identity/register',
        // Derselbe Fall wie eben, ein Unterschied: die Sprache. Genau deshalb
        // steht er hier ein zweites Mal — an einem Paar wird sichtbar, was an
        // einer einzelnen Interaktion nicht zu sehen wäre, nämlich dass die
        // Sätze der Anfrage folgen und nicht dem Geschmack des Servers.
        headers: { ...jsonHeadersIn('en'), 'Idempotency-Key': anyIdempotencyKey },
        body: {
          email: 'kein-at-zeichen',
          password: 'kurz',
          displayName: 'Markus',
          // `locale` geht mit: es ist dieselbe Naht, die auch `Accept-Language`
          // füllt. Ein Konto, dessen Sprache eine andere wäre als die, in der
          // der Nutzer gerade liest, entsteht so gar nicht erst.
          locale: 'en',
          timeZoneId: anyTimeZoneId,
        },
      })
      // `type` ist derselbe wie im deutschen Fall — die Kennung ist eine Sache
      // des Protokolls und hat keine Sprache. Was sich ändert, sind `title`,
      // `detail` und jeder Satz in `errors`; der Client zeigt sie unverändert,
      // weil er sie nicht beurteilen kann.
      .willRespondWith(
        problem(problems.validationFailed, 'The input is invalid', 422, {
          language: 'en',
          detail: 'Please check the fields marked with errors',
          errors: {
            email: M.eachLike('The email address requires exactly one @ sign (found: 0)'),
            password: M.eachLike('The password must be at least 10 characters long (current: 4)'),
          },
        }),
      );

    await p.executeTest(async () => {
      // Über die Naht und nicht von Hand in den Rumpf: so nimmt die Sprache
      // denselben Weg wie auf dem Gerät eines englischsprachigen Nutzers.
      setLanguageProvider({ tag: () => 'en' });
      try {
        const e = await register({ email: 'kein-at-zeichen', password: 'kurz', displayName: 'Markus' }, versuchsKey).catch(
          (err: unknown) => err,
        );
        expect(e).toBeInstanceOf(ApiError);
        const fehler = e as ApiError;
        expect(fehler.type).toBe(problems.validationFailed);
        expect(fehler.errors?.email?.[0]).toEqual(expect.any(String));
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
      // Fehler tragen keinen Umschlag: problem+json bleibt, wie es ist.
      .willRespondWith(problem(problems.invalidCredentials, 'Anmeldung fehlgeschlagen', 401));

    await p.executeTest(async () => {
      await expect(login('a@b.de', 'falsch')).rejects.toMatchObject({ type: problems.invalidCredentials });
    });
  });

  it('nennt das angemeldete Konto', async () => {
    const p = provider();
    p.given('Nutzer a@b.de ist angemeldet')
      .uponReceiving('Eigenes Konto laden')
      .withRequest({ method: 'GET', path: '/api/v1/identity/me', headers: authHeadersIn('de') })
      .willRespondWith({ status: 200, headers: privateHeaders, body: enveloped(user) });

    await p.executeTest(async () => {
      // Das liest die Kontozeile in `app/(tabs)/settings.tsx`. Ohne sie wüsste
      // die App nach einem Kaltstart nicht, auf wessen Daten sie schaut — und
      // ohne einen Leser wäre dieser Endpunkt eine Zusage ohne Bedarf.
      const me = await api<AccountUser>('/identity/me');
      expect(me.displayName).toBeTruthy();
      expect(me.email).toBeTruthy();
    });
  });

  it('gibt das eigene Konto ohne gültigen Token nicht heraus', async () => {
    const p = provider();
    p.given('Access-Token ist abgelaufen')
      .uponReceiving('Eigenes Konto mit abgelaufenem Token laden')
      .withRequest({ method: 'GET', path: '/api/v1/identity/me', headers: authHeadersIn('de') })
      .willRespondWith(unauthorized());

    await p.executeTest(async () => {
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
        // **Nur** die Sitzung, kein `user`: die Erneuerung läuft bei jedem Start
        // und nach jedem abgelaufenen Access-Token. Ein Konto mitzuliefern hieße,
        // auf diesem Pfad jedes Mal den User-Store anzufassen.
        body: enveloped({ session: { ...session, refreshToken: M.string('rt_neu') } }),
      });

    await p.executeTest(async () => {
      // Diesen Aufruf macht die fetch-Hülle selbst, sobald eine Antwort 401 ist.
      const r = await apiWithMeta<{ session: Session }>('/identity/refresh', {
        method: 'POST',
        body: { refreshToken: 'rt_alt' },
      });
      expect(r.data.session.accessToken).toBeTruthy();
      expect(r.data.session.refreshToken).toBeTruthy();
      // Auch hier: derselbe Faden im Header wie im Rumpf.
      expect(r.headers.get('X-Request-Id')).toBe(r.meta?.requestId);
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

    await p.executeTest(async () => {
      __seedSession('rt_alt');
      // Abmelden ist keine örtliche Angelegenheit: ohne diesen Aufruf bliebe der
      // Refresh-Token seine volle Laufzeit gültig, und wer ihn aus einem
      // Gerätebackup zieht, käme damit weiter an die Daten.
      await signOut();
      // Und danach ist im Gerät nichts mehr übrig, woraus sich eine Sitzung
      // wiederherstellen ließe.
      expect(__readSession()).toBeNull();
    });
  });
});
