import * as Crypto from 'expo-crypto';

/** Client-side, so an entry recorded offline already has its final id — and its idempotency key. */
export const newId = () => Crypto.randomUUID();

/**
 * The recipe that is not saved yet — the value stands in the route and shows
 * outwards, which is why it stays German (`docs/decisions/2026-08-21-1442-…`).
 */
export const NEW_RECIPE_ID = 'neu';
