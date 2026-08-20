import React, { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Screen, OutlineButton } from '../src/components';
import { useTheme } from '../src/theme/ThemeProvider';
import { register, minPasswordLength, maxDisplayNameLength } from '../src/api/session';
import { ApiError, OfflineError } from '../src/api/client';

/** Was der Screen zu einem Fehler sagt. Alles andere wäre stumm. */
function hintFor(e: unknown): string | null {
  if (e instanceof OfflineError) return 'Keine Verbindung';
  if (e instanceof ApiError && e.type === 'email-already-registered') return 'Für diese E-Mail gibt es schon ein Konto';
  if (e instanceof ApiError && e.type === 'password-too-weak') return `Mindestens ${minPasswordLength} Zeichen`;
  return 'Registrierung derzeit nicht möglich';
}

export default function RegisterScreen() {
  const t = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [failed, setFailed] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const field = {
    color: t.color.text,
    backgroundColor: t.color.inputBg,
    borderWidth: 1,
    borderColor: failed ? t.color.accent : t.color.neutral600,
    borderRadius: t.radius.md,
    paddingHorizontal: t.space[3],
    minHeight: t.hit,
    marginTop: t.space[3],
  };

  /**
   * Ein Aufruf, ein Ausgang: die Registrierung legt das Konto an und liefert
   * dieselbe Sitzung wie die Anmeldung. Deshalb führt der Erfolg direkt ins
   * Tagebuch und nicht zurück auf die Anmeldemaske.
   */
  async function submit() {
    setBusy(true);
    setFailed(false);
    setHint(null);
    try {
      await register({ email: email.trim(), password, displayName: name.trim() });
      router.replace('/(tabs)/diary');
    } catch (e) {
      setFailed(true);
      setHint(hintFor(e));
    } finally {
      setBusy(false);
    }
  }

  // Die Regeln stehen vor dem Aufruf, nicht erst in seiner Antwort.
  const tooShort = password.length > 0 && password.length < minPasswordLength;
  const nameOk = name.trim().length > 0 && name.trim().length <= maxDisplayNameLength;

  return (
    <Screen>
      <Text style={[t.font.title, { color: t.color.text }]}>Konto anlegen</Text>
      <View style={{ marginTop: t.space[8] }}>
        <Text style={[t.font.label, { color: t.color.textMuted }]}>Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          maxLength={maxDisplayNameLength}
          autoCapitalize="words"
          textContentType="name"
          style={[t.font.body, field]}
        />
      </View>
      <View style={{ marginTop: t.space[6] }}>
        <Text style={[t.font.label, { color: t.color.textMuted }]}>E-Mail</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          textContentType="username"
          style={[t.font.body, field]}
        />
      </View>
      <View style={{ marginTop: t.space[6] }}>
        <Text style={[t.font.label, { color: t.color.textMuted }]}>Passwort</Text>
        <TextInput value={password} onChangeText={setPassword} secureTextEntry textContentType="newPassword" style={[t.font.body, field]} />
        <Text style={[t.font.micro, { color: tooShort ? t.color.accent : t.color.textMuted, marginTop: t.space[2] }]}>
          Mindestens {minPasswordLength} Zeichen
        </Text>
      </View>
      {hint ? <Text style={[t.font.micro, { color: t.color.accent, marginTop: t.space[4] }]}>{hint}</Text> : null}
      <View style={{ gap: t.space[4], marginTop: t.space[8] }}>
        <OutlineButton
          label={busy ? 'Konto wird angelegt …' : 'Konto anlegen'}
          onPress={submit}
          disabled={busy || !nameOk || !email || password.length < minPasswordLength}
        />
        <OutlineButton label="Ich habe schon ein Konto" variant="muted" onPress={() => router.replace('/login')} />
      </View>
    </Screen>
  );
}
