import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useSession } from '@/auth/session';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useTheme } from '@/theme/ThemeProvider';

/** Page de retour web. Le code est échangé par la session, puis retiré de l'URL. */
export default function AuthCallback() {
  const theme = useTheme();
  const session = useSession();

  useEffect(() => {
    if (session.status === 'authenticated') router.replace('/');
    else if (session.status === 'anonymous' && session.notice) router.replace('/login');
  }, [session.status, session.notice]);

  return (
    <Screen>
      <View style={styles.center}>
        <ActivityIndicator color={theme.accent} />
        <Text variant="body" color="muted">
          Connexion
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
});
