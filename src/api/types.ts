import type { DiaryDate } from './diaryDate';
import type { Language } from '../language';

/** For support and diagnosis; no screen reads it. `requestId` mirrors `X-Request-Id`. */
export type Meta = { requestId: string; timestamp: string; apiVersion: string };

/** Unwrapped exactly once, in `client.ts` — hence it stands in no other signature. */
export type Envelope<T> = { data: T; meta: Meta };

/**
 * Named after OAuth 2 (RFC 6749 §5.1), in camelCase; `refreshExpiresIn` is an
 * extension the RFC has no field for.
 *
 * The lifetimes are **relative, in seconds**, and no timestamps: the client's
 * clock runs wrong, and only `client.ts` makes a point in time of them.
 */
export type Session = {
  tokenType: 'Bearer';
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  refreshExpiresIn: number;
};

/**
 * `locale` and `timeZoneId` are the **effective** values, not the ones asked
 * for: the request is a wish, the response the truth about the resource
 * (`docs/decisions/2026-08-20-1230-die-zone-wird-normalisiert-und-kommt-zurueck.md`).
 */
export type AccountUser = {
  id: string;
  email: string;
  displayName: string;
  locale: Language;
  timeZoneId: string;
};

/** Account **and** session; the renewal delivers only `Session` and leaves the user store alone. */
export type SignIn = { user: AccountUser; session: Session };

/**
 * What comes back from `DELETE /identity/me`. The server does not delete right
 * away: it accepts (202) and names the point in time from which it takes
 * effect — an ISO-8601 instant in UTC, as the field name says. That is why this
 * response carries a body at all; a 204 would claim it had already happened.
 */
export type AccountDeletion = { deletionEffectiveUtc: string };

/** Nutrients per 100 g. Optional fields may be missing — then they are not set. */
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
 * Without `isFuture`, see
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
  /** From the `ETag` response header, not from the body; goes back unchanged as `If-Match`. */
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
 * Every field on its own — the screen saves in small part-payloads. Derived
 * values (`grams`, `kcal`) do not belong in a request.
 */
export type GoalsUpdate = {
  dailyKcal?: number;
  macros?: Partial<Record<'carbs' | 'protein' | 'fat', { percent: number }>>;
  energyStandard?: Goals['energyStandard'];
  rounding?: Goals['rounding'];
  includeActivityInGoal?: boolean;
};

/**
 * The confirmation screen sets `source` and `verifiedByUser`; which of them the
 * server adopts is his business.
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

/** What a recipe carries when saved. `etag` goes out as `If-Match`, not into the body. */
export type RecipeSave = {
  id: string;
  name: string;
  portions: number;
  ingredients: { id: string; productId: string; grams: number }[];
  etag?: string;
};

/** `language` is the same set as in `src/language.ts` — no second enumeration. */
export type Preferences = { theme: 'Dark' | 'Light'; language: Language };

export type HealthConsent = { connected: boolean; importActivity: boolean; exportNutrition: boolean };

/**
 * Step 1 of the photo upload. The server **co-signed** `uploadHeaders` — a map
 * from him and no list of the client's: if one header deviates, the object store
 * rejects the bytes.
 */
export type PhotoUploadTarget = {
  photoId: string;
  uploadUrl: string;
  uploadHeaders: Record<string, string>;
  /** Lifetime of the signature in seconds, counted from the response. */
  expiresIn: number;
};
