import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useCatalog, type ShopProduct } from '@/api/panel';
import { Card } from '@/components/Card';
import { SearchField } from '@/components/Controls';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorBanner';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { TopBar } from '@/components/TopBar';
import { formatMoney } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { ShoppingBag } from 'lucide-react-native';

function fromPrice(product: ShopProduct) {
  const prices = product.offers.map((o) => o.priceCents).filter((n): n is number => n != null);
  if (!prices.length) return null;
  return Math.min(...prices);
}

export default function Shop() {
  const theme = useTheme();
  const catalog = useCatalog();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const products = catalog.data ?? [];
  const categories = useMemo(
    () => ['all', ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))],
    [products],
  );
  const q = query.trim().toLowerCase();
  const rows = products.filter((p) => {
    if (category !== 'all' && p.category !== category) return false;
    if (!q) return true;
    return p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
  });

  return (
    <Screen header={<TopBar title="Offres" />}>
      <View style={styles.controls}>
        <SearchField value={query} onChangeText={setQuery} placeholder="Rechercher une offre" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cats}>
          {categories.map((c) => (
            <Pressable
              key={c}
              onPress={() => setCategory(c)}
              style={[
                styles.cat,
                {
                  backgroundColor: category === c ? theme.surface : 'transparent',
                  borderColor: category === c ? theme.line : 'transparent',
                },
              ]}
            >
              <Text variant="meta" weight="medium" style={{ color: category === c ? theme.fg : theme.fgMuted }}>
                {c === 'all' ? 'Toutes' : c}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      {catalog.isLoading ? (
        <ActivityIndicator color={theme.accent} style={styles.loader} />
      ) : catalog.isError ? (
        <ErrorState error={catalog.error} onRetry={() => catalog.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState icon={ShoppingBag} title="Aucune offre" text="Aucune offre ne correspond à cette recherche." />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {rows.map((p) => {
            const price = fromPrice(p);
            return (
              <Pressable
                key={p.id}
                onPress={() => router.push({ pathname: '/shop/[id]', params: { id: p.id } })}
              >
                <Card style={styles.card}>
                  <Text variant="body" weight="semibold">
                    {p.name}
                  </Text>
                  {p.description ? (
                    <Text variant="secondary" color="muted" numberOfLines={2}>
                      {p.description}
                    </Text>
                  ) : null}
                  <Text variant="meta" color="subtle">
                    {price === 0 ? 'Gratuit' : price != null ? `À partir de ${formatMoney(price)}` : 'Sur devis'}
                  </Text>
                </Card>
              </Pressable>
            );
          })}
          <Pressable onPress={() => router.push('/billing')}>
            <Text variant="body" weight="medium" style={{ color: theme.accent }}>
              Facturation
            </Text>
          </Pressable>
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  controls: { paddingHorizontal: 16, gap: 10, paddingBottom: 8 },
  cats: { gap: 8 },
  cat: { height: 32, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, justifyContent: 'center' },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
  card: { gap: 6 },
  loader: { paddingVertical: 32 },
});
