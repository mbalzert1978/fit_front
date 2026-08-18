import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

/** Pillenschalter, 46 × 24, Knopf 18 px rund. */
export function Toggle({ value, onChange, label, hint }: { value: boolean; onChange: (v: boolean) => void; label?: string; hint?: string }) {
  const t = useTheme();
  const track = (
    <View
      style={{
        width: 46,
        height: 24,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: value ? t.color.accent : t.color.neutral600,
        backgroundColor: value ? t.color.accentWash : 'transparent',
        padding: 2,
        justifyContent: 'center',
        alignItems: value ? 'flex-end' : 'flex-start',
      }}
    >
      <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: value ? t.color.accent : t.color.neutral600 }} />
    </View>
  );
  if (!label) {
    return (
      <Pressable onPress={() => onChange(!value)} accessibilityRole="switch" accessibilityState={{ checked: value }} hitSlop={10}>
        {track}
      </Pressable>
    );
  }
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
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
        <Text style={[t.font.body, { color: t.color.text }]}>{label}</Text>
        {hint ? <Text style={[t.font.micro, { color: t.color.textMuted, marginTop: 2 }]}>{hint}</Text> : null}
      </View>
      {track}
    </Pressable>
  );
}

/**
 * Zwei Schalter, die sich gegenseitig ausschließen. Ein Zustand "beide aus"
 * existiert nicht: jeder Tipp auf einen der beiden Schalter kippt das Paar.
 * Rückgabewert einsetzen als: const p = useExclusivePair(mode === 'a', setter)
 */
export function useExclusivePair(firstActive: boolean, set: (firstActive: boolean) => void) {
  return {
    first: { value: firstActive, onChange: () => set(true) },
    second: { value: !firstActive, onChange: () => set(false) },
  };
}
