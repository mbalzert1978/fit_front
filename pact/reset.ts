import { __reset } from './stubs/expoSecureStore';

/**
 * Laeuft als `setupFilesAfterEnv`, also nachdem Jest die Testumgebung gebaut
 * hat. Ein Test, der eine 401 zusichert, laesst den Client abmelden — dabei
 * loescht er die Sitzung. Ohne diesen Rueckfall stuende der naechste Test im
 * selben Modul ohne Access-Token da und schickte keinen `Authorization`-Header
 * mehr, was einen ganz anderen Vertrag erzeugte als den gemeinten.
 */
beforeEach(__reset);
