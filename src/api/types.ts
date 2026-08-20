import type { DiaryDate } from './diaryDate';
import type { Language } from '../language';

/**
 * Begleitinformation, die jede Antwort mit Rumpf trägt. Kein Screen liest sie —
 * sie ist für Support und Fehlersuche da: `requestId` spiegelt den Header
 * `X-Request-Id`, `apiVersion` die Fassung hinter `/api/v1`.
 */
export type Meta = { requestId: string; timestamp: string; apiVersion: string };

/**
 * Der Umschlag jeder Antwort mit Rumpf: Nutzlast unter `data`, Begleitinformation
 * unter `meta`. Ausgepackt wird er genau einmal — in `client.ts`. Kein Hook und
 * kein Screen sieht ihn, deshalb steht er in keiner weiteren Signatur.
 */
export type Envelope<T> = { data: T; meta: Meta };

/**
 * Anmeldung und Erneuerung, benannt wie in OAuth 2. `expiresIn` und
 * `refreshExpiresIn` sind Sekunden — die Einheit steht in dieser Zusage, nicht
 * im Feldnamen. Die Identität ist ein Objekt, damit sie wachsen kann, ohne dass
 * ein zweites flaches Feld daneben entsteht.
 */
/**
 * Die Sitzung, wie der Server sie ausgibt — nach OAuth 2 benannt (RFC 6749
 * §5.1), nur in camelCase wie die übrige API. `refreshExpiresIn` ist eine
 * Erweiterung; für die Laufzeit des Refresh-Tokens hat der RFC kein Feld.
 *
 * Die Laufzeiten sind **relativ in Sekunden** und keine Zeitstempel: der
 * Client hat eine eigene Uhr, und die geht falsch. Aus der Sekundenzahl wird
 * erst in `client.ts` ein Zeitpunkt, gemessen an genau dieser Uhr.
 *
 * Dieselben fünf Felder überall, wo eine Sitzung entsteht oder erneuert wird —
 * ein Ableser im ganzen Repo.
 */
export type Session = {
  tokenType: 'Bearer';
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  refreshExpiresIn: number;
};

/**
 * Das Konto, wie der Server es führt. `locale` und `timeZoneId` stehen hier,
 * weil sie die **wirksamen** Werte sind und nicht die gefragten: der Server
 * normalisiert eine Versatz-Zone (`GMT+01:00` wird `+01:00`), und was dabei
 * herauskommt, steht in der Antwort. Die Anfrage ist ein Wunsch, die Antwort
 * die Wahrheit über die Ressource.
 */
export type AccountUser = {
  id: string;
  email: string;
  displayName: string;
  locale: Language;
  timeZoneId: string;
};

/**
 * Was `register` und `login` zurückgeben: das Konto **und** die Sitzung. Die
 * Erneuerung liefert nur `Session` — sie liegt auf dem heißen Pfad und soll den
 * User-Store nicht anfassen.
 */
export type SignIn = { user: AccountUser; session: Session };

/** Nährwerte je 100 g. Optionale Felder dürfen fehlen — dann sind sie nicht gesetzt. */
export type Nutrients = {
  kcal: number;
  fatG: number;
  saturatedFatG?: number | null;
  carbsG: number;
  sugarG?: number | null;
  proteinG: number;
  saltG?: number | null;
};

export type Product = {
  id: string;
  barcode: string | null;
  name: string;
  brand: string | null;
  basisUnit: 'Gram';
  source: 'Curated' | 'Ocr' | 'Manual';
  verifiedByUser: boolean;
  nutrientsPer100g: Nutrients;
};

export type DiaryEntry = {
  id: string;
  sourceType: 'Product' | 'Recipe';
  sourceId: string;
  displayName: string;
  portionText: string;
  grams: number;
  kcal: number;
};

export type MealSlotDay = { id: string; name: string; kcal: number; entries: DiaryEntry[] };

export type ActivityEntry = { externalId: string; name: string; detail: string; kcal: number };

/**
 * Ohne `isFuture`: ob ein Tag in der Zukunft liegt, ist der Vergleich zweier
 * Kalendertage und kommt ohne Antwort vom Server aus — siehe
 * `docs/decisions/2026-08-20-0925-kalendertag-ist-reine-client-sache.md`.
 */
