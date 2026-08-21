import { ApiError, OfflineError } from './client';
import type { Texts } from '../i18n';

/**
 * The line after a failed call. The server speaks first: `detail` is his
 * sentence about exactly this incident and goes on screen unchanged
 * (`docs/decisions/2026-08-20-1209-der-satz-zum-vorfall-steht-in-detail.md`).
 * Here and not in `problems.ts`: that one is imported by `client.ts`, where
 * `ApiError` lives.
 */
export function hintFor<F extends string | null>(e: unknown, txt: Texts, fallback: F): string | F {
  if (e instanceof OfflineError) return txt.noConnection;
  if (e instanceof ApiError) return e.detail ?? fallback;
  return fallback;
}
