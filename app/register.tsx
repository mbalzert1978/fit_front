import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen, OutlineButton, FormField } from '../src/components';
import { useTheme } from '../src/theme/ThemeProvider';
import { register, minPasswordLength, maxDisplayNameLength } from '../src/api/session';
import { ApiError, OfflineError } from '../src/api/client';

/** Die Sätze aus `problem+json`, nach den Feldnamen des Rumpfes geordnet. */
type FieldHints = { displayName?: string[]; email?: string[]; password?: string[] };

/**
 * Was an die Felder gehört. Es redet der Server: er kennt seine Regeln, er
 * kennt den Bestand, und er schickt zu beidem Sätze. Die Maske hat für die
 * vergebene E-Mail einen eigenen Satz — aber nur als Rückfall, falls einmal
 * keiner mitkommt. Wo der Server spricht, schweigt sie.
 */
function fieldHintsFor(e: unknown): FieldHints {
  if (!(e instanceof ApiError)) return {};
  const vomServer = (e.errors ?? {}) as FieldHints;
  if (Object.keys(vomServer).length > 0) return vomServer;
  if (e.type === 'email-already-registered') return { email: ['Für diese E-Mail gibt es schon ein Konto'] };
  return {};
}

/** Was übrig bleibt, wenn kein einzelnes Feld schuld ist. */
function generalHintFor(e: unknown): string {
  if (e instanceof OfflineError) return 'Keine Verbindung';
  return 'Registrierung derzeit nicht möglich';
}

export default function RegisterScreen() {
  const t = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fields, setFields] = useState<FieldHints>({});
  const [hint, setHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /**
   * Ein Aufruf, ein Ausgang: die Registrierung legt das Konto an und liefert
   * dieselbe Sitzung wie die Anmeldung. Deshalb führt der Erfolg direkt ins
   * Tagebuch und nicht zurück auf die Anmeldemaske.
   */
  async function submit() {
    setBusy(true);
    setFields({});
    setHint(null);
    try {
      await register({ email: email.trim(), password, displayName: name.trim() });
      router.replace('/(tabs)/diary');
    } catch (e) {
      const named = fieldHintsFor(e);
      setFields(named);
      // Entweder das Feld sagt es oder die Zeile darunter — nie beides.
      setHint(Object.keys(named).length > 0 ? null : generalHintFor(e));
    } finally {
      setBusy(false);
    }
  }

  // Die eigene Regel steht vor dem Aufruf, nicht erst in seiner Antwort. Alles
  // Weitere prüft der Server; er kennt seine Regeln, die Maske nicht.
  const tooShort = password.length > 0 && password.length < minPasswordLength;
  const nameOk = name.trim().length > 0;

  return (
    <Screen>
      <Text style={[t.font.title, { color: t.color.text }]}>Konto anlegen</Text>
      <View style={{ gap: t.space[6], marginTop: t.space[8] }}>
        <FormField
          label="Name"
          hints={fields.displayName}
          value={name}
          onChangeText={setName}
          maxLength={maxDisplayNameLength}
          autoCapitalize="words"
          textContentType="name"
        />
        <FormField
          label="E-Mail"
          hints={fields.email}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          textContentType="username"
        />
        <FormField
          label="Passwort"
          hints={fields.password}
          note={`Mindestens ${minPasswordLength} Zeichen`}
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
          label={busy ? 'Konto wird angelegt …' : 'Konto anlegen'}
          onPress={submit}
          disabled={busy || !nameOk || !email || password.length < minPasswordLength}
        />
        {/* Zurück und nicht ersetzen: sonst stünde die Anmeldemaske zweimal im Stapel. */}
        <OutlineButton
          label="Ich habe schon ein Konto"
          variant="muted"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/login'))}
        />
      </View>
    </Screen>
  );
}
