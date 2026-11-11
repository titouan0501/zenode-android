import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { useCatalog, usePlaceOrder, usePromoValidate, useSuffixes } from '@/api/panel';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { TextField } from '@/components/Controls';
import { ErrorState } from '@/components/ErrorBanner';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { TopBar } from '@/components/TopBar';
import { formatMoney } from '@/lib/format';
import { openWeb } from '@/lib/links';
import { useTheme } from '@/theme/ThemeProvider';

const HOST = new Set(['host', 'games', 'apps', 'hosting']);

export default function Product() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const catalog = useCatalog();
  const suffixes = useSuffixes();
  const order = usePlaceOrder();
  const promo = usePromoValidate();
  const product = (catalog.data ?? []).find((p) => p.id === String(id) || p.slug === String(id));
  const [offerId, setOfferId] = useState('');
  const [code, setCode] = useState('');
  const [promoNote, setPromoNote] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [usage, setUsage] = useState('');
  const [sub, setSub] = useState('');
  const [suffix, setSuffix] = useState('');
  const offer = product?.offers.find((o) => o.id === (offerId || product.offers[0]?.id)) ?? product?.offers[0];
  const host = product ? HOST.has(product.category) || HOST.has(product.serviceType) : false;

  if (catalog.isLoading) {
    return (
      <Screen header={<TopBar back title="Offre" />}>
        <ActivityIndicator color={theme.accent} style={styles.loader} />
      </Screen>
    );
  }
  if (!product || !offer) {
    return (
      <Screen header={<TopBar back title="Offre" />}>
        <ErrorState error={catalog.error ?? new Error('Offre introuvable')} onRetry={() => catalog.refetch()} />
      </Screen>
    );
  }

  const paid = (offer.priceCents ?? 0) > 0;
  const period = offer.period === 'year' ? '/ an' : offer.period === 'month' ? '/ mois' : '';

  return (
    <Screen header={<TopBar back title={product.name} />} scroll bottomInset>
      <View style={styles.gap}>
        {product.description ? (
          <Text variant="secondary" color="muted">
            {product.description}
          </Text>
        ) : null}
        {product.offers.map((o) => (
          <Card key={o.id} style={styles.gapSmall}>
            <Text variant="body" weight="semibold">
              {o.name}
            </Text>
            {o.tagline ? (
              <Text variant="secondary" color="muted">
                {o.tagline}
              </Text>
            ) : null}
            <Text variant="body">
              {o.priceCents === 0 ? 'Gratuit' : o.priceCents != null ? `${formatMoney(o.priceCents, o.currency)} ${period}` : 'Sur devis'}
            </Text>
            {o.lockMessage ? (
              <Text variant="meta" color="subtle">
                {o.lockMessage}
              </Text>
            ) : null}
            <Button
              label={offer.id === o.id ? 'Formule retenue' : 'Choisir'}
              variant={offer.id === o.id ? 'primary' : 'secondary'}
              size="md"
              disabled={o.locked}
              onPress={() => setOfferId(o.id)}
            />
          </Card>
        ))}
        <TextField label="Code promo" value={code} onChangeText={setCode} placeholder="Code" />
        <Button
          label="Vérifier le code"
          variant="secondary"
          loading={promo.isPending}
          disabled={!code.trim()}
          onPress={() =>
            promo.mutate(
              { code: code.trim(), productId: product.id, offerId: offer.id },
              {
                onSuccess: () => setPromoNote('Code reconnu.'),
                onError: (e) => setPromoNote(errorMessage(e)),
              },
            )
          }
        />
        {promoNote ? (
          <Text variant="meta" color="subtle">
            {promoNote}
          </Text>
        ) : null}
        {host ? (
          <>
            <TextField label="Nom du serveur" value={name} onChangeText={setName} autoCapitalize="words" />
            <TextField label="Usage" value={usage} onChangeText={setUsage} multiline autoCapitalize="sentences" />
            <TextField label="Sous-domaine" value={sub} onChangeText={setSub} placeholder="nom" />
            <View style={styles.row}>
              {(suffixes.data ?? []).map((s) => (
                <Button
                  key={s.id}
                  label={s.label}
                  size="md"
                  variant={(suffix || suffixes.data?.[0]?.id) === s.id ? 'primary' : 'secondary'}
                  onPress={() => setSuffix(s.id)}
                />
              ))}
            </View>
          </>
        ) : null}
        <Button
          label={paid ? 'Payer' : 'Commander'}
          variant="primary"
          size="lg"
          fullWidth
          loading={order.isPending}
          disabled={!product.orderable || offer.locked}
          onPress={() =>
            order.mutate(
              {
                product_id: product.id,
                offer_id: offer.id,
                acquisition_mode: offer.mode || undefined,
                promo_code: code.trim() || undefined,
                name: host ? name.trim() || undefined : undefined,
                usage_description: host ? usage.trim() || undefined : undefined,
                subdomain: host && sub.trim() ? sub.trim().toLowerCase() : undefined,
                suffix_id: host && sub.trim() ? suffix || suffixes.data?.[0]?.id : undefined,
                terms_accepted: true,
                acceptable_use: true,
                paid,
              },
              {
                onSuccess: (res) => {
                  if (res.url) openWeb(res.url);
                  router.push('/billing');
                },
              },
            )
          }
        />
        <Text variant="meta" color="subtle">
          {paid
            ? 'Le paiement par carte s’ouvre sur Stripe, puis la commande apparaît dans Facturation.'
            : 'La commande est envoyée directement.'}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { gap: 12 },
  gapSmall: { gap: 6 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  loader: { paddingVertical: 48 },
});
