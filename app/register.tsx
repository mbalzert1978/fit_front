import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen, OutlineButton, FormField } from '../src/components';
import { useTheme } from '../src/theme/ThemeProvider';
import { useTexts } from '../src/i18n';
import { register, registrationRequest, minPasswordLength, maxPasswordLength, maxDisplayNameLength } from '../src/api/session';
import { ApiError } from '../src/api/client';
import { hintFor } from '../src/api/hints';
import { problems } from '../src/api/problems';
import { useIdempotencyKey } from '../src/api/idempotency';

/** The fields this form shows. What it has none for, it cannot mark up. */
const visibleFields = ['displayName', 'email', 'password'] as const;
type VisibleField = (typeof visibleFields)[number];

/** The sentences from `problem+json`, keyed by the field names of the request body. */
type FieldHints = Partial<Record<VisibleField, string[]>>;

/**
 * Splits what belongs to a field from what has no field here. The server checks
 * more than the form asks for; if nobody caught that, registration would fail
 * **silently** — only a button switching back on.
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

/** The per-field reasoning, where any arrived. */
function errorsOf(e: unknown): Record<string, string[]> {
  return e instanceof ApiError ? (e.errors ?? {}) : {};
}

export default function RegisterScreen() {
  const t = useTheme();
  const txt = useTexts();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fields, setFields] = useState<FieldHints>({});
  // A taken email stands in no `errors` entry: it violates no field rule. The
  // field turns red regardless — this one is exactly what is meant.
  const [conflict, setConflict] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // On the **whole** body, language and zone included: they are no field of the
  // form and can change between attempts anyway.
  const keyFor = useIdempotencyKey();

  /** One call, one outcome — hence success leads straight to the diary and not back to sign-in. */
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
      setHint(general.length > 0 ? general.join(' ') : hintFor(e, txt, txt.registerFailed));
    } finally {
      setBusy(false);
    }
  }

  // The two own rules stand before the call; everything else the server checks.
  // No `maxLength` on the field instead: cutting a pasted secret off in silence
  // would sign the user up with a password they never chose.
  const tooShort = password.length > 0 && password.length < minPasswordLength;
  const tooLong = password.length > maxPasswordLength;
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
          note={txt.registerPasswordNote(minPasswordLength, maxPasswordLength)}
          noteInvalid={tooShort || tooLong}
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
          disabled={busy || !nameOk || !email || password.length < minPasswordLength || tooLong}
        />
        {/* Back and not replace: otherwise the sign-in form would stand twice in the stack. */}
        <OutlineButton
          label={txt.registerToLogin}
          variant="muted"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/login'))}
        />
      </View>
    </Screen>
  );
}
