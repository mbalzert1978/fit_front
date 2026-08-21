import * as Crypto from 'expo-crypto';

/** Client-side, so an entry recorded offline already has its final id — and its idempotency key. */
export const newId = () => Crypto.randomUUID();
