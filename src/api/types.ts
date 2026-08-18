import type { DiaryDate } from './diaryDate';

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
export type AuthTokens = {
  tokenType: 'Bearer';
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  refreshExpiresIn: number;
  user: { id: string };
};

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

export type DiaryDay = {
  date: DiaryDate;
  isFuture: boolean;
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

export type Preferences = { theme: 'Dark' | 'Light'; language: 'de' | 'en' };

export type HealthConsent = { connected: boolean; importActivity: boolean; exportNutrition: boolean };
