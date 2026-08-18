import React, { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Screen, OutlineButton } from '../src/components';
import { useTheme } from '../src/theme/ThemeProvider';
import { login } from '../src/api/session';
import { ApiError } from '../src/api/client';

export default function LoginScreen() {
  const t = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [failed, setFailed] = useState(false);
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

  async function submit() {
    setBusy(true);
    setFailed(false);
    try {
      await login(email.trim(), password);
      router.replace('/(tabs)/diary');
    } catch (e) {
      if (e instanceof ApiError) setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Text style={[t.font.title, { color: t.color.text }]}>Anmelden</Text>
      <View style={{ marginTop: t.space[8] }}>
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
        <TextInput value={password} onChangeText={setPassword} secureTextEntry textContentType="password" style={[t.font.body, field]} />
      </View>
      <View style={{ marginTop: t.space[8] }}>
        <OutlineButton label={busy ? 'Anmelden …' : 'Anmelden'} onPress={submit} disabled={busy || !email || !password} />
      </View>
    </Screen>
  );
}
