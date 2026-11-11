import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { usePromoHistory, useRedeemCode } from '@/api/panel';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { TextField } from '@/components/Controls';
import { ErrorBanner } from '@/components/ErrorBanner';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { TopBar } from '@/components/TopBar';
import { formatDate } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';

export default function Codes() {
  const theme = useTheme();
  const [code, setCode] = useState('');
  const redeem = useRedeemCode();
  const history = usePromoHistory();

  return (
    <Screen header={<TopBar back title="Codes" />} scroll bottomInset>
      <View style={styles.gap}>
        <Text variant="secondary" color="muted">
          Un code promo ou un avoir s’applique ici. Un code lié à une offre se saisit aussi sur la fiche.
        </Text>
        <TextField label="Code" value={code} onChangeText={setCode} placeholder="Code" />
        <Button
          label="Utiliser"
          variant="primary"
          loading={redeem.isPending}
          disabled={!code.trim()}
          onPress={() => redeem.mutate(code.trim(), { onSuccess: () => setCode('') })}
        />
        <Text variant="label" color="subtle">
          Historique
        </Text>
        {history.isLoading ? <ActivityIndicator color={theme.accent} /> : null}
        {history.isError ? <ErrorBanner error={history.error} onRetry={() => history.refetch()} /> : null}
        {(history.data ?? []).length === 0 && !history.isLoading ? (
          <Text variant="secondary" color="muted">
            Aucun code utilisé.
          </Text>
        ) : (
          (history.data ?? []).map((row) => (
            <Card key={row.id} style={styles.card}>
              <Text variant="body" weight="medium">
                {row.code || row.label}
              </Text>
              <Text variant="meta" color="subtle">
                {[row.label, formatDate(row.at)].filter(Boolean).join(' · ')}
              </Text>
            </Card>
          ))
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ gap: { gap: 12 }, card: { gap: 4 } });
