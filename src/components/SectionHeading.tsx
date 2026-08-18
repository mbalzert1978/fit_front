import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

/** Überschrift im Label-Stil mit Haarlinie darunter. Rechts optional eine Aktion. */
export function SectionHeading({ children, right }: { children: string; right?: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ marginTop: t.space[8], marginBottom: t.space[3] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 34 }}>
        <Text style={[t.font.label, { color: t.color.textMuted }]}>{children}</Text>
        {right}
      </View>
      <View style={{ height: 1, backgroundColor: t.color.divider, marginTop: t.space[2] }} />
    </View>
  );
}