export type DiaryDay = {
  date: DiaryDate;
  totals: { kcal: number; carbsG: number; proteinG: number; fatG: number };
  goal: { dailyKcal: number; carbsG: number; proteinG: number; fatG: number };
  remainingKcal: number;
  slots: MealSlotDay[];
  activity: { connected: boolean; totalKcal: number; entries: ActivityEntry[] } | null;
};

export type MealSlot = { id: string; name: string; position: number };

export type RecentItem = {
  sourceType: 'Product' | 'Recipe';
  sourceId: string;
  displayName: string;
  lastGrams: number;
  kcalPerPortion: number;
};

export type SearchHit = {
  sourceType: 'Product' | 'Recipe';
  id: string;
  displayName: string;
  metaLine: string;
};

export type PhotoJob =
  | { photoId: string; status: 'Processing' }
  | { photoId: string; status: 'Failed'; reason: string }
  | {
      photoId: string;
      status: 'Completed';
      barcode: string | null;
      suggestedName: string | null;
      basis: 'Per100g' | 'PerPortion';
      fields: Record<keyof Nutrients, { value: number | null; confidence: number | null }>;
    };

export type RecipeIngredient = { id: string; productId: string; displayName: string; grams: number; computedKcal: number };

export type Recipe = {
  id: string;
  name: string;
  portions: number;
  totalGrams: number;
  gramsPerPortion: number;
  totalKcal: number;
  kcalPerPortion: number;
  macrosPerPortion: { carbsG: number; proteinG: number; fatG: number };
  ingredients: RecipeIngredient[];
  /** Aus dem Antwort-Header `ETag`, nicht aus dem Rumpf; geht unverändert als `If-Match` zurück. */
  etag?: string;
};

export type Goals = {
  dailyKcal: number;
  macros: Record<'carbs' | 'protein' | 'fat', { percent: number; grams: number; kcal: number }>;
  energyStandard: 'Physiological' | 'Declaration';
  rounding: 'Up' | 'Down';
  includeActivityInGoal: boolean;
};

/**
 * Was am Tagesziel geändert werden darf — jedes Feld für sich, der Screen
 * speichert in kleinen Teilnutzlasten. Ein offener `Record<string, unknown>`
 * stand hier vorher und ließ jedes beliebige Feld mitlaufen; abgeleitete Werte
 * (`grams`, `kcal`) und alles, was der Server aus eigener Autorität setzt,
 * gehören nicht in eine Anfrage.
 */
export type GoalsUpdate = {
  dailyKcal?: number;
  macros?: Partial<Record<'carbs' | 'protein' | 'fat', { percent: number }>>;
  energyStandard?: Goals['energyStandard'];
  rounding?: Goals['rounding'];
  includeActivityInGoal?: boolean;
};

/**
 * Ein neu angelegtes Produkt. `source` und `verifiedByUser` stehen hier, weil
 * der Bestätigungs-Screen sie setzt — welchen Wert der Server davon übernimmt,
 * ist seine Sache. Weitere Felder gibt es nicht: was nicht aufgezählt ist,
 * kommt auch nicht mit.
 */
export type ProductCreate = {
  id: string;
  barcode: string | null;
  name: string;
  brand: string | null;
  basisUnit: 'Gram';
  source: 'Ocr' | 'Manual';
  verifiedByUser: boolean;
  photoId: string | null;
  nutrientsPer100g: Record<keyof Nutrients, number | null>;
};

/** Was ein Rezept beim Speichern trägt. `etag` geht als `If-Match` hinaus, nicht in den Rumpf. */
export type RecipeSave = {
  id: string;
  name: string;
  portions: number;
  ingredients: { id: string; productId: string; grams: number }[];
  etag?: string;
};

/**
 * `language` steht hier nicht als zweite Liste: sie ist dieselbe Menge, die
 * `src/language.ts` an `Accept-Language` und beim Anlegen eines Kontos an
 * `locale` schickt. Zwei Aufzählungen dafür liefen auseinander, sobald eine
 * dritte Sprache dazukommt.
 */
export type Preferences = { theme: 'Dark' | 'Light'; language: Language };

export type HealthConsent = { connected: boolean; importActivity: boolean; exportNutrition: boolean };
