import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { UpdateBanner } from '@/components/ui/update-banner';
import { APP_SHORT_NAME } from '@/constants/company';
import { Colors } from '@/constants/theme';
import { purgeGeneratedPdfs, purgeSavedPdfs } from '@/lib/pdf-cache';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const palette = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const baseTheme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;

  // Clear the temporary PDFs left in the cache, and the ones written into the
  // user's folder that have outlived their use.
  React.useEffect(() => {
    purgeGeneratedPdfs();
    purgeSavedPdfs();
  }, []);

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
            card: palette.backgroundElement,
            primary: palette.accent,
            text: palette.text,
            border: palette.backgroundSelected,
            notification: palette.accent,
          },
        }}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        {/* Above the navigator so it takes its own space and never covers a control. */}
        <UpdateBanner />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: palette.backgroundElement },
            headerTintColor: palette.accent,
            headerShadowVisible: false,
            contentStyle: { backgroundColor: palette.background },
            headerTitleStyle: {
              fontWeight: '700',
              color: palette.text,
            },
          }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="history" options={{ title: 'Rapports enregistrés' }} />
          <Stack.Screen name="report/new" options={{ title: 'Nouveau rapport' }} />
          <Stack.Screen name="report/[id]" options={{ title: APP_SHORT_NAME }} />
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
