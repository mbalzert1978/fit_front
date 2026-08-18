import type { DiaryDate } from './api/diaryDate';

/**
 * Ziel-Mahlzeit und Datum werden beim Start des Scans mitgegeben und wandern
 * durch den ganzen Ablauf. Auf /product/[id] werden sie deshalb nicht noch
 * einmal zur Auswahl gestellt.
 */
export type CaptureContext = {
  date: DiaryDate;
  slotId?: string;
  /** diary: Eintrag ins Tagebuch · recipe: Zutat ins offene Rezept */
  target: 'diary' | 'recipe';
  recipeId?: string;
  barcode?: string;
  photoId?: string;
};

export function ctxParams(c: CaptureContext): Record<string, string> {
  const out: Record<string, string> = { date: c.date, target: c.target };
  if (c.slotId) out.slotId = c.slotId;
  if (c.recipeId) out.recipeId = c.recipeId;
  if (c.barcode) out.barcode = c.barcode;
  if (c.photoId) out.photoId = c.photoId;
  return out;
}
