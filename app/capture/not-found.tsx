import React from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen, OutlineButton } from '../../src/components';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useTexts } from '../../src/i18n';

export default function NotFoundScreen() {
  const t = useTheme();
  const txt = useTexts();
  const params = useLocalSearchParams<Record<string, string>>();

  return (
    <Screen>
      <Text style={[t.font.title, { color: t.color.text }]}>{txt.notFoundTitle}</Text>
      <Text style={[t.font.body, t.tabular, { color: t.color.textMuted, marginTop: t.space[3] }]}>{params.barcode}</Text>
      <Text style={[t.font.body, { color: t.color.textMuted, marginTop: t.space[4] }]}>{txt.notFoundExplain}</Text>
      <View style={{ gap: t.space[4], marginTop: t.space[8] }}>
        <OutlineButton label={txt.notFoundPhoto} onPress={() => router.push({ pathname: '/capture/photo', params })} />
        <OutlineButton label={txt.notFoundManual} onPress={() => router.push({ pathname: '/capture/confirm', params })} />
        <OutlineButton label={txt.notFoundRescan} variant="muted" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}
