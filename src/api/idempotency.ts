import { useRef } from 'react';
import { newId } from './ids';

/**
 * The idempotency key for one attempt. It hangs on the **data**, not on the
 * keypress: typing the same thing twice is the same attempt, and the same key
 * on another body is an error
 * (`docs/decisions/2026-08-21-1104-der-schluessel-haengt-am-ganzen-rumpf.md`).
 *
 * Here and not in a screen: two forms — registration and the password reset —
 * carry the same rule, and twice the same rule is twice the chance of drifting
 * apart.
 */
export function useIdempotencyKey() {
  const attempt = useRef<{ payload: string; key: string } | null>(null);
  return (body: object) => {
    const payload = JSON.stringify(body);
    if (attempt.current?.payload !== payload) attempt.current = { payload, key: newId() };
    return attempt.current.key;
  };
}
