import React from 'react';
import { Tabs } from 'expo-router';
import { Text, View } from 'react-native';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useTexts } from '../../src/i18n';

/**
 * Vier Ziele, auf jedem Screen sichtbar, ohne Zurück-Pfeile (`docs/regeln.md`,
 * Prüfliste). Detailscreens liegen als Stack darüber und lassen ihren Tab aktiv.
 */
function TabLabel({ children, focused }: { children: string; focused: boolean }) {
  const t = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: 5, paddingTop: 10 }}>
      <View style={{ width: 6, height: 6, backgroundColor: focused ? t.color.accent : 'transparent' }} />
      <Text style={[t.font.label, { color: focused ? t.color.accent : t.color.textMuted }]}>{children}</Text>
    </View>
  );
}

export default function TabsLayout() {
  const t = useTheme();
  const txt = useTexts();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: t.color.bg,
          borderTopWidth: 1,
          borderTopColor: t.color.divider,
          height: 62,
        },
      }}
    >
      <Tabs.Screen name="diary" options={{ tabBarIcon: ({ focused }) => <TabLabel focused={focused}>{txt.tabDiary}</TabLabel> }} />
      <Tabs.Screen name="scan" options={{ tabBarIcon: ({ focused }) => <TabLabel focused={focused}>{txt.tabScan}</TabLabel> }} />
      <Tabs.Screen name="recipes" options={{ tabBarIcon: ({ focused }) => <TabLabel focused={focused}>{txt.tabRecipes}</TabLabel> }} />
      <Tabs.Screen name="settings" options={{ tabBarIcon: ({ focused }) => <TabLabel focused={focused}>{txt.tabMore}</TabLabel> }} />
    </Tabs>
  );
}
