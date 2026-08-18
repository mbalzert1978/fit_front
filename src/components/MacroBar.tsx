import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

/**
 * Balken mit Bezeichnung, Ist- und Zielwert. Werte kommen ganzzahlig vom Server;
 * hier wird nicht gerundet und nichts umgerechnet.
 */
export function MacroBar({
  label,
  value,
  target,
  unit = 'g',
  height = 4,
}: {
  label: string;
  value: number;
  target: number;
  unit?: string;
  height?: number;
}) {
  const t = useTheme();
  const ratio = target > 0 ? Math.min(value / target, 1) : 0;
  return (
    <View style={{ flex: 1 }}>
      <Text style={[t.font.label, { color: t.color.textMuted }]}>{label}</Text>
      <Text style={[t.font.body, t.tabular, { color: t.color.text, marginTop: t.space[2] }]}>
        {value} {unit}
      </Text>
      <View style={{ height, backgroundColor: t.color.divider, marginTop: t.space[2] }}>
        <View style={{ width: `${ratio * 100}%`, height, backgroundColor: t.color.accent }} />
      </View>
      <Text style={[t.font.micro, t.tabular, { color: t.color.textMuted, marginTop: t.space[2] }]}>
        von {target} {unit}
      </Text>
    </View>
  );
}
