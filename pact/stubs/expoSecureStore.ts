/**
 * Stands in for `expo-secure-store` in the Node test run. The session lies as
 * one record under one key, as it does on the device.
 *
 * The refresh token is empty by default: otherwise the client answers an
 * assured 401 with a further call to `/identity/refresh` or `/identity/logout`
 * that the contract does not describe, and the mock server counts it as an
 * unexpected request. A test that wants to assure that follow-up seeds it with
 * `__seedSession`.
 *
 * The store is writable and stateful because the client really writes
 * (renewal) and deletes (sign-out) during a test.
 */

/** Matches the constant of the real library; a placeholder here. */
export const WHEN_UNLOCKED_THIS_DEVICE_ONLY = 'whenUnlockedThisDeviceOnly';

export const ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.pact';

const defaults = () => ({
  session: JSON.stringify({
    accessToken: ACCESS_TOKEN,
    refreshToken: '',
    accessTokenExpiresAt: Date.now() + 60 * 60 * 1000,
    refreshTokenExpiresAt: 0,
  }),
});

let store: Record<string, string> = defaults();

/** Back to the default — runs before every test (`pact/reset.ts`). */
export function __reset() {
  store = defaults();
}

/** A session with a refresh token, where a test assures the follow-up request. */
export function __seedSession(refreshToken: string, accessTokenExpiresAt = Date.now() + 60 * 60 * 1000) {
  store.session = JSON.stringify({
    accessToken: ACCESS_TOKEN,
    refreshToken,
    accessTokenExpiresAt,
    refreshTokenExpiresAt: Date.now() + 60 * 24 * 60 * 60 * 1000,
  });
}

/** What is stored — for tests that check the result of a write. */
export function __readSession(): Record<string, unknown> | null {
  return store.session ? JSON.parse(store.session) : null;
}

export async function getItemAsync(key: string): Promise<string | null> {
  return store[key] ?? null;
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  store[key] = value;
}

export async function deleteItemAsync(key: string): Promise<void> {
  delete store[key];
}
