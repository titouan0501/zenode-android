import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { useSaveNotifications } from '@/api/panel';
import { useAccountFull } from '@/api/queries';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ErrorBanner } from '@/components/ErrorBanner';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { TopBar } from '@/components/TopBar';
import { useTheme } from '@/theme/ThemeProvider';

const FIELDS = [
  ['bot', 'Bots'],
  ['hosting', 'Hébergement'],
  ['security', 'Sécurité'],
  ['product', 'Produit'],
  ['dm', 'Message Discord'],
] as const;

type Flags = Record<(typeof FIELDS)[number][0], boolean>;

export default function Notifications() {
  const theme = useTheme();
  const account = useAccountFull();
  const save = useSaveNotifications();
  const [flags, setFlags] = useState<Flags>({ bot: true, hosting: true, security: true, product: false, dm: true });

  useEffect(() => {
    const settings = account.data?.settings as
      | { notifications?: { email?: Record<string, boolean>; discord?: { dm?: boolean } } }
      | undefined;
    const email = settings?.notifications?.email;
    if (!email) return;
    setFlags({
      bot: email.bot !== false,
      hosting: email.hosting !== false,
      security: email.security !== false,
      product: email.product === true,
      dm: settings?.notifications?.discord?.dm !== false,
    });
  }, [account.data]);

  return (
    <Screen header={<TopBar back title="Notifications" />} scroll bottomInset>
      <View style={styles.gap}>
        <Text variant="secondary" color="muted">
          Choix des messages envoyés par e-mail et sur Discord. La clé d’intégration n’est pas affichée.
        </Text>
        {account.isLoading ? <ActivityIndicator color={theme.accent} /> : null}
        {account.isError ? <ErrorBanner error={account.error} onRetry={() => account.refetch()} /> : null}
        <Card padded={false}>
          {FIELDS.map(([key, label], i) => (
            <Pressable
              key={key}
              onPress={() => setFlags((prev) => ({ ...prev, [key]: !prev[key] }))}
              style={[
                styles.row,
                i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.line },
              ]}
            >
              <Text variant="body" weight="medium" style={styles.flex}>
                {label}
              </Text>
              <Text variant="meta" color={flags[key] ? 'accent' : 'subtle'}>
                {flags[key] ? 'Activé' : 'Inactif'}
              </Text>
            </Pressable>
          ))}
        </Card>
        <Button label="Enregistrer" variant="primary" loading={save.isPending} onPress={() => save.mutate(flags)} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { gap: 12 },
  row: { minHeight: 52, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
});
