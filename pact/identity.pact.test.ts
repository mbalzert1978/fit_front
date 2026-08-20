import { pact, M, enveloped, jsonHeaders, germanJsonHeaders, authResponseHeaders, problem } from './setup';
import { api, apiWithMeta, signOut, ApiError } from '../src/api/client';
import { register } from '../src/api/session';
import { setTimeProvider, resetTimeProvider } from '../src/time';
import { __seedSession, __readSession } from './stubs/expoSecureStore';
import type { AuthTokens } from '../src/api/types';

/**
 * Bedarf: `app/login.tsx` und `app/register.tsx` (beide über
 * `src/api/session.ts`) sowie die 401-Behandlung in `src/api/client.ts`. Die
 * Anmeldemaske unterscheidet genau zwei Ausgänge — angemeldet oder Feld rot;
 * deshalb dort genau ein Erfolgs- und ein Fehlerfall.
 *
 * Die Registrierung hat drei Felder und braucht deshalb mehr: die vergebene
 * E-Mail als eigenen Zustand (409) und alles, was gegen eine Regel verstößt,
 * feldweise begründet (`validation-failed`). Welche Regeln das sind, steht
 * nicht hier — sie gehören dem Server, und die Maske zeigt, was er sagt.
 *
 * Die Token-Antwort ist nach OAuth 2 benannt: `tokenType`, `expiresIn` und
 * `refreshExpiresIn` in Sekunden, die Identität als `user.id`. Dass die
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
 * (`GMT+01:00`). Der Client normalisiert nichts — er hat keine zweite Quelle,
 * die es besser wüsste. Zugesagt ist deshalb nur, was er wirklich einhalten
 * kann: nicht leer, kein Leerzeichen, nichts außerhalb dieser Zeichen. Leer
 * kommt ohnehin nicht vor — ohne Zone entsteht gar keine Anfrage
 * (`timeZoneId()` in `src/time.ts` wirft).
 */
const anyTimeZoneId = M.regex('^[A-Za-z0-9_+:/-]+$', 'Europe/Berlin');

const tokenPair = {
  tokenType: 'Bearer',
  accessToken: M.string('eyJhbGciOi...'),
  expiresIn: M.integer(900),
  refreshToken: M.string('rt_...'),
  refreshExpiresIn: M.integer(5184000),
  user: { id: M.uuid() },
};

