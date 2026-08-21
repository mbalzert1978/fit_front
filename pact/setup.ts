import path from 'path';
import { PactV3, MatchersV3 } from '@pact-foundation/pact';
import { MOCK_PORT } from './mockPort';
import { problems } from '../src/api/problems';
import type { Language } from '../src/language';

/**
 * Die Kennungen kommen aus dem Quellcode der App und nicht aus einem zweiten
 * Literal hier: was ein Screen vergleicht, ist damit dasselbe, was der Vertrag
 * zusichert. Ein Auseinanderlaufen wäre sonst erst am toten Zweig zu merken.
 */
export { problems };

export const M = MatchersV3;

/**
 * Ein Pact je Consumer/Provider-Paar. Die erzeugten Dateien liegen in ./pacts
 * und werden versioniert — das ist die Übergabe. Verifiziert werden sie im
 * Provider-Repo; von hier aus geschieht das nicht und wird auch nicht geprüft.
 */
export function pact(provider: string) {
  return new PactV3({
    consumer: 'nutritrack-app',
    provider,
    port: MOCK_PORT,
    dir: path.resolve(process.cwd(), 'pacts'),
    logLevel: 'warn',
  });
}

const REQUEST_ID = '01JQ8Z3K7V9XW2P4M6N8R0T5YB';

/**
 * Der Umschlag: Nutzlast unter `data`, Begleitinformation unter `meta`.
 *
 * `data` trägt die Matcher, die der Screen wirklich braucht. `meta` liest kein
 * Screen — zugesichert ist nur, dass es da ist und aus drei Zeichenketten
 * besteht; deshalb durchgehend lockere Matcher und kein fester Wert. So bricht
 * eine neue ULID oder ein anderer Zeitstempel keine Verifikation.
 */
export const enveloped = (data: unknown) => ({
  data,
  meta: {
    requestId: M.string(REQUEST_ID),
    timestamp: M.string('2026-08-18T09:14:22Z'),
    apiVersion: M.string('1'),
  },
});

/** JSON-Rumpf, in beide Richtungen: an der Anfrage wie an der Antwort. */
export const jsonHeaders = { 'Content-Type': 'application/json' };

/**
 * Der Nachweis der Anmeldung an einer geschützten Anfrage.
 *
 * Er steht in **jedem** Vertrag eines geschützten Endpunkts, nicht nur dort, wo
 * ein Screen ihn bemerkt. Ein Vertrag ohne ihn ließe sich von einem Backend
 * erfüllen, das denselben Endpunkt unauthentifiziert ausliefert — die
 * Verifikation liefe grün, und die App nähme die Antwort widerspruchslos an.
 * Der Header ist damit Formvorgabe wie der Umschlag, keine Ableitung aus
 * heutigem Bedarf; siehe `docs/regeln.md` Regel 2.
 *
 * Nicht ausgeführt: nach außen gehen nur die Formen **mit** Sprache. Eine
 * Interaktion, die sich ausweist, aber keine Sprache nennt, gäbe es sonst
 * versehentlich — und sie wäre unwahr, denn der Client nennt immer eine.
 */
const authHeaders = { Authorization: M.regex('Bearer .+', 'Bearer eyJ...') };

/**
 * Die Sprache an einer Anfrage — als **fester Wert** und nicht als Matcher.
 *
 * An ihr entscheidet der Server, in welcher Sprache seine Sätze kommen; eine
 * Zusage über die Form („irgendein Sprach-Tag") sagte darüber nichts. Jede
 * Interaktion nennt deshalb die Sprache, in der sie gefragt hat, und die
 * Antwort trägt die Sätze in genau dieser Sprache — nachprüfbar an
 * `Content-Language`, siehe `problem()`.
 *
 * Der Client schickt die Zeile an **jeder** Anfrage (`src/api/client.ts`),
 * nicht nur dort, wo ein Screen heute einen Satz anzeigt; deshalb steht sie
 * auch in den Verträgen, deren Antwort nur Daten trägt.
 */
export const acceptLanguage = (tag: Language) => ({ 'Accept-Language': tag });

/** Anfrage mit JSON-Rumpf in einer Sprache. */
export const jsonHeadersIn = (tag: Language) => ({ ...jsonHeaders, ...acceptLanguage(tag) });

/** Auth plus die Sprache, die der Client an jeder Anfrage mitschickt. */
export const authHeadersIn = (tag: Language) => ({ ...authHeaders, ...acceptLanguage(tag) });

/** Auth an einer Anfrage mit JSON-Rumpf, in einer Sprache. */
export const jsonAuthHeadersIn = (tag: Language) => ({ ...authHeaders, ...jsonHeadersIn(tag) });

/**
 * Antworten mit personenbezogenen Daten. `Cache-Control: no-store` hält sie aus
 * jedem Zwischenspeicher heraus — ohne die Direktive legen NSURLCache und
 * OkHttp den Rumpf unverschlüsselt im Cache-Verzeichnis ab, und dort liest ihn
 * ein Backup oder ein Dateizugriff, ohne je einen Token zu brauchen.
 *
 * Nährwerte, Tagesziele, Aktivität und die eigenen Rezepte fallen darunter. Der
 * Produktkatalog fällt **nicht** darunter: ein kuratiertes Produkt zu einem
 * Barcode ist für alle dasselbe, und dass es zwischengespeichert wird, ist
 * erwünscht.
 */
