import React from 'react';
import { Pressable, Text } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

/** The one button shape of the app; a filled one does not exist (`.rules/app/abnahme.md`). */
export function OutlineButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
}: {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'muted';
  disabled?: boolean;
}) {
  const t = useTheme();
  const line = variant === 'primary' ? t.color.accent : t.color.neutral600;
  const ink = variant === 'primary' ? t.color.accent : t.color.textMuted;
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => ({
        borderWidth: 1,
        borderColor: line,
        borderRadius: t.radius.md,
        backgroundColor: pressed && !disabled ? t.color.accentWash : 'transparent',
        minHeight: t.hit,
        justifyContent: 'center',
        paddingHorizontal: t.space[4],
        opacity: disabled ? 0.45 : 1,
      })}
    >
      <Text style={[t.font.body, { color: ink, textAlign: 'left' }]}>{label}</Text>
    </Pressable>
  );
}
