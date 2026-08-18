import React from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen, OutlineButton } from '../../src/components';
import { useTheme } from '../../src/theme/ThemeProvider';

export default function NotFoundScreen() {
  const t = useTheme();
  const params = useLocalSearchParams<Record<string, string>>();

  return (
    <Screen>
      <Text style={[t.font.title, { color: t.color.text }]}>Produkt nicht gefunden</Text>
      <Text style={[t.font.body, t.tabular, { color: t.color.textMuted, marginTop: t.space[3] }]}>{params.barcode}</Text>
      <Text style={[t.font.body, { color: t.color.textMuted, marginTop: t.space[4] }]}>
        Dieser Barcode ist noch in keinem Katalog. Fotografiere die Nährwerttabelle — die Werte landen danach in deinem Katalog.
      </Text>
      <View style={{ gap: t.space[4], marginTop: t.space[8] }}>
        <OutlineButton label="Nährwerttabelle fotografieren" onPress={() => router.push({ pathname: '/capture/photo', params })} />
        <OutlineButton label="Werte manuell eingeben" onPress={() => router.push({ pathname: '/capture/confirm', params })} />
        <OutlineButton label="Erneut scannen" variant="muted" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}
