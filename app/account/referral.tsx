import * as Clipboard from 'expo-clipboard';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useReferral } from '@/api/panel';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ErrorBanner } from '@/components/ErrorBanner';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { TopBar } from '@/components/TopBar';
import { formatDate, formatMoney } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';

export default function Referral() {
  const theme = useTheme();
  const toast = useToast();
  const query = useReferral();
  const data = query.data;

  return (
    <Screen header={<TopBar back title="Parrainage" />} scroll bottomInset>
      <View style={styles.gap}>
        {query.isLoading ? <ActivityIndicator color={theme.accent} /> : null}
        {query.isError ? <ErrorBanner error={query.error} onRetry={() => query.refetch()} /> : null}
        {data && data.enabled === false ? (
          <Text variant="secondary" color="muted">
            Le parrainage n’est pas ouvert sur ce compte.
          </Text>
        ) : null}
        {data?.code ? (
          <Card style={styles.gap}>
            <Text variant="label" color="subtle">
              Code
            </Text>
            <Text variant="section" mono>
              {data.code}
            </Text>
            <Button
              label="Copier"
              variant="secondary"
              onPress={() =>
                Clipboard.setStringAsync(String(data.share_url || data.code)).then(() => toast.show('Code copié'))
              }
            />
            <Text variant="meta" color="subtle">
              {[
                data.stats?.attributed != null
                  ? `${data.stats.attributed} filleul${data.stats.attributed > 1 ? 's' : ''}`
                  : null,
                data.stats?.rewarded != null
                  ? `${data.stats.rewarded} récompensé${data.stats.rewarded > 1 ? 's' : ''}`
                  : null,
                data.stats?.available_credit_cents != null
                  ? `${formatMoney(data.stats.available_credit_cents)} disponibles`
                  : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </Card>
        ) : null}
        {(Array.isArray(data?.referrals) ? data.referrals : []).length === 0 && data?.code ? (
          <Text variant="secondary" color="muted">
            Aucun filleul pour le moment.
          </Text>
        ) : (
          (Array.isArray(data?.referrals) ? data.referrals : []).map((row: any) => (
            <Card key={String(row.referral_id)} style={styles.card}>
              <Text variant="body" weight="medium">
                {row.referred_zenode_id || 'Filleul'}
              </Text>
              <Text variant="meta" color="subtle">
                {[row.status, row.reward_cents ? formatMoney(row.reward_cents) : null, formatDate(row.created_at)]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </Card>
          ))
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ gap: { gap: 12 }, card: { gap: 4 } });
