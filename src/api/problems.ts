/**
 * The identifiers of the kinds of error, per RFC 9457 — `tag:` URIs per
 * RFC 4151, in one place so that `pact/setup.ts` assures what the screens
 * compare. Form and reasoning:
 * `docs/decisions/2026-08-20-1254-fehlerkennungen-sind-tag-uris.md`.
 *
 * What stands here does **not** change any more: changing an identifier means
 * changing every contract and every branch that compares it.
 */
const server = 'tag:nutritrack.app,2026:problems/';

/** Errors that come from the server. */
export const problems = {
  /** A domain rule was violated: **422**, not 400 (RFC 9110 §15.5.21), with the reasoning per field in `errors`. */
  validationFailed: `${server}validation-failed`,
  /**
   * The body itself was wrong — **400**, an error of this app and not of the
   * user. No contract covers it, because no caller can produce it; the
   * identifier stands here so the other side knows which one to use.
   */
  malformedRequest: `${server}malformed-request`,
  emailAlreadyRegistered: `${server}email-already-registered`,
  /**
   * The same `Idempotency-Key` came back on a **different** body — **409**, and
   * not the 400 of a broken body: the body is readable and well formed, it is
   * the pairing with an already spent key that the state on the other side
   * rules out. No screen tells this case apart; it stands here because without
   * it the other side would be free to replay the first response instead
   * (`docs/decisions/2026-08-22-1620-der-schluessel-bindet-den-rumpf-und-ein-zweiter-rumpf-ist-ein-konflikt.md`).
   */
  idempotencyKeyReused: `${server}idempotency-key-reused`,
  invalidCredentials: `${server}invalid-credentials`,
  tokenExpired: `${server}token-expired`,
  forbidden: `${server}forbidden`,
  productNotFound: `${server}product-not-found`,
  slotNotEmpty: `${server}slot-not-empty`,
  concurrencyConflict: `${server}concurrency-conflict`,
} as const;

/**
 * Errors that arise **here** and never came over the wire. Their own namespace,
 * so that the identifier stays readable as to who raised it.
 */
const client = 'tag:nutritrack.app,2026:client-problems/';

export const clientProblems = {
  malformedEnvelope: `${client}malformed-envelope`,
  malformedTokenResponse: `${client}malformed-token-response`,
  preconditionRequired: `${client}precondition-required`,
  /** Determined **here**, before a request went out — hence not `token-expired`. */
  sessionExpired: `${client}session-expired`,
} as const;
