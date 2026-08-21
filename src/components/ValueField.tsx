import React from 'react';
import { Text, TextInput, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

/** Numerisches Feld, rechtsbündig. `missing` streicht einen fehlenden Pflichtwert an. */
export function ValueField({
  value,
  onChangeText,
  unit,
  missing = false,
  large = false,
  placeholder,
}: {
  value: string;
  onChangeText: (v: string) => void;
  unit?: string;
  missing?: boolean;
  large?: boolean;
  placeholder?: string;
}) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space[2] }}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={t.color.textMuted}
        keyboardType="decimal-pad"
        style={[
          large ? t.font.display : t.font.body,
          t.tabular,
          {
            color: t.color.text,
            backgroundColor: t.color.inputBg,
            borderWidth: missing ? 2 : 1,
            borderColor: missing ? t.color.accent : t.color.neutral600,
            borderRadius: t.radius.md,
            paddingHorizontal: t.space[3],
            paddingVertical: large ? t.space[4] : t.space[3],
            minWidth: large ? 160 : 84,
            minHeight: t.hit,
            textAlign: 'right',
          },
        ]}
      />
      {unit ? <Text style={[t.font.body, { color: t.color.textMuted, width: 26 }]}>{unit}</Text> : null}
    </View>
  );
}