describe('Identity', () => {
  it('gibt bei Anmeldung ein Token-Paar im Umschlag zurück', async () => {
    const p = provider();
    p.given('Nutzer a@b.de existiert mit Passwort geheim123')
      .uponReceiving('Anmeldung mit gültigen Daten')
      .withRequest({
        method: 'POST',
        path: '/api/v1/identity/login',
        headers: jsonHeaders,
        body: { email: 'a@b.de', password: 'geheim123' },
      })
      .willRespondWith({
        status: 200,
        headers: authResponseHeaders,
        body: enveloped(tokenPair),
      });

    await p.executeTest(async () => {
      const r = await apiWithMeta<AuthTokens>('/identity/login', {
        method: 'POST',
        body: { email: 'a@b.de', password: 'geheim123' },
      });
      const s = r.data;
      // session.ts legt beide Token ab; ohne sie ist keine weitere Anfrage möglich.
      expect(s.accessToken).toBeTruthy();
      expect(s.refreshToken).toBeTruthy();
      // Der Tokentyp steht in der Antwort, statt im Client fest verdrahtet zu sein.
      expect(s.tokenType).toBe('Bearer');
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
        headers: germanJsonHeaders,
        // Der Rumpf steht hier so, wie `register()` in `src/api/session.ts` ihn
        // schickt — der Test ruft die Hülle selbst auf und nicht `api()` direkt.
        // `locale` und `timeZoneId` sind Merkmale, die am Konto bleiben; deshalb
        // reisen sie im Rumpf und nicht in `Accept-Language`, das nur diese eine
        // Antwort verhandelt. Die Zone kommt aus der Naht `src/time.ts`.
        body: {
          email: 'a@b.de',
          password: 'geheim123!',
          displayName: 'Markus',
          locale: 'de',
          timeZoneId: anyTimeZoneId,
        },
      })
      .willRespondWith({
        status: 201,
        headers: authResponseHeaders,
        // Dieselbe Nutzlast wie die Anmeldung: `app/register.tsx` führt danach
        // direkt ins Tagebuch, und dafür braucht es die Sitzung sofort. Zwei
        // Formen für dieselbe Sache gäbe es sonst ohne Not.
        body: enveloped(tokenPair),
      });

    await p.executeTest(async () => {
      const s = await register({ email: 'a@b.de', password: 'geheim123!', displayName: 'Markus' });
      expect(s.accessToken).toBeTruthy();
      expect(s.refreshToken).toBeTruthy();
      expect(s.tokenType).toBe('Bearer');
      expect(s.user.id).toBeTruthy();
      // Und die Sitzung liegt danach im Gerät — wer ein Konto anlegt, ist drin.
      expect(__readSession()).toBeTruthy();
    });
  });

  it('legt ein Konto auch mit einer Zone ohne Ortsnamen an', async () => {
    const p = provider();
    p.given('Keine Registrierung mit a@b.de vorhanden')
      .uponReceiving('Registrierung mit einer Versatz-Zone')
      .withRequest({
        method: 'POST',
        path: '/api/v1/identity/register',
        headers: germanJsonHeaders,
        // Hier steht der Wert selbst und kein Matcher: `GMT+01:00` **ist** die
        // Zusage. Android liefert diese Form, wenn das System keine benannte
        // Zone auflöst; der Nutzer kann dafür nichts, und ein Konto muss auch
        // dann entstehen. Der Vertrag sagt das mit einer 201 und nicht mit
        // einem Fehlerfall — bestellt ist die Abwesenheit einer Ablehnung.
        body: {
          email: 'a@b.de',
          password: 'geheim123!',
          displayName: 'Markus',
          locale: 'de',
          timeZoneId: 'GMT+01:00',
        },
      })
      .willRespondWith({
        status: 201,
        headers: authResponseHeaders,
        body: enveloped(tokenPair),
      });

    await p.executeTest(async () => {
      // Über die Naht, damit der Wert denselben Weg nimmt wie auf dem Gerät —
      // von Hand in den Rumpf geschrieben wäre es eine Zusage über nichts.
      setTimeProvider({ now: () => new Date(), timeZoneId: () => 'GMT+01:00' });
      try {
        const s = await register({ email: 'a@b.de', password: 'geheim123!', displayName: 'Markus' });
        expect(s.accessToken).toBeTruthy();
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
        headers: germanJsonHeaders,
        body: { email: 'a@b.de', password: 'geheim123!', displayName: 'Markus', locale: 'de', timeZoneId: anyTimeZoneId },
      })
      // Zwei Zusagen in einer: der `type`, an dem der Screen diesen Fall von
      // jedem sonstigen Fehlschlag unterscheidet, **und** `detail` — der Satz zu
      // genau diesem Vorfall. Kein `errors`: eine vergebene Adresse verstößt
      // gegen keine Feldregel, und RFC 7807 hat für den Satz zum Vorfall schon
      // ein Feld. Auch hier redet der Server; die Maske hat nur einen Rückfall.
      .willRespondWith(
        problem('email-already-registered', 'E-Mail bereits vergeben', 409, {
          detail: M.string('Die E-Mail-Adresse a@b.de ist bereits mit einem anderen Konto verknüpft'),
        }),
      );

    await p.executeTest(async () => {
      const e = await register({ email: 'a@b.de', password: 'geheim123!', displayName: 'Markus' }).catch((err: unknown) => err);
      expect(e).toBeInstanceOf(ApiError);
      const fehler = e as ApiError;
      expect(fehler.type).toBe('email-already-registered');
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
        headers: germanJsonHeaders,
        body: {
          email: 'kein-at-zeichen',
          password: 'kurz',
          displayName: 'Markus',
          locale: 'de',
          timeZoneId: anyTimeZoneId,
        },
      })
      // Bestellt ist die **Begründung je Feld**, nicht ein Sammelsatz: die Maske
      // hat drei Eingaben und muss die richtige anstreichen. Beide Verstöße
      // kommen in einer Antwort — nacheinander wäre es für den Nutzer ein
      // zweiter Fehlschlag für denselben Versuch.
      //
      // Der Wortlaut ist Matcher und nicht Wert: was genau falsch ist, weiß der
      // Server, und seine Regeln kennt die Maske nicht. Sie zeigt den Satz, den
      // sie bekommt — deshalb trägt die Anfrage `Accept-Language`.
      .willRespondWith(
        problem('validation-failed', 'Die Eingabe ist ungültig', 400, {
          detail: M.string('Bitte überprüfen Sie die mit Fehlern markierten Felder'),
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
      const e = await register({ email: 'kein-at-zeichen', password: 'kurz', displayName: 'Markus' }).catch((err: unknown) => err);
      expect(e).toBeInstanceOf(ApiError);
      const fehler = e as ApiError;
      expect(fehler.type).toBe('validation-failed');
      // Genau das liest `app/register.tsx`: Feldname → mindestens ein Satz.
      expect(fehler.errors?.email?.[0]).toEqual(expect.any(String));
      expect(fehler.errors?.password?.[0]).toEqual(expect.any(String));
    });
  });

  it('lehnt falsche Daten mit 401 ab', async () => {
    const p = provider();
    p.given('Nutzer a@b.de existiert mit Passwort geheim123')
      .uponReceiving('Anmeldung mit falschem Passwort')
      .withRequest({
        method: 'POST',
        path: '/api/v1/identity/login',
        headers: jsonHeaders,
        body: { email: 'a@b.de', password: 'falsch' },
      })
      // Fehler tragen keinen Umschlag: problem+json bleibt, wie es ist.
      .willRespondWith(problem('invalid-credentials', 'Anmeldung fehlgeschlagen', 401));

    await p.executeTest(async () => {
      await expect(api('/identity/login', { method: 'POST', body: { email: 'a@b.de', password: 'falsch' } })).rejects.toMatchObject({
        type: 'invalid-credentials',
      });
    });
  });

  it('tauscht einen Refresh-Token gegen ein neues Paar', async () => {
    const p = provider();
    p.given('Nutzer hat einen gültigen Refresh-Token')
      .uponReceiving('Sitzung erneuern')
      .withRequest({
        method: 'POST',
        path: '/api/v1/identity/refresh',
        headers: jsonHeaders,
        body: { refreshToken: M.string('rt_...') },
      })
      .willRespondWith({
        status: 200,
        headers: authResponseHeaders,
        // Dieselbe Nutzlast wie die Anmeldung — die Hülle wertet beides gleich aus.
        body: enveloped({ ...tokenPair, refreshToken: M.string('rt_neu') }),
      });

    await p.executeTest(async () => {
      // Diesen Aufruf macht die fetch-Hülle selbst, sobald eine Antwort 401 ist.
      const r = await apiWithMeta<AuthTokens>('/identity/refresh', {
        method: 'POST',
        body: { refreshToken: 'rt_alt' },
      });
      expect(r.data.accessToken).toBeTruthy();
      expect(r.data.refreshToken).toBeTruthy();
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
        headers: jsonHeaders,
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
