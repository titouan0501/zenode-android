import { Tabs } from 'expo-router/js-tabs';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useMe } from '@/api/queries';
import { signOut, useSession } from '@/auth/session';
import { Button } from '@/components/Button';
import { ErrorBanner } from '@/components/ErrorBanner';
import { Screen } from '@/components/Screen';
import { TabBar } from '@/components/TabBar';
import { Text } from '@/components/Text';
import { hasAccountIdentity } from '@/lib/account';
import { useTheme } from '@/theme/ThemeProvider';

export default function TabsLayout() {
  const theme = useTheme();
  const session = useSession();
  const me = useMe();
  const ready = hasAccountIdentity(me.data);

  if (!ready) {
    return (
      <Screen>
        <View style={styles.gate}>
          {me.isLoading ? (
            <>
              <ActivityIndicator color={theme.accent} />
              <Text variant="body" color="muted">
                Vérification du compte
              </Text>
            </>
          ) : me.isError ? (
            <>
              <Text variant="section" style={styles.center}>
                Compte indisponible
              </Text>
              <ErrorBanner error={me.error} onRetry={() => me.refetch()} />
              <Button
                label="Se déconnecter"
                variant="secondary"
                fullWidth
                loading={session.signingOut}
                onPress={() => signOut()}
              />
            </>
          ) : (
            <>
              <Text variant="section" style={styles.center}>
                Session inactive
              </Text>
              <Text variant="secondary" color="muted" style={styles.center}>
                Aucun compte n’est associé à cette session.
              </Text>
              <Button
                label="Retour à la connexion"
                variant="primary"
                fullWidth
                loading={session.signingOut}
                onPress={() => signOut()}
              />
            </>
          )}
        </View>
      </Screen>
    );
  }

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { flex: 1, backgroundColor: theme.canvas },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Accueil' }} />
      <Tabs.Screen name="services" options={{ title: 'Services' }} />
      <Tabs.Screen name="shop" options={{ title: 'Offres' }} />
      <Tabs.Screen name="support" options={{ title: 'Support' }} />
      {/* Profil : pousse depuis l'accueil, tab bar conservee, pas un 5e onglet. */}
      <Tabs.Screen name="profile" options={{ title: 'Profil', href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  gate: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 24 },
  center: { textAlign: 'center' },
});
