import {
  BarlowCondensed_600SemiBold,
  BarlowCondensed_700Bold,
  BarlowCondensed_800ExtraBold,
} from '@expo-google-fonts/barlow-condensed';
import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
} from '@expo-google-fonts/figtree';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { UpdateBanner } from '@/components/ui/update-banner';
import { Colors, FontFamily } from '@/constants/theme';
import { purgeGeneratedPdfs, purgeSavedPdfs } from '@/lib/pdf-cache';

// Keep the red splash up until the brand fonts are in, so the first frame is
// never set in the fallback font.
SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const palette = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const baseTheme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;
  const [fontsLoaded, fontError] = useFonts({
    BarlowCondensed_600SemiBold,
    BarlowCondensed_700Bold,
    BarlowCondensed_800ExtraBold,
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
  });
  const ready = fontsLoaded || fontError !== null;

  // Clear the temporary PDFs left in the cache, and the ones written into the
  // user's folder that have outlived their use.
  React.useEffect(() => {
    purgeGeneratedPdfs();
    purgeSavedPdfs();
  }, []);

  React.useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [ready]);

  if (!ready) {
    return null;
  }

  return (
    // Required for react-native-gesture-handler to receive touches on Android,
    // and it gives the banner and the navigator a defined column layout.
    <GestureHandlerRootView style={styles.root}>
      <ThemeProvider
        value={{
          ...baseTheme,
          colors: {
            ...baseTheme.colors,
            background: palette.background,
            card: palette.background,
            primary: palette.accent,
            text: palette.text,
            border: palette.line,
            notification: palette.accent,
          },
        }}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        {/* Above the navigator so it takes its own space and never covers a control. */}
        <UpdateBanner />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: palette.background },
            headerTintColor: palette.text,
            headerShadowVisible: false,
            contentStyle: { backgroundColor: palette.background },
            headerTitleStyle: {
              fontFamily: FontFamily.display,
              fontSize: 22,
              color: palette.text,
            },
          }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="history" options={{ title: 'HISTORIQUE' }} />
          <Stack.Screen name="report/new" options={{ title: 'NOUVEAU RAPPORT' }} />
          <Stack.Screen name="report/[id]" options={{ title: 'RAPPORT' }} />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
