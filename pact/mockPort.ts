/**
 * Fixed, because `src/api/client.ts` reads `EXPO_PUBLIC_API_URL` into a
 * constant at module import — an assignment in the test comes too late.
 */
export const MOCK_PORT = 8991;
