import { format } from 'date-fns';

/**
 * Kalendertag als eigener Typ (Gegenstück zu DiaryDate im Backend).
 * Nie ein Date-Objekt an die API geben: ein Tagebuchtag hat keine Uhrzeit und
 * keine Zeitzone. Zeitpunkte kommen dagegen als DateTimeOffset-String zurück.
 */
export type DiaryDate = string & { readonly __brand: 'DiaryDate' };

export function toDiaryDate(d: Date): DiaryDate {
  return format(d, 'yyyy-MM-dd') as DiaryDate;
}

export function parseDiaryDate(s: string): DiaryDate {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new Error(`Kein Kalendertag: ${s}`);
  return s as DiaryDate;
}

export const today = () => toDiaryDate(new Date());
