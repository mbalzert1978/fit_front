import React, { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen, OutlineButton, FormField } from '../src/components';
import { useTheme } from '../src/theme/ThemeProvider';
import { useTexts, type Texts } from '../src/i18n';
import { register, registrationRequest, minPasswordLength, maxDisplayNameLength, type RegistrationRequest } from '../src/api/session';
import { ApiError, OfflineError } from '../src/api/client';
import { problems } from '../src/api/problems';
import { newId } from '../src/api/ids';

/** Die Felder, die diese Maske zeigt. Wozu sie keines hat, kann sie nicht anstreichen. */
const visibleFields = ['displayName', 'email', 'password'] as const;
type VisibleField = (typeof visibleFields)[number];

/** Die Sätze aus `problem+json`, nach den Feldnamen des Anfrage-Rumpfes geordnet. */
type FieldHints = Partial<Record<VisibleField, string[]>>;

/**
 * Trennt, was an ein Feld gehört, von dem, was hier kein Feld hat. Der Server
 * prüft mehr, als die Maske abfragt; fienge niemand das auf, scheiterte die
 * Registrierung **stumm** — nur ein Knopf, der wieder angeht.
 */
function splitHints(errors: Record<string, string[]>) {
  const fields: FieldHints = {};
  const general: string[] = [];
  for (const [field, messages] of Object.entries(errors)) {
    if ((visibleFields as readonly string[]).includes(field)) fields[field as VisibleField] = messages;
    else general.push(...messages);
  }
  return { fields, general };
}

/** Die feldweisen Begründungen, wenn welche kamen. */
function errorsOf(e: unknown): Record<string, string[]> {
  return e instanceof ApiError ? (e.errors ?? {}) : {};
}

/**
 * Die Zeile unter den Feldern. Der Server redet zuerst, die Maske reicht durch
 * und übersetzt nichts
 * (`docs/decisions/2026-08-20-1209-der-satz-zum-vorfall-steht-in-detail.md`).
 */
function generalHintFor(e: unknown, general: string[], txt: Texts): string | null {
  if (general.length > 0) return general.join(' ');
  if (e instanceof OfflineError) return txt.noConnection;
  if (e instanceof ApiError) return e.detail ?? txt.registerFailed;
  return txt.registerFailed;
}

/**
 * Der Idempotency-Key hängt an den **Daten**, nicht am Tastendruck: zweimal
 * dasselbe getippt ist derselbe Versuch. Und er hängt am **ganzen** Rumpf, samt
 * Sprache und Zone, die kein Feld der Maske sind und sich trotzdem ändern
 * können — derselbe Schlüssel an einem anderen Rumpf ist ein Fehler
 * (`docs/decisions/2026-08-21-1104-der-schluessel-haengt-am-ganzen-rumpf.md`).
 */
function useIdempotencyKey() {
  const attempt = useRef<{ payload: string; key: string } | null>(null);
  return (r: RegistrationRequest) => {
    const payload = JSON.stringify(r);
    if (attempt.current?.payload !== payload) attempt.current = { payload, key: newId() };
    return attempt.current.key;
  };
}

export default function RegisterScreen() {
  const t = useTheme();
  const txt = useTexts();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fields, setFields] = useState<FieldHints>({});
  // Die vergebene E-Mail steht in keinem `errors`-Eintrag: sie verstößt gegen
  // keine Feldregel. Rot wird das Feld trotzdem — gemeint ist genau dieses.
  const [conflict, setConflict] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const keyFor = useIdempotencyKey();

  /** Ein Aufruf, ein Ausgang — deshalb führt der Erfolg direkt ins Tagebuch und nicht zur Anmeldung. */
  async function submit() {
    setBusy(true);
    setFields({});
    setConflict(false);
    setHint(null);
    try {
      const request = registrationRequest({ email: email.trim(), password, displayName: name.trim() });
      await register(request, keyFor(request));
      router.replace('/(tabs)/diary');
    } catch (e) {
      const { fields: named, general } = splitHints(errorsOf(e));
      setFields(named);
      setConflict(e instanceof ApiError && e.type === problems.emailAlreadyRegistered);
      setHint(generalHintFor(e, general, txt));
    } finally {
      setBusy(false);
    }
  }

  // Die eine eigene Regel steht vor dem Aufruf; alles Weitere prüft der Server.
  const tooShort = password.length > 0 && password.length < minPasswordLength;
  const nameOk = name.trim().length > 0;

  return (
    <Screen>
      <Text style={[t.font.title, { color: t.color.text }]}>{txt.registerTitle}</Text>
      <View style={{ gap: t.space[6], marginTop: t.space[8] }}>
        <FormField
          label={txt.registerName}
          hints={fields.displayName}
          value={name}
          onChangeText={setName}
          maxLength={maxDisplayNameLength}
          autoCapitalize="words"
          textContentType="name"
        />
        <FormField
          label={txt.loginEmail}
          hints={fields.email}
          invalid={conflict}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          textContentType="username"
        />
        <FormField
          label={txt.loginPassword}
          hints={fields.password}
          note={txt.registerPasswordNote(minPasswordLength)}
          noteInvalid={tooShort}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="newPassword"
        />
      </View>
      {hint ? <Text style={[t.font.micro, { color: t.color.accent, marginTop: t.space[4] }]}>{hint}</Text> : null}
      <View style={{ gap: t.space[4], marginTop: t.space[8] }}>
        <OutlineButton
          label={busy ? txt.registerBusy : txt.registerTitle}
          onPress={submit}
          disabled={busy || !nameOk || !email || password.length < minPasswordLength}
        />
        {/* Zurück und nicht ersetzen: sonst stünde die Anmeldemaske zweimal im Stapel. */}
        <OutlineButton
          label={txt.registerToLogin}
          variant="muted"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/login'))}
        />
      </View>
    </Screen>
  );
}
