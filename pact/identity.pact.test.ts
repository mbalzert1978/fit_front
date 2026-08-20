import { pact, M, enveloped, jsonHeaders, authResponseHeaders, problem } from './setup';
import { api, apiWithMeta, signOut } from '../src/api/client';
import { register } from '../src/api/session';
import { __seedSession, __readSession } from './stubs/expoSecureStore';
import type { AuthTokens } from '../src/api/types';

/**
 * Bedarf: `app/login.tsx` und `app/register.tsx` (beide über
 * `src/api/session.ts`) sowie die 401-Behandlung in `src/api/client.ts`. Die
 * Anmeldemaske unterscheidet genau zwei Ausgänge — angemeldet oder Feld rot;
 * deshalb dort genau ein Erfolgs- und ein Fehlerfall. Die Registrierung sagt zu
 * zwei Fehlschlägen etwas Verschiedenes (E-Mail vergeben, Passwort zu kurz) und
 * bekommt deshalb beide einzeln zugesichert.
 *
 * Die Token-Antwort ist nach OAuth 2 benannt: `tokenType`, `expiresIn` und
 * `refreshExpiresIn` in Sekunden, die Identität als `user.id`. Dass die
 * Laufzeiten heute kein Screen liest, nimmt sie nicht aus der Zusage — die Form
 * der Auth-Antwort ist Vorgabe, nicht Ableitung aus dem heutigen Bedarf; siehe
 * `docs/regeln.md` Regel 2.
 */
const provider = () => pact('nutritrack-identity');

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
        headers: jsonHeaders,
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
          timeZoneId: 'Europe/Berlin',
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

  it('lehnt eine schon vergebene E-Mail mit 409 ab', async () => {
    const p = provider();
    p.given('Nutzer a@b.de existiert mit Passwort geheim123')
      .uponReceiving('Registrierung mit vergebener E-Mail')
      .withRequest({
        method: 'POST',
        path: '/api/v1/identity/register',
        headers: jsonHeaders,
        body: { email: 'a@b.de', password: 'geheim123!', displayName: 'Markus', locale: 'de', timeZoneId: 'Europe/Berlin' },
      })
      // Der Screen sagt dazu etwas anderes als bei jedem sonstigen Fehlschlag;
      // deshalb muss dieser Fall an seinem `type` erkennbar sein.
      .willRespondWith(problem('email-already-registered', 'E-Mail bereits vergeben', 409));

    await p.executeTest(async () => {
      await expect(register({ email: 'a@b.de', password: 'geheim123!', displayName: 'Markus' })).rejects.toMatchObject({
        type: 'email-already-registered',
      });
    });
  });

  it('lehnt ein zu kurzes Passwort mit 400 ab', async () => {
    const p = provider();
    p.given('Keine Registrierung mit a@b.de vorhanden')
      .uponReceiving('Registrierung mit zu kurzem Passwort')
      .withRequest({
        method: 'POST',
        path: '/api/v1/identity/register',
        headers: jsonHeaders,
        body: { email: 'a@b.de', password: 'kurz', displayName: 'Markus', locale: 'de', timeZoneId: 'Europe/Berlin' },
      })
      .willRespondWith(problem('password-too-weak', 'Passwort zu kurz', 400));

    await p.executeTest(async () => {
      // Die Maske lässt ein zu kurzes Passwort gar nicht erst abschicken
      // (`minPasswordLength` in `src/api/session.ts`). Zugesichert wird der Fall
      // trotzdem: der Client darf nicht der einzige Prüfer sein, sonst käme ein
      // Konto mit schwachem Passwort an ihm vorbei zustande.
      await expect(register({ email: 'a@b.de', password: 'kurz', displayName: 'Markus' })).rejects.toMatchObject({
        type: 'password-too-weak',
      });
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
