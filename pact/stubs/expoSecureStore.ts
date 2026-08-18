/**
 * Ersatz fuer `expo-secure-store` im Node-Testlauf.
 *
 * Die Sitzung liegt — wie im Geraet — als **ein** Datensatz unter **einem**
 * Schluessel. Der Access-Token ist gesetzt und laeuft weit in der Zukunft ab,
 * damit der Client den `Authorization`-Header schickt, den die Vertraege
 * zusichern, und dabei keine unerwartete Erneuerung ausloest.
 *
 * Der Refresh-Token ist im Standard bewusst leer: sonst beantwortet der Client
 * eine zugesicherte 401 mit einem zusaetzlichen Aufruf von `/identity/refresh`
 * oder `/identity/logout`, den der jeweilige Vertrag nicht beschreibt — der
 * Mockserver wertet das als unerwartete Anfrage. Wo ein Test genau diese
 * Folgeanfrage zusichern will, setzt er ihn ueber `__seedSession`.
 *
 * Der Speicher ist schreibbar und zustandsbehaftet, weil der Client waehrend
 * eines Tests tatsaechlich schreibt (Erneuerung) und loescht (Abmeldung).
 * `pact/reset.ts` setzt ihn vor jedem Test zurueck.
 */

/** Entspricht der Konstante der echten Bibliothek; hier nur ein Platzhalter. */
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

/** Setzt den Speicher auf den Standard zurueck — laeuft vor jedem Test. */
export function __reset() {
  store = defaults();
}

/** Legt eine Sitzung mit Refresh-Token an, wo ein Test die Folgeanfrage zusichert. */
export function __seedSession(refreshToken: string, accessTokenExpiresAt = Date.now() + 60 * 60 * 1000) {
  store.session = JSON.stringify({
    accessToken: ACCESS_TOKEN,
    refreshToken,
    accessTokenExpiresAt,
    refreshTokenExpiresAt: Date.now() + 60 * 24 * 60 * 60 * 1000,
  });
}

/** Was gerade abgelegt ist — fuer Tests, die das Ergebnis eines Schreibvorgangs pruefen. */
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
