import { api, storeSession } from './client';
import { time } from '../time';
import { language } from '../language';
import type { SignIn } from './types';

export { hasSession, signOut } from './client';

/**
 * Anmeldung. Die Antwort trägt zwei benannte Teile: das Konto unter `user` und
 * die Sitzung unter `session` — beide Token samt ihrer Laufzeit in Sekunden.
 * Abgelegt wird nur die Sitzung, über denselben Weg, den die Erneuerung in
 * `client.ts` nimmt. Kommt sie unvollständig, wirft `storeSession` — dann
 * bleibt gar keine Sitzung zurück statt einer halben.
 */
export async function login(email: string, password: string): Promise<SignIn> {
  const signedIn = await api<SignIn>('/identity/login', { method: 'POST', body: { email, password } });
  await storeSession(signedIn.session);
  return signedIn;
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
 * Der Rumpf, der wirklich hinausgeht: die getippten Felder und dazu, was das
 * Gerät weiß. Er entsteht an genau einer Stelle — `registrationRequest()` —,
 * weil der `Idempotency-Key` an ihm hängt: leitete die Maske ihn aus den
 * getippten Feldern allein ab und die Sprache oder die Zone wechselte zwischen
 * zwei Versuchen, ginge ein anderer Rumpf unter demselben Schlüssel hinaus.
 * Das ist kein Wiederholen, sondern `idempotency-key-reused`.
 */
export type RegistrationRequest = Registration & { locale: string; timeZoneId: string };

/**
 * `locale` und `timeZoneId` reisen als Felder mit und nicht als Kopfzeile:
 * `Accept-Language` verhandelt diese eine Antwort, hier entsteht dagegen ein
 * Merkmal, das am Konto bleibt — daran hängen später Erinnerungen und E-Mails,
 * die niemand aus dieser App heraus anfordert.
 *
 * Beide kommen aus einer Naht und aus keinem Literal: die Sprache aus
 * `src/language.ts`, dieselbe, die als `Accept-Language` an dieser Anfrage
 * steht; die Zone aus `src/time.ts`. Ist die Zone nicht zu ermitteln, wirft
 * sie — dann entsteht gar keine Anfrage, denn ein Konto mit einer
 * stillschweigend gesetzten Zone wäre schlechter als keines.
 */
export function registrationRequest(r: Registration): RegistrationRequest {
  return { ...r, locale: language.tag(), timeZoneId: time.timeZoneId() };
}

/**
 * Registrierung. Sie liefert dieselbe Antwort wie die Anmeldung und legt
 * dieselbe Sitzung an — wer ein Konto anlegt, ist damit angemeldet. Ein
 * zweiter Aufruf zum Anmelden danach würde einen Zustand schaffen, in dem ein
 * Konto existiert, aber niemand darin ist; genau der soll nicht entstehen.
 *
 * Der `idempotencyKey` kommt von außen und wird hier nicht erzeugt: er muss
 * über wiederholte Versuche mit **denselben** Daten derselbe bleiben, und das
 * weiß nur die Maske. Ohne ihn liest ein Nutzer, dessen Antwort auf dem Rückweg
 * verlorenging, beim zweiten Tippen „E-Mail bereits registriert" — vergeben von
 * ihm selbst, eine Sekunde zuvor. Er hätte ein Konto und käme nicht hinein.
 *
 * Was hinausgeht, steht in `RegistrationRequest` und entsteht in
 * `registrationRequest()`; hier wird es nur noch abgeschickt.
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
