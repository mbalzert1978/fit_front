import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

/** Title, subtitle and a value on the right. `onPress` makes it tappable (≥ 44 pt high). */
export function ListRow({
  title,
  subtitle,
  value,
  valueSub,
  onPress,
  right,
}: {
  title: string;
  subtitle?: string;
  value?: string;
  valueSub?: string;
  onPress?: () => void;
  right?: React.ReactNode;
}) {
  const t = useTheme();
  const body = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.space[4],
        minHeight: t.hit,
        paddingVertical: t.space[3],
        borderBottomWidth: 1,
        borderBottomColor: t.color.divider,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={[t.font.body, { color: t.color.text }]}>{title}</Text>
        {subtitle ? <Text style={[t.font.micro, { color: t.color.textMuted, marginTop: 2 }]}>{subtitle}</Text> : null}
      </View>
      {value ? (
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[t.font.body, t.tabular, { color: t.color.text }]}>{value}</Text>
          {valueSub ? <Text style={[t.font.micro, { color: t.color.textMuted, marginTop: 2 }]}>{valueSub}</Text> : null}
        </View>
      ) : null}
      {right}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
      {body}
    </Pressable>
  );
}
