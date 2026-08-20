import { api, storeTokens, defaultLanguage } from './client';
import { time } from '../time';
import type { AuthTokens } from './types';

export { hasSession, signOut } from './client';

/**
 * Anmeldung. Die Antwort trägt beide Token samt ihrer Laufzeit in Sekunden
 * (`expiresIn`, `refreshExpiresIn`) und die Identität als `user.id`; abgelegt
 * werden sie über denselben Weg, den die Erneuerung in `client.ts` nimmt.
 * Kommt die Antwort unvollständig, wirft `storeTokens` — dann bleibt gar keine
 * Sitzung zurück statt einer halben.
 */
export async function login(email: string, password: string): Promise<AuthTokens> {
  const tokens = await api<AuthTokens>('/identity/login', { method: 'POST', body: { email, password } });
  await storeTokens(tokens);
  return tokens;
}

/**
 * Die eine Regel, die die Maske selbst kennt: Sie hält den offensichtlichen
 * Fall vom Netz fern, ohne zu behaupten, sie kenne alle Regeln. Was sonst noch
 * gilt — Zeichenklassen, gesperrte Passwörter, die Form der E-Mail —, weiß der
 * Server und sagt es feldweise in `problem+json` (`validation-failed`).
 */
export const minPasswordLength = 10;

/** Obergrenze des Anzeigenamens. Die Maske hält sie ein, der Server prüft erneut. */
export const maxDisplayNameLength = 60;

/**
 * Was beim Anlegen eines Kontos vom Nutzer kommt. Sprache und Zeitzone stehen
 * nicht hier: die fragt niemand ab, die weiß das Gerät.
 */
export type Registration = { email: string; password: string; displayName: string };

/**
 * Registrierung. Sie liefert dieselbe Antwort wie die Anmeldung und legt
 * dieselbe Sitzung an — wer ein Konto anlegt, ist damit angemeldet. Ein
 * zweiter Aufruf zum Anmelden danach würde einen Zustand schaffen, in dem ein
 * Konto existiert, aber niemand darin ist; genau der soll nicht entstehen.
 *
 * `locale` und `timeZoneId` reisen als Felder mit und nicht als Kopfzeile:
 * `Accept-Language` verhandelt diese eine Antwort, hier entsteht dagegen ein
 * Merkmal, das am Konto bleibt. Die Zone kommt aus der Naht in `src/time.ts`;
 * ist sie nicht zu ermitteln, wirft sie. Dann entsteht gar keine Anfrage — ein
 * Konto mit einer stillschweigend gesetzten Zone wäre schlechter als keines.
 */
export async function register(r: Registration): Promise<AuthTokens> {
  const tokens = await api<AuthTokens>('/identity/register', {
    method: 'POST',
    body: {
      email: r.email,
      password: r.password,
      displayName: r.displayName,
      locale: defaultLanguage,
      timeZoneId: time.timeZoneId(),
    },
  });
  await storeTokens(tokens);
  return tokens;
}
