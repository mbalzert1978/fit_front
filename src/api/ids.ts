import * as Crypto from 'expo-crypto';

/**
 * Ids erzeugt der Client, damit ein offline erfasster Eintrag schon seine
 * endgültige Id hat. Dieselbe Id dient als Idempotency-Key des Schreibvorgangs.
 */
export const newId = () => Crypto.randomUUID();
