import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { useColorScheme } from 'react-native';

import { APP_SHORT_NAME } from '@/constants/company';
import { Colors } from '@/constants/theme';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const palette = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const baseTheme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;

  return (
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
        <Stack.Screen
          name="report/new"
          options={{ title: APP_SHORT_NAME }}
        />
      </Stack>
    </ThemeProvider>
  );
}
