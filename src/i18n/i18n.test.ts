import { preferLanguage, resetLanguageProvider } from '../language';
import { texts } from '.';
import { de } from './de';
import { en } from './en';

/** Der Rückfall ist die eine Regel dieser Schicht, die man nicht sieht — deshalb steht sie hier. */
afterEach(resetLanguageProvider);

test('die Wahl schlägt die Gerätesprache', () => {
  preferLanguage('en');
  expect(texts().loginTitle).toBe('Sign in');
});

test('fehlt der englische Satz, kommt der deutsche', () => {
  preferLanguage('en');
  // `settingsHealth` ist absichtlich nicht übersetzt — ein Markenname.
  expect(en.settingsHealth).toBeUndefined();
  expect(texts().settingsHealth).toBe(de.settingsHealth);
});

test('kein Schlüssel bleibt ohne Satz', () => {
  preferLanguage('en');
  const english = texts();
  for (const key of Object.keys(de) as (keyof typeof de)[]) {
    expect(english[key]).toBeDefined();
  }
});
