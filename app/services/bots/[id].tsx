import { router, useLocalSearchParams } from 'expo-router';
import { Play, RotateCw, ScrollText, Square } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { useConfirmBotActivity } from '@/api/panel';
import { keys, useBot, useBotAction, useRefetchOnFocus } from '@/api/queries';
import { BotAccess, BotModules, BotToken } from '@/features/BotPanels';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { LinkRow } from '@/components/Controls';
import { ErrorState } from '@/components/ErrorBanner';
import { TabStrip } from '@/components/Controls';
import { ActionBar, listRefreshControl, Screen } from '@/components/Screen';
import { StatusPill } from '@/components/StatusPill';
import { Text } from '@/components/Text';
import { TopBar } from '@/components/TopBar';
import { formatMio, formatUptime } from '@/lib/format';
import { describeStatus } from '@/lib/status';
import { usePullRefresh } from '@/lib/usePullRefresh';
import { useTheme } from '@/theme/ThemeProvider';

export default function BotDetail() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const botId = String(id);
  const query = useBot(botId);
  const act = useBotAction(botId);
  const pull = usePullRefresh([query.refetch]);
  useRefetchOnFocus(keys.bot(botId), query.refetch, 0);

  const bot = query.data;
  const pending = act.isPending;
  const pendingAction = act.isPending ? act.variables?.action : null;
  const confirm = useConfirmBotActivity(botId);
  const [tab, setTab] = useState<'general' | 'modules' | 'token' | 'access'>('general');

  if (!bot) {
    return (
      <Screen header={<TopBar back title="Bot" />} bottomInset>
        {query.isError ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : (
          <ActivityIndicator color={theme.accent} style={styles.loader} />
        )}
      </Screen>
    );
  }

  const rt = bot.runtime;
  const status = describeStatus(rt.status);
  const vmHost = rt.vm_host;

  const meta: string[] = [];
  if (vmHost) meta.push(vmHost);
  if (rt.guilds && rt.guilds > 0) {
    meta.push(`${rt.guilds} serveur${rt.guilds > 1 ? 's' : ''} Discord`);
  }
  if (rt.online && rt.uptimeSec !== null) meta.push(`Actif depuis ${formatUptime(rt.uptimeSec)}`);
  if (rt.online && rt.memoryMb !== null) meta.push(formatMio(rt.memoryMb));

  const run = (action: 'start' | 'stop' | 'restart') => act.mutate({ action, vmHost });

  return (
    <Screen
      header={<TopBar back title={bot.name} />}
      footer={
        tab === 'general' ? (
          <ActionBar>
            {rt.online ? (
              <>
                <Button
                  label="Arrêter"
                  accessibilityLabel="Arrêter le bot"
                  variant="secondary"
                  icon={(c) => <Square size={16} color={c} strokeWidth={1.75} />}
                  loading={pendingAction === 'stop'}
                  disabled={pending && pendingAction !== 'stop'}
                  onPress={() => run('stop')}
                  style={styles.flex}
                />
                <Button
                  label="Redémarrer"
                  accessibilityLabel="Redémarrer le bot"
                  variant="primary"
                  icon={(c) => <RotateCw size={16} color={c} strokeWidth={1.75} />}
                  loading={pendingAction === 'restart'}
                  disabled={pending && pendingAction !== 'restart'}
                  onPress={() => run('restart')}
                  style={styles.flex}
                />
              </>
            ) : (
              <Button
                label="Démarrer"
                accessibilityLabel="Démarrer le bot"
                variant="primary"
                icon={(c) => <Play size={16} color={c} strokeWidth={1.75} />}
                loading={pendingAction === 'start'}
                disabled={pending && pendingAction !== 'start'}
                onPress={() => run('start')}
                style={styles.flex}
              />
            )}
          </ActionBar>
        ) : undefined
      }
    >
      <TabStrip
        value={tab}
        onChange={setTab}
        options={[
          { key: 'general', label: 'Général' },
          { key: 'modules', label: 'Modules' },
          { key: 'token', label: 'Jeton' },
          { key: 'access', label: 'Accès' },
        ]}
      />
      {tab === 'modules' ? (
        <ScrollView style={styles.flex} contentContainerStyle={styles.pad}>
          <BotModules botId={botId} enabled={bot.modules} />
        </ScrollView>
      ) : null}
      {tab === 'token' ? (
        <ScrollView style={styles.flex} contentContainerStyle={styles.pad}>
          <BotToken botId={botId} />
        </ScrollView>
      ) : null}
      {tab === 'access' ? (
        <ScrollView style={styles.flex} contentContainerStyle={styles.pad}>
          <BotAccess botId={botId} />
        </ScrollView>
      ) : null}
      {tab === 'general' ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.pad}
          refreshControl={listRefreshControl(pull.refreshing, pull.onRefresh)}
        >
          <View style={styles.head}>
            <Avatar size={56} uri={bot.avatarUrl} name={bot.name} borderColor={bot.color} />
            <View style={styles.headText}>
              <Text variant="section" numberOfLines={2}>
                {bot.name}
              </Text>
              <Text variant="meta" color="subtle" mono selectable>
                {bot.id}
              </Text>
              <StatusPill info={status} />
            </View>
          </View>
          {meta.length > 0 ? (
            <Text variant="secondary" color="muted">
              {meta.join(' · ')}
            </Text>
          ) : null}
          {bot.accessRole === 'manager' ? (
            <Text variant="secondary" color="subtle">
              Accès gestionnaire
            </Text>
          ) : null}
          {bot.activityDue ? (
            <Button
              label="Confirmer l’activité"
              variant="secondary"
              loading={confirm.isPending}
              onPress={() => confirm.mutate()}
            />
          ) : null}
          <Card padded={false}>
            <LinkRow
              icon={ScrollText}
              label="Journaux"
              detail="Dernières lignes de sortie"
              onPress={() => router.push({ pathname: '/services/bots/[id]/logs', params: { id: botId } })}
            />
          </Card>
        </ScrollView>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pad: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
  loader: { paddingVertical: 48 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 8 },
  headText: { flex: 1, minWidth: 0, gap: 4 },
});
