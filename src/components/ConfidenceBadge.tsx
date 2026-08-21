import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useTexts, type Texts } from '../i18n';

export type Confidence = 'sure' | 'check' | 'unsure' | 'missing';

/** Derived from the API's confidence value. A missing value → 'missing'. */
export function confidenceOf(confidence: number | null | undefined, hasValue: boolean): Confidence {
  if (!hasValue || confidence == null) return 'missing';
  if (confidence >= 0.9) return 'sure';
  if (confidence >= 0.7) return 'check';
  return 'unsure';
}

const label = (txt: Texts, level: Confidence): string =>
  ({ sure: txt.confidenceSure, check: txt.confidenceCheck, unsure: txt.confidenceUnsure, missing: txt.confidenceMissing })[level];

export function ConfidenceBadge({ level }: { level: Confidence }) {
  const t = useTheme();
  const txt = useTexts();
  const accented = level === 'unsure' || level === 'missing';
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
      <Text style={[t.font.label, { color: accented ? t.color.accent : t.color.textMuted, fontSize: 10 }]}>{label(txt, level)}</Text>
    </View>
  );
}
