import React, { useEffect, useState } from 'react';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider } from '../src/theme/ThemeProvider';
import { themes, defaultMode, type ThemeMode } from '../src/theme';
import { hasSession } from '../src/api/session';
import { onSignedOut } from '../src/api/client';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } });

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold });
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  // Startmodus: bis /preferences gelesen ist, gilt der Standard (dunkel).
  const [initialMode] = useState<ThemeMode>(defaultMode);

  useEffect(() => {
    hasSession().then(setSignedIn);
  }, []);

  /**
   * Endet die Sitzung — abgelaufener Refresh-Token, verworfene Sitzung, später
   * ein Abmelden von Hand —, dann fällt der Cache und der Weg führt zur
   * Anmeldung. Ohne das bliebe der Nutzer auf den Tabs stehen, sähe die zuletzt
   * geladenen Werte weiter und käme mangels Zurück-Pfeil nirgends hin.
   */
  useEffect(() => {
    onSignedOut(() => {
      queryClient.clear();
      setSignedIn(false);
      router.replace('/login');
    });
  }, []);

  if (!fontsLoaded || signedIn === null) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider initialMode={initialMode}>
          <StatusBar style={initialMode === 'dark' ? 'light' : 'dark'} />
          <Stack
            initialRouteName={signedIn ? '(tabs)' : 'login'}
            screenOptions={{ headerShown: false, contentStyle: { backgroundColor: themes[initialMode].color.bg } }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="login" />
            <Stack.Screen name="register" />
            {/* Detailscreens liegen über der Tab-Leiste, als Modal ohne Zurück-Pfeil. */}
            <Stack.Screen name="product/[id]" options={{ presentation: 'modal' }} />
            <Stack.Screen name="entry/[id]" options={{ presentation: 'modal' }} />
            <Stack.Screen name="recipe/[id]" options={{ presentation: 'modal' }} />
            <Stack.Screen name="capture/not-found" options={{ presentation: 'modal' }} />
            <Stack.Screen name="capture/photo" options={{ presentation: 'modal' }} />
            <Stack.Screen name="capture/processing" options={{ presentation: 'modal', gestureEnabled: false }} />
            <Stack.Screen name="capture/confirm" options={{ presentation: 'modal' }} />
          </Stack>
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
