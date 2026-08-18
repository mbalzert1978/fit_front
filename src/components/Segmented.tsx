import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

/** Reihe gleich breiter Felder, Trennung durch 1-px-Linien. Kein Radius auf den Feldern. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: t.color.divider }}>
      {options.map((o, i) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={{
              flex: 1,
              minHeight: t.hit,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: active ? t.color.accentWash : 'transparent',
              borderLeftWidth: i === 0 ? 0 : 1,
              borderLeftColor: t.color.divider,
            }}
          >
            <Text style={[t.font.body, { color: active ? t.color.accent : t.color.textMuted }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
