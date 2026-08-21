import type { DiaryDate } from './api/diaryDate';

/**
 * Travels from the start of the scan through the whole flow — which is why
 * `/product/[id]` does not offer meal and date for choosing again.
 */
export type CaptureContext = {
  date: DiaryDate;
  slotId?: string;
  /** diary: an entry in the diary · recipe: an ingredient in the open recipe */
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
