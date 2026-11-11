import { router, useLocalSearchParams } from 'expo-router';
import { Bot, Gamepad2, Plus, Server } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';

import { serverId, type BotItem } from '@/api/models';
import { keys, useBots, useMe, useRefetchOnFocus, useServers } from '@/api/queries';
import type { HostServer } from '@/api/types';
import { Segmented, SearchField } from '@/components/Controls';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorBanner';
import { ResourceRow } from '@/components/ResourceRow';
import { IconButton } from '@/components/Button';
import { listRefreshControl, Screen } from '@/components/Screen';
import { TopBar } from '@/components/TopBar';
import { openWeb, URLS } from '@/lib/links';
import { describeStatus, effectiveServerStatus } from '@/lib/status';
import { usePullRefresh } from '@/lib/usePullRefresh';
import { useTheme } from '@/theme/ThemeProvider';

type Segment = 'bots' | 'servers';

export default function Services() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ segment?: string }>();
  const [segment, setSegment] = useState<Segment>(params.segment === 'servers' ? 'servers' : 'bots');
  const [query, setQuery] = useState('');

  // Les KPI de l'accueil poussent ?segment=bots|servers.
  useEffect(() => {
    if (params.segment === 'servers' || params.segment === 'bots') setSegment(params.segment);
  }, [params.segment]);

  const me = useMe();
  const bots = useBots();
  const servers = useServers();
  const active = segment === 'bots' ? bots : servers;

  const pull = usePullRefresh([bots.refetch, servers.refetch]);
  useRefetchOnFocus(keys.bots, bots.refetch);
  useRefetchOnFocus(keys.servers, servers.refetch);

  const q = query.trim().toLowerCase();
  const botRows = useMemo(
    () => (bots.data ?? []).filter((b) => !q || b.name.toLowerCase().includes(q) || b.id.toLowerCase().includes(q)),
    [bots.data, q],
  );
  const serverRows = useMemo(
    () =>
      (servers.data ?? []).filter(
        (s) =>
          !q ||
          (s.name ?? '').toLowerCase().includes(q) ||
          serverId(s).toLowerCase().includes(q),
      ),
    [servers.data, q],
  );

  const hasData = active.data !== undefined;
  const searching = q.length > 0;

  function empty() {
    if (active.isLoading) return <ActivityIndicator color={theme.accent} style={styles.loader} />;
    if (active.isError && !hasData) return <ErrorState error={active.error} onRetry={() => active.refetch()} />;
    if (searching) {
      return (
        <EmptyState
          icon={segment === 'bots' ? Bot : Server}
          title="Aucun résultat"
          text="Aucun élément ne correspond à cette recherche."
        />
      );
    }
    if (segment === 'bots') {
      if (me.data && me.data.hasDiscordLinked === false) {
        return (
          <EmptyState
            icon={Bot}
            title="Discord requis"
            text="Associer Discord sur le site pour gérer les bots."
            actionLabel="Ouvrir le profil"
            onAction={() => openWeb(URLS.profile)}
          />
        );
      }
      return (
        <EmptyState
          icon={Bot}
          title="Aucun bot"
          text="Les bots hébergés apparaissent ici."
          actionLabel="Voir les offres"
          onAction={() => router.push('/shop')}
        />
      );
    }
    return (
      <EmptyState
        icon={Server}
        title="Aucun serveur"
        text="Les serveurs ZenodeHost apparaissent ici."
        actionLabel="Voir les offres"
        onAction={() => router.push('/shop')}
      />
    );
  }

  const refreshControl = listRefreshControl(pull.refreshing, pull.onRefresh);
  const separator = () => <View style={[styles.sep, { backgroundColor: theme.line }]} />;

  return (
    <Screen
      header={
        <TopBar
          title="Services"
          right={
            segment === 'bots' ? (
              <IconButton accessibilityLabel="Créer un bot" onPress={() => router.push('/services/bots/create')}>
                <Plus size={22} color={theme.fg} strokeWidth={1.75} />
              </IconButton>
            ) : null
          }
        />
      }
    >
      <View style={styles.controls}>
        <Segmented<Segment>
          value={segment}
          onChange={setSegment}
          options={[
            { key: 'bots', label: 'Bots' },
            { key: 'servers', label: 'Serveurs' },
          ]}
        />
        <SearchField
          value={query}
          onChangeText={setQuery}
          placeholder={segment === 'bots' ? 'Rechercher un bot' : 'Rechercher un serveur'}
        />
      </View>

      {segment === 'bots' ? (
        <FlatList<BotItem>
          key="bots"
          style={styles.flex}
          data={botRows}
          keyExtractor={(b) => b.id}
          ItemSeparatorComponent={separator}
          ListEmptyComponent={empty}
          refreshControl={refreshControl}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.list, botRows.length === 0 && styles.listEmpty]}
          renderItem={({ item: b }) => {
            const status = describeStatus(b.runtime.status);
            return (
              <ResourceRow
                title={b.name}
                subtitle={b.id}
                monoSubtitle
                avatarUrl={b.avatarUrl}
                avatarBorder={b.color}
                status={status}
                accessibilityLabel={`Bot ${b.name}, ${status.label}`}
                onPress={() => router.push({ pathname: '/services/bots/[id]', params: { id: b.id } })}
              />
            );
          }}
        />
      ) : (
        <FlatList<HostServer>
          key="servers"
          style={styles.flex}
          data={serverRows}
          keyExtractor={(s) => serverId(s)}
          ItemSeparatorComponent={separator}
          ListEmptyComponent={empty}
          refreshControl={refreshControl}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.list, serverRows.length === 0 && styles.listEmpty]}
          renderItem={({ item: s }) => {
            const status = describeStatus(effectiveServerStatus(s));
            return (
              <ResourceRow
                title={s.name || serverId(s)}
                subtitle={s.plan_summary?.offer_name || s.subdomain?.fqdn || null}
                icon={Gamepad2}
                shape="square"
                status={status}
                accessibilityLabel={`Serveur ${s.name ?? serverId(s)}, ${status.label}`}
                onPress={() =>
                  router.push({ pathname: '/services/servers/[id]', params: { id: serverId(s) } })
                }
              />
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  controls: { paddingHorizontal: 16, paddingBottom: 8, gap: 12 },
  flex: { flex: 1, minHeight: 0 },
  list: { flexGrow: 1, paddingBottom: 24 },
  listEmpty: { justifyContent: 'center' },
  sep: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },
  loader: { paddingVertical: 32 },
});
