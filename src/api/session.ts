import { api, storeTokens } from './client';
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
