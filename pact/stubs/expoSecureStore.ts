/**
 * Ersatz fuer `expo-secure-store` im Node-Testlauf.
 *
 * Der Access-Token ist gesetzt, damit der Client den `Authorization`-Header
 * schickt, den die Vertraege zusichern. Der Refresh-Token ist bewusst `null`:
 * sonst beantwortet der Client eine zugesicherte 401 mit einem zusaetzlichen
 * Aufruf von `/identity/refresh`, den kein Vertrag beschreibt — der Mockserver
 * wertet das als unerwartete Anfrage.
 */
export async function getItemAsync(key: string): Promise<string | null> {
  return key === 'accessToken' ? 'eyJhbGciOiJIUzI1NiJ9.pact' : null;
}

export async function setItemAsync(): Promise<void> {}

export async function deleteItemAsync(): Promise<void> {}
