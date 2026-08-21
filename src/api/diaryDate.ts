import { format } from 'date-fns';
import { time } from '../time';

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

/**
 * „Heute" ist die Zeit des Geräts, und die kommt aus der Naht in `src/time.ts`
 * statt aus einem `new Date()` mitten im Code — sonst prüft jeder Test an jedem
 * Tag etwas anderes.
 */
export const today = () => toDiaryDate(time.now());
