import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen, OutlineButton, FormField } from '../src/components';
import { useTheme } from '../src/theme/ThemeProvider';
import { login } from '../src/api/session';
import { ApiError, OfflineError } from '../src/api/client';

export default function LoginScreen() {
  const t = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [failed, setFailed] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /**
   * Jeder Ausgang außer „angemeldet" wird sichtbar. Zuvor blieb alles stumm,
   * was kein `ApiError` war — eine unerwartete Antwortform etwa aktivierte den
   * Knopf einfach wieder, ohne dass irgendetwas auf dem Schirm stand.
   *
   * Beide Felder werden rot, nicht eines: bei falschen Anmeldedaten sagt der
   * Server nicht, welches der beiden gemeint ist, und er soll es auch nicht.
   */
  async function submit() {
    setBusy(true);
    setFailed(false);
    setHint(null);
    try {
      await login(email.trim(), password);
      router.replace('/(tabs)/diary');
    } catch (e) {
      setFailed(true);
      if (e instanceof OfflineError) setHint('Keine Verbindung');
      else if (e instanceof ApiError && e.type === 'invalid-credentials') setHint(null);
      else setHint('Anmeldung derzeit nicht möglich');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Text style={[t.font.title, { color: t.color.text }]}>Anmelden</Text>
      <View style={{ gap: t.space[6], marginTop: t.space[8] }}>
        <FormField
          label="E-Mail"
          invalid={failed}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          textContentType="username"
        />
        <FormField
          label="Passwort"
          invalid={failed}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="password"
        />
      </View>
      {hint ? <Text style={[t.font.micro, { color: t.color.accent, marginTop: t.space[4] }]}>{hint}</Text> : null}
      <View style={{ gap: t.space[4], marginTop: t.space[8] }}>
        <OutlineButton label={busy ? 'Anmelden …' : 'Anmelden'} onPress={submit} disabled={busy || !email || !password} />
        {/* Ohne diesen Weg käme niemand in die App, der noch kein Konto hat. */}
        <OutlineButton label="Konto anlegen" variant="muted" onPress={() => router.push('/register')} />
      </View>
    </Screen>
  );
}
