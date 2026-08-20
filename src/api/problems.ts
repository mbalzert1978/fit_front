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
 *
 * **Die Form ist `tag:` nach RFC 4151** und nicht `https:`. Eine solche URI ist
 * ausdrücklich für dauerhafte Kennungen gedacht, die niemand abruft: sie
 * behauptet keinen Ort, sie kann nicht ins Leere zeigen, und sie braucht keinen
 * Server, der sie am Leben hält. Der Bestandteil vor dem Komma ist die Domain,
 * der Bestandteil danach das Jahr, in dem sie geprägt wurde — beides zusammen
 * macht sie weltweit eindeutig, ohne dass irgendwo eine Registrierung nötig
 * wäre. Voraussetzung ist, dass `nutritrack.app` uns 2026 tatsächlich gehört;
 * darauf beruht die Eindeutigkeit, und nur darauf.
 *
 * Was hier steht, ändert sich **nicht** mehr. Eine Kennung zu ändern heißt,
 * jeden Vertrag und jede Verzweigung zu ändern, die sie vergleicht.
 */
const server = 'tag:nutritrack.app,2026:problems/';

/** Fehler, die vom Server kommen. */
export const problems = {
  /**
   * Die Werte verstoßen gegen eine Fachregel — **422**, nicht 400: der Rumpf
   * war lesbar, seine Angaben waren es nicht (RFC 9110 §15.5.21). Die
   * Begründung steht feldweise in `errors`, und die Maske streicht danach an.
   */
  validationFailed: `${server}validation-failed`,
  /**
   * Der Rumpf selbst war falsch — fehlendes Pflichtfeld, unbekanntes Feld,
   * kaputtes JSON. Das ist **400** und ein Fehler dieser App, kein Fehler des
   * Nutzers; ihm ist damit nichts vorzuwerfen. Kein Vertrag deckt den Fall ab,
   * weil kein Aufrufer ihn erzeugen kann — die Kennung steht hier, damit die
   * Gegenseite weiß, welche sie dafür nehmen soll.
   */
  malformedRequest: `${server}malformed-request`,
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
const client = 'tag:nutritrack.app,2026:client-problems/';

export const clientProblems = {
  malformedEnvelope: `${client}malformed-envelope`,
  malformedTokenResponse: `${client}malformed-token-response`,
  preconditionRequired: `${client}precondition-required`,
} as const;
