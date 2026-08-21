import { __reset } from './stubs/expoSecureStore';

/**
 * A test that assures a 401 makes the client sign out and delete the session.
 * Without this reset the next test in the same module would send no
 * `Authorization` header and write a different contract than the one meant.
 */
beforeEach(__reset);
