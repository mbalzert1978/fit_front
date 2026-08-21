import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

/** 34 × 34 sichtbar; `hitSlop` hebt das Tippziel auf die geforderten 44 pt. */
export function SquareIconButton({ glyph, onPress, label }: { glyph: '+' | '−'; onPress?: () => void; label: string }) {
  const t = useTheme();
  const slop = (t.hit - 34) / 2;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={{ top: slop, bottom: slop, left: slop, right: slop }}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderWidth: 1,
          borderColor: t.color.accent,
          borderRadius: t.radius.md,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={[t.font.body, { color: t.color.accent, fontSize: 18, lineHeight: 20 }]}>{glyph}</Text>
      </View>
    </Pressable>
  );
}
