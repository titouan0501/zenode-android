import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useBillingPortal, useOrders, useSubscriptions } from '@/api/panel';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ErrorBanner } from '@/components/ErrorBanner';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { TopBar } from '@/components/TopBar';
import { formatDate, formatMoney } from '@/lib/format';
import { openWeb } from '@/lib/links';
import { useTheme } from '@/theme/ThemeProvider';

export default function Billing() {
  const theme = useTheme();
  const orders = useOrders();
  const subs = useSubscriptions();
  const portal = useBillingPortal();

  return (
    <Screen header={<TopBar back title="Facturation" />} scroll bottomInset>
      <View style={styles.gap}>
        <Text variant="secondary" color="muted">
          Commandes et abonnements. La carte et les prélèvements se gèrent sur Stripe.
        </Text>
        <Button
          label="Portail Stripe"
          variant="secondary"
          loading={portal.isPending}
          onPress={() => portal.mutate(undefined, { onSuccess: (url) => openWeb(url) })}
        />
        <Text variant="label" color="subtle">
          Abonnements
        </Text>
        {subs.isLoading ? <ActivityIndicator color={theme.accent} /> : null}
        {subs.isError ? <ErrorBanner error={subs.error} onRetry={() => subs.refetch()} /> : null}
        {(subs.data ?? []).length === 0 && !subs.isLoading ? (
          <Text variant="secondary" color="muted">
            Aucun abonnement.
          </Text>
        ) : (
          (subs.data ?? []).map((s) => (
            <Card key={s.id} style={styles.card}>
              <Text variant="body" weight="medium">
                {s.title}
              </Text>
              <Text variant="meta" color="subtle">
                {[s.status, s.amountCents != null ? formatMoney(s.amountCents, s.currency) : null, s.period, formatDate(s.periodEnd)]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </Card>
          ))
        )}
        <Text variant="label" color="subtle">
          Commandes
        </Text>
        {orders.isLoading ? <ActivityIndicator color={theme.accent} /> : null}
        {orders.isError ? <ErrorBanner error={orders.error} onRetry={() => orders.refetch()} /> : null}
        {(orders.data ?? []).length === 0 && !orders.isLoading ? (
          <Text variant="secondary" color="muted">
            Aucune commande.
          </Text>
        ) : (
          (orders.data ?? []).map((o) => (
            <Card key={o.id} style={styles.card}>
              <Text variant="body" weight="medium">
                {o.number ? `N° ${o.number} · ${o.title}` : o.title}
              </Text>
              <Text variant="meta" color="subtle">
                {[o.status, o.amountCents != null ? formatMoney(o.amountCents, o.currency) : null, formatDate(o.createdAt)]
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

const styles = StyleSheet.create({
  gap: { gap: 12 },
  card: { gap: 4 },
});
