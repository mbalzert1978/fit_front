import { MOCK_PORT } from './mockPort';

/** Runs as `setupFiles`, hence before any import of the test module. */
process.env.EXPO_PUBLIC_API_URL = `http://127.0.0.1:${MOCK_PORT}`;
