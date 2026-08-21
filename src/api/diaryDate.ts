import { format } from 'date-fns';
import { time } from '../time';

/**
 * Calendar day as its own type. Never hand a Date object to the API: a diary
 * day has no time of day and no time zone.
 */
export type DiaryDate = string & { readonly __brand: 'DiaryDate' };

export function toDiaryDate(d: Date): DiaryDate {
  return format(d, 'yyyy-MM-dd') as DiaryDate;
}

export function parseDiaryDate(s: string): DiaryDate {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new Error(`Kein Kalendertag: ${s}`);
  return s as DiaryDate;
}

/** Through the seam in `src/time.ts`, so a test can set the day. */
export const today = () => toDiaryDate(time.now());
