import React from 'react';
import { ScrollView, View, type ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

/** Seitenrahmen mit 20 px Seitenrand. scroll={false} für Screens mit eigener Liste/Kamera. */
export function Screen({ children, scroll = true, style }: { children: React.ReactNode; scroll?: boolean; style?: ViewStyle }) {
  const t = useTheme();
  const pad: ViewStyle = { paddingHorizontal: t.gutter, paddingTop: t.space[6], paddingBottom: t.space[8] * 2 };
  if (!scroll) {
    return <View style={[{ flex: 1, backgroundColor: t.color.bg }, pad, style]}>{children}</View>;
  }
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.color.bg }}
      contentContainerStyle={[pad, style]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}
