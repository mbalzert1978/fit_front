/**
 * Die Kennungen der Fehlerarten, nach RFC 9457.
 *
 * `type` ist dort eine **URI und damit eine Kennung, kein Ort**: sie wird nicht
 * abgerufen, sie ändert sich nicht mit der Umgebung, und verglichen wird sie
 * als ganze Zeichenkette. Genau deshalb stehen die Kennungen hier an einer
 * Stelle statt als Literal in jedem Screen — ein Tippfehler in einer solchen
 * Zeichenkette fällt sonst nirgends auf, er lässt nur einen Zweig nie greifen.
 *
 * Dieselben Werte stehen im Vertrag (`pact/setup.ts` liest sie von hier). Was
 * die App vergleicht und was sie zusichert, kann damit nicht auseinanderlaufen.
 */
const server = 'https://api.example/errors/';

/** Fehler, die vom Server kommen. */
export const problems = {
  validationFailed: `${server}validation-failed`,
  emailAlreadyRegistered: `${server}email-already-registered`,
  invalidCredentials: `${server}invalid-credentials`,
  tokenExpired: `${server}token-expired`,
  forbidden: `${server}forbidden`,
  productNotFound: `${server}product-not-found`,
  slotNotEmpty: `${server}slot-not-empty`,
  concurrencyConflict: `${server}concurrency-conflict`,
} as const;

/**
 * Fehler, die **hier** entstehen und nie über die Leitung kamen: eine Antwort
 * ohne Umschlag, ein halbes Token-Paar, ein Speichern ohne `ETag`. Eigener
 * Namensraum, damit an der Kennung ablesbar bleibt, wer sie gestellt hat.
 */
const client = 'https://nutritrack.app/client-errors/';

export const clientProblems = {
  malformedEnvelope: `${client}malformed-envelope`,
  malformedTokenResponse: `${client}malformed-token-response`,
  preconditionRequired: `${client}precondition-required`,
} as const;
