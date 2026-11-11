import { Activity, BookOpen, MessageCircle } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useDocSearch } from '@/api/panel';
import { usePublicStatus } from '@/api/queries';
import { Card } from '@/components/Card';
import { LinkRow, SearchField, SectionTitle } from '@/components/Controls';
import { Screen } from '@/components/Screen';
import { StatusPill } from '@/components/StatusPill';
import { Text } from '@/components/Text';
import { TopBar } from '@/components/TopBar';
import { openWeb, URLS } from '@/lib/links';
import { usePullRefresh } from '@/lib/usePullRefresh';
import { useTheme } from '@/theme/ThemeProvider';

export default function Support() {
  const theme = useTheme();
  const colors = { toolbar: theme.raised, control: theme.fg };
  const status = usePublicStatus();
  const pull = usePullRefresh([status.refetch]);
  const [query, setQuery] = useState('');
  const docs = useDocSearch(query.trim());
  // Si l'API publique repond 404 (ou autre erreur), on n'affiche que les liens.
  const services = status.data ?? [];

  return (
    <Screen
      header={<TopBar title="Support" />}
      scroll
      refreshing={pull.refreshing}
      onRefresh={pull.onRefresh}
    >
      <Text variant="secondary" color="muted">
        Documentation, statut des services et contact.
      </Text>
      <SearchField value={query} onChangeText={setQuery} placeholder="Rechercher dans la documentation" />
      {docs.isFetching ? <ActivityIndicator color={theme.accent} /> : null}
      {docs.isError ? (
        <Text variant="meta" color="subtle">
          Recherche indisponible.
        </Text>
      ) : null}
      {(docs.data ?? []).length > 0 ? (
        <Card padded={false}>
          {(docs.data ?? []).map((hit, i) => (
            <LinkRow
              key={hit.url}
              label={hit.title}
              detail={hit.summary}
              external
              divider={i > 0}
              onPress={() => openWeb(hit.url, colors)}
            />
          ))}
        </Card>
      ) : query.trim().length >= 2 && docs.isSuccess ? (
        <Text variant="secondary" color="muted">
          Aucun document ne correspond.
        </Text>
      ) : null}

      <Card padded={false}>
        <LinkRow
          icon={BookOpen}
          label="Documentation"
          detail="docs.zenode.fr"
          external
          onPress={() => openWeb(URLS.docs, colors)}
        />
        <LinkRow
          icon={MessageCircle}
          label="Discord"
          detail="Rejoindre la communauté"
          external
          divider
          onPress={() => openWeb(URLS.discord, colors)}
        />
        <LinkRow
          icon={Activity}
          label="Statut des services"
          detail="Ouvrir sur le site"
          external
          divider
          onPress={() => openWeb(URLS.status, colors)}
        />
      </Card>

      {services.length > 0 ? (
        <View style={styles.status}>
          <SectionTitle>État des services</SectionTitle>
          <Card padded={false}>
            {services.map((s, i) => (
              <View
                key={`${s.name}-${i}`}
                style={[
                  styles.statusRow,
                  i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.line },
                ]}
              >
                <Text variant="body" weight="medium" numberOfLines={1} style={styles.statusName}>
                  {s.name}
                </Text>
                <StatusPill label={s.label} tone={s.tone} />
              </View>
            ))}
          </Card>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  status: { gap: 8 },
  statusRow: {
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusName: { flex: 1 },
});
