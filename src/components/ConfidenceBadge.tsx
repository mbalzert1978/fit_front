import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

export type Confidence = 'sicher' | 'pruefen' | 'unsicher' | 'fehlt';

/** Ableitung aus dem confidence-Wert der API. Fehlender Wert → 'fehlt'. */
export function confidenceOf(confidence: number | null | undefined, hasValue: boolean): Confidence {
  if (!hasValue || confidence == null) return 'fehlt';
  if (confidence >= 0.9) return 'sicher';
  if (confidence >= 0.7) return 'pruefen';
  return 'unsicher';
}

const text: Record<Confidence, string> = {
  sicher: 'SICHER',
  pruefen: 'PRÜFEN',
  unsicher: 'UNSICHER',
  fehlt: 'WERT FEHLT',
};

export function ConfidenceBadge({ level }: { level: Confidence }) {
  const t = useTheme();
  const accented = level === 'unsicher' || level === 'fehlt';
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: accented ? t.color.accent : t.color.divider,
        borderRadius: t.radius.sm,
        paddingHorizontal: t.space[2],
        paddingVertical: 1,
        marginTop: 3,
      }}
    >
      <Text style={[t.font.label, { color: accented ? t.color.accent : t.color.textMuted, fontSize: 10 }]}>{text[level]}</Text>
    </View>
  );
}
