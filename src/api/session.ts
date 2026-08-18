import * as SecureStore from 'expo-secure-store';
import { api } from './client';

export type Session = { userId: string; accessToken: string; refreshToken: string; expiresInSeconds: number };

export async function login(email: string, password: string) {
  const s = await api<Session>('/identity/login', { method: 'POST', body: { email, password } });
  await SecureStore.setItemAsync('accessToken', s.accessToken);
  await SecureStore.setItemAsync('refreshToken', s.refreshToken);
  return s;
}

export async function hasSession() {
  return (await SecureStore.getItemAsync('accessToken')) !== null;
}
