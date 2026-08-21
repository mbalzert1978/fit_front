import type { DiaryDate } from './diaryDate';
import type { Language } from '../language';

/** Für Support und Fehlersuche; kein Screen liest sie. `requestId` spiegelt `X-Request-Id`. */
export type Meta = { requestId: string; timestamp: string; apiVersion: string };

/** Ausgepackt genau einmal, in `client.ts` — deshalb steht er in keiner weiteren Signatur. */
export type Envelope<T> = { data: T; meta: Meta };

/**
 * Nach OAuth 2 benannt (RFC 6749 §5.1), in camelCase; `refreshExpiresIn` ist
 * eine Erweiterung, für die der RFC kein Feld hat.
 *
 * Die Laufzeiten sind **relativ in Sekunden** und keine Zeitstempel: die Uhr des
 * Clients geht falsch, und erst `client.ts` macht daran einen Zeitpunkt daraus.
 */
export type Session = {
  tokenType: 'Bearer';
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  refreshExpiresIn: number;
};

/**
 * `locale` und `timeZoneId` sind die **wirksamen** Werte, nicht die gefragten:
 * die Anfrage ist ein Wunsch, die Antwort die Wahrheit über die Ressource
 * (`docs/decisions/2026-08-20-1230-die-zone-wird-normalisiert-und-kommt-zurueck.md`).
 */
export type AccountUser = {
  id: string;
  email: string;
  displayName: string;
  locale: Language;
  timeZoneId: string;
};

/** Konto **und** Sitzung; die Erneuerung liefert nur `Session` und fasst den User-Store nicht an. */
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
 * Ohne `isFuture`, siehe
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
 * Jedes Feld für sich — der Screen speichert in kleinen Teilnutzlasten.
 * Abgeleitete Werte (`grams`, `kcal`) gehören nicht in eine Anfrage.
 */
export type GoalsUpdate = {
  dailyKcal?: number;
  macros?: Partial<Record<'carbs' | 'protein' | 'fat', { percent: number }>>;
  energyStandard?: Goals['energyStandard'];
  rounding?: Goals['rounding'];
  includeActivityInGoal?: boolean;
};

/**
 * `source` und `verifiedByUser` setzt der Bestätigungs-Screen; welchen Wert der
 * Server davon übernimmt, ist seine Sache.
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

/** `language` ist dieselbe Menge wie in `src/language.ts` — keine zweite Aufzählung. */
export type Preferences = { theme: 'Dark' | 'Light'; language: Language };

export type HealthConsent = { connected: boolean; importActivity: boolean; exportNutrition: boolean };

/**
 * Schritt 1 des Foto-Uploads. `uploadHeaders` hat der Server **mitsigniert** —
 * eine Abbildung von ihm und keine Liste des Clients: weicht ein Header ab,
 * weist der Objektspeicher die Bytes zurück.
 */
export type PhotoUploadTarget = {
  photoId: string;
  uploadUrl: string;
  uploadHeaders: Record<string, string>;
  /** Laufzeit der Signatur in Sekunden, gerechnet ab der Antwort. */
  expiresIn: number;
};
