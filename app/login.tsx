import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Link2Off } from 'lucide-react-native';

import { WEB_EMULATOR } from '@/api/config';
import { clearNotice, enterWebSession, signIn, useSession } from '@/auth/session';
import { useAuthConfig } from '@/api/queries';
import type { Provider } from '@/api/types';
import { KNOWN_PROVIDERS } from '@/api/types';
import { DiscordIcon, GithubIcon, GoogleIcon } from '@/components/BrandIcons';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { ErrorBanner, messageOf } from '@/components/ErrorBanner';
import { LogoWordmark } from '@/components/Logo';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useTheme } from '@/theme/ThemeProvider';
import { DISCORD_COLOR } from '@/theme/tokens';

const LABELS: Record<Provider, { label: string; a11y: string }> = {
  discord: { label: 'Continuer avec Discord', a11y: 'Se connecter avec Discord' },
  google: { label: 'Continuer avec Google', a11y: 'Se connecter avec Google' },
  github: { label: 'Continuer avec GitHub', a11y: 'Se connecter avec GitHub' },
};

export default function Login() {
  const theme = useTheme();
  const session = useSession();
  const config = useAuthConfig();

  const providers = KNOWN_PROVIDERS.filter((p) => config.data?.providers.includes(p));
  const busy = session.busyProvider;

  function icon(provider: Provider) {
    switch (provider) {
      case 'discord':
        return <DiscordIcon color={DISCORD_COLOR} />;
      case 'google':
        return <GoogleIcon />;
      case 'github':
        return <GithubIcon color={theme.fg} />;
    }
  }

  return (
    <Screen scroll contentStyle={styles.content}>
      <View style={styles.center}>
        <View style={styles.brand}>
          <LogoWordmark size={48} fontSize={22} />
          <Text variant="body" color="muted">
            Espace client
          </Text>
        </View>

        <View style={styles.actions}>
          {session.notice ? <ErrorBanner message={session.notice} /> : null}

          {config.isLoading ? (
            <ActivityIndicator color={theme.accent} style={styles.loader} />
          ) : config.isError ? (
            <ErrorBanner error={config.error} onRetry={() => config.refetch()} />
          ) : WEB_EMULATOR ? (
            <>
              <Button
                label="Reprendre la session"
                size="xl"
                variant="primary"
                fullWidth
                onPress={() => {
                  clearNotice();
                  enterWebSession();
                }}
              />
              <Text variant="meta" color="subtle" style={styles.hint}>
                Session du site, réservée à l’émulateur.
              </Text>
            </>
          ) : providers.length === 0 ? (
            <EmptyState
              icon={Link2Off}
              title="Connexion indisponible"
              text="La connexion à l’espace client est momentanément désactivée."
            />
          ) : (
            <>
              {providers.map((p) => (
                <Button
                  key={p}
                  label={LABELS[p].label}
                  accessibilityLabel={LABELS[p].a11y}
                  size="xl"
                  variant="secondary"
                  fullWidth
                  icon={() => icon(p)}
                  loading={busy === p}
                  disabled={busy !== null && busy !== p}
                  onPress={() => {
                    clearNotice();
                    signIn(p);
                  }}
                />
              ))}
              <Text variant="meta" color="subtle" style={styles.hint}>
                Authentification dans le navigateur, puis retour dans l’application.
              </Text>
            </>
          )}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  center: { gap: 24 },
  brand: { alignItems: 'center', gap: 8 },
  actions: { gap: 12 },
  loader: { paddingVertical: 24 },
  hint: { textAlign: 'center', marginTop: 4 },
});
