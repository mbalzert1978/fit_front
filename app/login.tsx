import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen, OutlineButton, FormField } from '../src/components';
import { useTheme } from '../src/theme/ThemeProvider';
import { useTexts } from '../src/i18n';
import { login } from '../src/api/session';
import { ApiError, OfflineError } from '../src/api/client';
import { problems } from '../src/api/problems';

export default function LoginScreen() {
  const t = useTheme();
  const txt = useTexts();
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
   *
   * Der Satz darunter ist seiner: `detail` erklärt genau diesen Vorfall, und er
   * kommt in der Sprache, in der gefragt wurde (`Accept-Language`, aus
   * `src/language.ts`). Ein eigener Satz stünde sonst deutsch neben einer
   * englischen Oberfläche — und wüsste dazu weniger. Eigene Sätze bleiben, wo
   * keiner kommt: beim Netzfehler und als letzter Rückfall.
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
      if (e instanceof OfflineError) setHint(txt.noConnection);
      else if (e instanceof ApiError) setHint(e.detail ?? (e.type === problems.invalidCredentials ? null : txt.loginFailed));
      else setHint(txt.loginFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Text style={[t.font.title, { color: t.color.text }]}>{txt.loginTitle}</Text>
      <View style={{ gap: t.space[6], marginTop: t.space[8] }}>
        <FormField
          label={txt.loginEmail}
          invalid={failed}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          textContentType="username"
        />
        <FormField
          label={txt.loginPassword}
          invalid={failed}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="password"
        />
      </View>
      {hint ? <Text style={[t.font.micro, { color: t.color.accent, marginTop: t.space[4] }]}>{hint}</Text> : null}
      <View style={{ gap: t.space[4], marginTop: t.space[8] }}>
        <OutlineButton label={busy ? txt.loginBusy : txt.loginTitle} onPress={submit} disabled={busy || !email || !password} />
        {/* Ohne diesen Weg käme niemand in die App, der noch kein Konto hat. */}
        <OutlineButton label={txt.loginToRegister} variant="muted" onPress={() => router.push('/register')} />
      </View>
    </Screen>
  );
}
