import { router } from 'expo-router';
import { Gamepad2, UserRound, Users } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { serverId } from '@/api/models';
import { keys, useAccountFull, useBots, useMe, useRefetchOnFocus, useServers } from '@/api/queries';
import type { HostServer } from '@/api/types';
import { IconButton } from '@/components/Button';
import { Card } from '@/components/Card';
import { SectionTitle, LinkRow } from '@/components/Controls';
import { EmptyState } from '@/components/EmptyState';
import { ErrorBanner } from '@/components/ErrorBanner';
import { Logo } from '@/components/Logo';
import { ResourceRow } from '@/components/ResourceRow';
import { listRefreshControl, Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { TopBar } from '@/components/TopBar';
import { describeStatus, effectiveServerStatus, isOnlineStatus } from '@/lib/status';
import { usePullRefresh } from '@/lib/usePullRefresh';
import { useTheme } from '@/theme/ThemeProvider';
import { fontSize, fonts } from '@/theme/tokens';

function serverSubtitle(s: HostServer): string | null {
  return s.plan_summary?.offer_name || s.subdomain?.fqdn || null;
}

export default function Home() {
  const theme = useTheme();
  const me = useMe();
  const account = useAccountFull();
  const bots = useBots();
  const servers = useServers();

  const pull = usePullRefresh([me.refetch, account.refetch, bots.refetch, servers.refetch]);
  useRefetchOnFocus(keys.bots, bots.refetch);
  useRefetchOnFocus(keys.servers, servers.refetch);

  const user = me.data;
  const displayName = user?.global_name || user?.username || user?.email || 'Espace client';
  const subline = user?.email && user.email !== displayName ? user.email : user?.zenode_id || null;
  const underReview = account.data?.profile?.account_status === 'under_review';

  const botList = bots.data ?? [];
  const serverList = servers.data ?? [];
  const onlineCount =
    botList.filter((b) => b.runtime.online).length +
    serverList.filter((s) => isOnlineStatus(effectiveServerStatus(s))).length;

  const quota =
    user && user.bot_limit != null ? `${user.bot_quota_used ?? 0}/${user.bot_limit}` : '—';

  const loadingLists = (bots.isLoading || servers.isLoading) && !bots.data && !servers.data;
  const listError = bots.isError && servers.isError ? (bots.error ?? servers.error) : null;
  const empty = !loadingLists && !listError && botList.length === 0 && serverList.length === 0;

  return (
    <Screen
      header={
        <TopBar
          leading={
            <View style={styles.brand}>
              <Logo size={28} />
              <Text variant="button" weight="semibold">
                Zenode
              </Text>
            </View>
          }
          right={
            <IconButton accessibilityLabel="Profil" onPress={() => router.push('/profile')}>
              <UserRound size={22} color={theme.fgMuted} strokeWidth={1.75} />
            </IconButton>
          }
        />
      }
    >
      <View style={styles.hello}>
        <Text variant="label" color="subtle">
          Espace client
        </Text>
        <Text variant="title" numberOfLines={1}>
          {me.isLoading ? 'Chargement' : displayName}
        </Text>
        {subline ? (
          <Text variant="meta" color="subtle" mono={!!user?.zenode_id && subline === user.zenode_id} selectable>
            {subline}
          </Text>
        ) : null}
      </View>

      <ScrollView
        style={styles.flex}
        collapsable={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        refreshControl={listRefreshControl(pull.refreshing, pull.onRefresh)}
      >
      {me.isError ? <ErrorBanner error={me.error} onRetry={() => me.refetch()} /> : null}
      {underReview ? <ErrorBanner tone="warn" message="Compte en cours de vérification." /> : null}

      <Card padded={false} style={styles.kpis}>
        <Kpi
          label="Bots"
          value={quota}
          onPress={() => router.push({ pathname: '/services', params: { segment: 'bots' } })}
          accessibilityLabel={`Bots : ${quota}`}
        />
        <Kpi
          label="Serveurs"
          value={servers.data ? String(serverList.length) : '—'}
          divider
          onPress={() => router.push({ pathname: '/services', params: { segment: 'servers' } })}
          accessibilityLabel={`Serveurs : ${serverList.length}`}
        />
        <Kpi
          label="En ligne"
          value={bots.data || servers.data ? String(onlineCount) : '—'}
          divider
          onPress={() => router.push('/services')}
          accessibilityLabel={`En ligne : ${onlineCount}`}
        />
      </Card>

      {user?.isAssociationMember ? (
        <Card padded={false}>
          <LinkRow
            label="Espace adhérent"
            detail="Calendrier, annonces, documents, votes"
            onPress={() => router.push('/account/adherent')}
          />
        </Card>
      ) : null}

      {loadingLists ? <ActivityIndicator color={theme.accent} style={styles.loader} /> : null}
      {listError ? <ErrorBanner error={listError} onRetry={pull.onRefresh} /> : null}

      {empty ? (
        <Card>
          <EmptyState
            icon={Users}
            title="Aucun service"
            text="Les bots et les serveurs apparaissent ici."
            actionLabel="Voir les offres"
            onAction={() => router.push('/shop')}
          />
        </Card>
      ) : null}

      {!loadingLists && !listError && !empty ? (
        <View style={styles.recents}>
          <SectionTitle>Récents</SectionTitle>
          <Card padded={false}>
            {botList.slice(0, 3).map((b, i) => (
              <ResourceRow
                key={`bot-${b.id}`}
                divider={i > 0}
                title={b.name}
                subtitle={b.id}
                monoSubtitle
                avatarUrl={b.avatarUrl}
                avatarBorder={b.color}
                status={describeStatus(b.runtime.status)}
                accessibilityLabel={`Bot ${b.name}, ${describeStatus(b.runtime.status).label}`}
                onPress={() =>
                  router.push({ pathname: '/services/bots/[id]', params: { id: b.id } })
                }
              />
            ))}
            {serverList.slice(0, 3).map((s, i) => {
              const status = describeStatus(effectiveServerStatus(s));
              return (
                <ResourceRow
                  key={`srv-${serverId(s)}`}
                  divider={botList.length > 0 || i > 0}
                  title={s.name || serverId(s)}
                  subtitle={serverSubtitle(s)}
                  icon={Gamepad2}
                  shape="square"
                  status={status}
                  accessibilityLabel={`Serveur ${s.name ?? serverId(s)}, ${status.label}`}
                  onPress={() =>
                    router.push({
                      pathname: '/services/servers/[id]',
                      params: { id: serverId(s) },
                    })
                  }
                />
              );
            })}
          </Card>
        </View>
      ) : null}
      </ScrollView>
    </Screen>
  );
}

function Kpi({
  label,
  value,
  divider,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  value: string;
  divider?: boolean;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.kpi,
        {
          backgroundColor: pressed ? theme.pressed : 'transparent',
          borderLeftWidth: divider ? StyleSheet.hairlineWidth : 0,
          borderLeftColor: theme.line,
        },
      ]}
    >
      <Text variant="label" color="subtle">
        {label}
      </Text>
      <Text style={{ fontFamily: fonts.semibold, fontSize: fontSize.title, lineHeight: 30 }}>
        {value}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hello: { gap: 2, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24, gap: 12 },
  kpis: { flexDirection: 'row' },
  kpi: { flex: 1, paddingVertical: 14, paddingHorizontal: 12, gap: 6 },
  recents: { gap: 8 },
  loader: { paddingVertical: 32 },
});
