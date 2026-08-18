import * as SecureStore from 'expo-secure-store';
import { api, storeTokens } from './client';
import type { AuthTokens } from './types';

/**
 * Anmeldung. Die Antwort trägt beide Token samt ihrer Laufzeit in Sekunden
 * (`expiresIn`, `refreshExpiresIn`) und die Identität als `user.id`; abgelegt
 * werden sie über denselben Weg, den die Erneuerung in `client.ts` nimmt.
 */
export async function login(email: string, password: string): Promise<AuthTokens> {
  const tokens = await api<AuthTokens>('/identity/login', { method: 'POST', body: { email, password } });
  await storeTokens(tokens);
  return tokens;
}

export async function hasSession() {
  return (await SecureStore.getItemAsync('accessToken')) !== null;
}
