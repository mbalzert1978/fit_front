import React from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

/**
 * Textfeld mit Platz für das, was daran nicht stimmt.
 *
 * `hints` sind die Sätze aus `problem+json` und stehen **am Feld**, nicht in
 * einer Sammelzeile: sonst müsste der Nutzer raten, welches gemeint ist. `note`
 * ist der eigene Hinweis der Maske und weicht, sobald der Server redet.
 */
export function FormField({
  label,
  hints,
  note,
  noteInvalid = false,
  invalid = false,
  ...input
}: {
  label: string;
  hints?: string[];
  note?: string;
  noteInvalid?: boolean;
  invalid?: boolean;
} & TextInputProps) {
  const t = useTheme();
  const messages = hints ?? [];
  const wrong = invalid || messages.length > 0;

  return (
    <View>
      <Text style={[t.font.label, { color: t.color.textMuted }]}>{label}</Text>
      <TextInput
        {...input}
        style={[
          t.font.body,
          {
            color: t.color.text,
            backgroundColor: t.color.inputBg,
            borderWidth: 1,
            borderColor: wrong ? t.color.accent : t.color.neutral600,
            borderRadius: t.radius.md,
            paddingHorizontal: t.space[3],
            minHeight: t.hit,
            marginTop: t.space[3],
          },
        ]}
      />
      {messages.map((h) => (
        <Text key={h} style={[t.font.micro, { color: t.color.accent, marginTop: t.space[2] }]}>
          {h}
        </Text>
      ))}
      {messages.length === 0 && note ? (
        <Text style={[t.font.micro, { color: noteInvalid ? t.color.accent : t.color.textMuted, marginTop: t.space[2] }]}>{note}</Text>
      ) : null}
    </View>
  );
}
