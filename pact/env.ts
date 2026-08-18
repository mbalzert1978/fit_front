import { MOCK_PORT } from './mockPort';

/** Laeuft als `setupFiles`, also vor jedem Import des Testmoduls. */
process.env.EXPO_PUBLIC_API_URL = `http://127.0.0.1:${MOCK_PORT}`;
