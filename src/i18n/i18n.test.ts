import { preferLanguage, resetLanguageProvider } from '../language';
import { texts } from '.';
import { de } from './de';
import { en } from './en';

/** The fallback is the one rule of this layer that cannot be seen — hence it stands here. */
afterEach(resetLanguageProvider);

test('die Wahl schlägt die Gerätesprache', () => {
  preferLanguage('en');
  expect(texts().loginTitle).toBe('Sign in');
});

test('fehlt der englische Satz, kommt der deutsche', () => {
  preferLanguage('en');
  // `settingsHealth` is deliberately untranslated — a brand name.
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