export const privateHeaders = { ...jsonHeaders, 'Cache-Control': 'no-store' };

/**
 * Antworten, die Token tragen. Zusätzlich zu `no-store` ist `X-Request-Id` der
 * Faden, an dem sich ein Anmeldeversuch nachverfolgen lässt. Beide sind Teil
 * der Zusage, nicht Beiwerk.
 *
 * Header und `meta.requestId` tragen **dasselbe Beispiel**, weil sie denselben
 * Aufruf bezeichnen. Zusichern kann Pact diese Gleichheit nicht — ein Matcher
 * kennt nur sein eigenes Feld. Geprüft wird sie deshalb im Consumer-Test gegen
 * den Mock (`identity.pact.test.ts`); gegenüber dem Provider bleibt sie eine
 * Bitte, siehe Issue #30.
 */
export const authResponseHeaders = { ...privateHeaders, 'X-Request-Id': M.string(REQUEST_ID) };

/** Fehler tragen keinen Umschlag: `problem+json` bleibt, wie RFC 9457 es beschreibt. */
export const problemHeaders = { 'Content-Type': 'application/problem+json' };

/**
 * Die Sprache, in der der Server geantwortet hat, so wie er sie nennt: als
 * vollständiges Tag mit Region. Wir fragen mit `de` und bekommen `de-DE` —
 * die Aushandlung ist seine Sache, und `de-AT` oder `en-GB` landen bei
 * derselben Antwort.
 *
 * Fester Wert und kein Matcher: dass **irgendeine** Sprache genannt wird, ist
 * keine Zusage. Zugesagt ist, dass es die gefragte ist.
 */
const negotiated: Record<Language, string> = { de: 'de-DE', en: 'en-US' };

/**
 * Ein Fehler als Zusage. `type` ist ein fester Wert und kein Matcher — an ihm
 * entscheidet der Client, was er tut, und ein anderer Wert ist ein anderer
 * Fehler.
 *
 * Die Form ist die von RFC 9457, und sie steht vollständig in **jeder**
 * Fehlerzusage — sie ist Form und nicht Bedarf (Regel 2, „Statuscode und
 * Fehlerform"):
 *
 * - `type` ist die Kennung der Fehlerart und ein **fester Wert**: an ihr
 *   entscheidet der Client, was er tut, und ein anderer Wert ist eine andere
 *   Fehlerart (Regel 3). Verglichen wird sie ganz, nicht in Teilen.
 * - `title` benennt die Art, `detail` erklärt **diesen** Vorfall, `instance`
 *   benennt ihn. Alle drei sind Matcher: ihr Wortlaut gehört der Gegenseite.
 * - `errors` ist die Erweiterung für die feldweise Begründung — Feldname des
 *   Anfrage-Rumpfes auf Sätze. Sie steht nur dort, wo ein Screen sie zeigt.
 * - `Content-Language` nennt die Sprache dieser Sätze. Sie ist der einzige
 *   Teil der Antwort, an dem sich **nachprüfen** lässt, dass die Sprache der
 *   Anfrage gefolgt ist: `title`, `detail` und `errors.*` sind Matcher, und
 *   ein Matcher nimmt einen deutschen Satz genauso an wie einen englischen.
 *   Ohne diesen Header wäre die Aushandlung im Vertrag nicht zugesagt, sondern
 *   nur gehofft. Der Client liest ihn nicht — er ist Zusage, nicht Bedarf.
 *
 * `language` ist die Sprache, in der **diese Interaktion gefragt hat**; sie
 * gehört zur Anfrage und wird hier wiederholt, weil die Antwort sie tragen
 * muss. Die Vorgabe ist Deutsch, weil die meisten Interaktionen so fragen.
 */
export const problem = (
  type: string,
  title: string,
  status: number,
  extra?: { detail?: string; errors?: Record<string, unknown>; language?: Language },
) => ({
  status,
  headers: { ...problemHeaders, 'Content-Language': negotiated[extra?.language ?? 'de'] },
  body: {
    type,
    title: M.string(title),
    status,
    detail: M.string(extra?.detail ?? title),
    instance: M.regex('^/api/v1/.+', '/api/v1/example'),
    ...(extra?.errors ? { errors: extra.errors } : {}),
  },
});

/**
 * Der abgelaufene oder verworfene Access-Token an einem geschützten Endpunkt.
 *
 * Daran hängt die gesamte Erneuerung in `src/api/client.ts`: sie greift genau
 * dann, wenn der Server mit **401** antwortet. Käme stattdessen 200 mit leerem
 * Rumpf, eine Weiterleitung oder 500, liefe die App in eine tote Sitzung, ohne
 * es zu merken. Deshalb steht dieser Fall je Kontext im Vertrag — auch dort, wo
 * kein Screen ihn eigens behandelt.
 */
export const unauthorized = () => problem(problems.tokenExpired, 'Anmeldung abgelaufen', 401);

/** Eine fremde Ressource. Ohne diese Zusage dürfte das Backend sie ausliefern. */
export const forbidden = () => problem(problems.forbidden, 'Kein Zugriff auf diese Ressource', 403);
