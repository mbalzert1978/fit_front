/**
 * Runs as `setupFiles`, hence before any import of the test module: the client
 * checks this value while importing. The address is a placeholder, not the mock
 * server - that one picks its own port and is handed to the client per
 * interaction by `against(...)` in `./setup`.
 */
process.env.EXPO_PUBLIC_API_URL = 'http://127.0.0.1';
