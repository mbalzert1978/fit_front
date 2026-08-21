import type { DiaryDate } from './api/diaryDate';

/**
 * Wandert vom Start des Scans durch den ganzen Ablauf — deshalb stellt
 * `/product/[id]` Mahlzeit und Datum nicht noch einmal zur Auswahl.
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
