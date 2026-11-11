// Imports par sous-chemin : sinon tous les poids finissent dans l'APK.
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono/400Regular';
import { JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono/500Medium';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { ShieldAlert } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { queryClient } from '@/api/queryClient';
import { AppUpdateBanner } from '@/components/AppUpdate';
import { SessionProvider, signOut, useSession } from '@/auth/session';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { ToastProvider } from '@/components/Toast';
import { ThemeProvider, useThemeContext } from '@/theme/ThemeProvider';

SplashScreen.preventAutoHideAsync().catch(() => {});

const webStyles = StyleSheet.create({
  stage: {
    flex: 1,
    height: '100vh' as unknown as number,
    backgroundColor: '#050505',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phone: {
    width: 390,
    height: 844,
    maxWidth: '100%',
    maxHeight: '100%',
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: 28,
  },
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
  });

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <ThemeProvider>
          <SessionProvider>
            <ToastProvider>
              <WebFrame>
                <Gate fontsReady={fontsLoaded || !!fontError} />
              </WebFrame>
            </ToastProvider>
          </SessionProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

/** Cadre téléphone, uniquement dans le navigateur. */
function WebFrame({ children }: { children: React.ReactNode }) {
  const { theme } = useThemeContext();
  if (Platform.OS !== 'web') return <>{children}</>;
  return (
    <View style={webStyles.stage}>
      <View style={[webStyles.phone, { backgroundColor: theme.canvas, borderColor: theme.lineStrong }]}>
        {children}
      </View>
    </View>
  );
}

function Gate({ fontsReady }: { fontsReady: boolean }) {
  const { theme, ready: themeReady } = useThemeContext();
  const session = useSession();
  const ready = fontsReady && themeReady && session.status !== 'loading';

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  const authed = session.status === 'authenticated';

  // 403 ACCOUNT_BLOCKED : ecran plein, pas de retry automatique.
  if (authed && session.blocked) {
    return (
      <>
        <StatusBar style={theme.isDark ? 'light' : 'dark'} />
        <Screen>
          <EmptyState
            icon={ShieldAlert}
            title="Compte indisponible"
            text={session.blocked}
            actionLabel="Se déconnecter"
            onAction={() => signOut()}
            actionLoading={session.signingOut}
          />
        </Screen>
        <AppUpdateBanner />
      </>
    );
  }

  return (
    <>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.canvas },
          animation: 'slide_from_right',
          animationDuration: 150,
        }}
      >
        <Stack.Protected guard={authed}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="services/bots/create" />
          <Stack.Screen name="services/bots/[id]" />
          <Stack.Screen name="services/bots/[id]/logs" />
          <Stack.Screen name="services/servers/[id]" />
          <Stack.Screen name="services/servers/[id]/file" />
          <Stack.Screen name="shop/[id]" />
          <Stack.Screen name="billing" />
          <Stack.Screen name="account/identity" />
          <Stack.Screen name="account/notifications" />
          <Stack.Screen name="account/email" />
          <Stack.Screen name="account/codes" />
          <Stack.Screen name="account/referral" />
          <Stack.Screen name="account/links" />
          <Stack.Screen name="account/adherent" />
        </Stack.Protected>
        <Stack.Protected guard={!authed}>
          <Stack.Screen name="login" options={{ animation: 'fade' }} />
          <Stack.Screen name="auth/callback" options={{ animation: 'none' }} />
        </Stack.Protected>
      </Stack>
      <AppUpdateBanner />
    </>
  );
}
