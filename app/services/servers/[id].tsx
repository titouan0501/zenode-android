import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams } from 'expo-router';
import { Copy, Gamepad2, Play, RotateCw, Square } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { activityConfirmationDue, serverAddress } from '@/api/models';
import { useConfirmServerActivity } from '@/api/panel';
import {
  keys,
  useRefetchOnFocus,
  useServer,
  useServerPower,
  useServerResources,
} from '@/api/queries';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ProgressBar, TabStrip } from '@/components/Controls';
import { ErrorBanner, ErrorState } from '@/components/ErrorBanner';
import { ActionBar, listRefreshControl, Screen } from '@/components/Screen';
import { StatusPill } from '@/components/StatusPill';
import { Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { TopBar } from '@/components/TopBar';
import {
  ServerAccess,
  ServerBackups,
  ServerConsole,
  ServerFiles,
  ServerNetwork,
  ServerStartup,
} from '@/features/ServerPanels';
import { formatMio } from '@/lib/format';
import { canUsePower, describeStatus, effectiveServerStatus, isOnlineStatus } from '@/lib/status';
import { usePullRefresh } from '@/lib/usePullRefresh';
import { useTheme } from '@/theme/ThemeProvider';

export default function ServerDetail() {
  const theme = useTheme();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const serverId = String(id);

  const query = useServer(serverId);
  const server = query.data;
  const power = useServerPower(serverId);
  const resources = useServerResources(server, serverId);
  const pull = usePullRefresh([query.refetch, resources.refetch]);
  useRefetchOnFocus(keys.server(serverId), query.refetch, 0);

  const pendingSignal = power.isPending ? power.variables : null;
  const confirm = useConfirmServerActivity(serverId);
  const [tab, setTab] = useState<'general' | 'files' | 'console' | 'startup' | 'backups' | 'access' | 'network'>('general');

  if (!server) {
    return (
      <Screen header={<TopBar back title="Serveur" />} bottomInset>
        {query.isError ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : (
          <ActivityIndicator color={theme.accent} style={styles.loader} />
        )}
      </Screen>
    );
  }

  const effective = effectiveServerStatus(server);
  const status = describeStatus(effective);
  const online = isOnlineStatus(effective);
  const allowed = canUsePower(server);
  const fqdn = server.subdomain?.fqdn || null;
  const address = serverAddress(server);
  const plan = server.plan_summary;
  const reason = server.error_message || server.automod_message || null;
  const confirmDue = activityConfirmationDue(server);
  const bars = resources.data ?? [];

  const planBits: string[] = [];
  if (plan?.memory_mb) planBits.push(`${formatMio(plan.memory_mb)} de mémoire`);
  if (plan?.disk_mb) planBits.push(`${formatMio(plan.disk_mb)} de disque`);
  if (plan?.cpu_percent) planBits.push(`${plan.cpu_percent} % CPU`);

  async function copy(value: string, message: string) {
    try {
      await Clipboard.setStringAsync(value);
      toast.show(message);
    } catch {
      // presse-papiers indisponible
    }
  }

  const send = (signal: 'start' | 'stop' | 'restart') => power.mutate(signal);

  return (
    <Screen
      header={<TopBar back title={server.name || serverId} />}
      footer={
        tab === 'general' && allowed ? (
          <ActionBar>
            {online ? (
              <>
                <Button
                  label="Arrêter"
                  accessibilityLabel="Arrêter le serveur"
                  variant="secondary"
                  icon={(c) => <Square size={16} color={c} strokeWidth={1.75} />}
                  loading={pendingSignal === 'stop'}
                  disabled={power.isPending && pendingSignal !== 'stop'}
                  onPress={() => send('stop')}
                  style={styles.flex}
                />
                <Button
                  label="Redémarrer"
                  accessibilityLabel="Redémarrer le serveur"
                  variant="primary"
                  icon={(c) => <RotateCw size={16} color={c} strokeWidth={1.75} />}
                  loading={pendingSignal === 'restart'}
                  disabled={power.isPending && pendingSignal !== 'restart'}
                  onPress={() => send('restart')}
                  style={styles.flex}
                />
              </>
            ) : (
              <Button
                label="Démarrer"
                accessibilityLabel="Démarrer le serveur"
                variant="primary"
                icon={(c) => <Play size={16} color={c} strokeWidth={1.75} />}
                loading={pendingSignal === 'start'}
                disabled={power.isPending && pendingSignal !== 'start'}
                onPress={() => send('start')}
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
          { key: 'files', label: 'Fichiers' },
          { key: 'console', label: 'Console' },
          { key: 'startup', label: 'Démarrage' },
          { key: 'backups', label: 'Sauvegardes' },
          { key: 'access', label: 'Accès' },
          { key: 'network', label: 'Réseau' },
        ]}
      />
      {tab === 'files' ? <ServerFiles serverId={serverId} /> : null}
      {tab === 'console' ? <ServerConsole serverId={serverId} /> : null}
      {tab === 'startup' ? <ServerStartup serverId={serverId} /> : null}
      {tab === 'backups' ? <ServerBackups serverId={serverId} /> : null}
      {tab === 'access' ? <ServerAccess serverId={serverId} /> : null}
      {tab === 'network' ? <ServerNetwork serverId={serverId} fqdn={fqdn} /> : null}
      {tab === 'general' ? (
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.pad}
        refreshControl={listRefreshControl(pull.refreshing, pull.onRefresh)}
      >
      <View style={styles.head}>
        <Avatar size={56} icon={Gamepad2} shape="square" />
        <View style={styles.headText}>
          <Text variant="section" numberOfLines={2}>
            {server.name || serverId}
          </Text>
          <Text variant="secondary" color="muted" numberOfLines={1}>
            {plan?.offer_name || plan?.product_name || 'ZenodeHost'}
          </Text>
          <StatusPill info={status} />
        </View>
      </View>

      {!allowed && reason ? (
        <ErrorBanner tone={status.tone === 'danger' ? 'danger' : 'warn'} message={reason} />
      ) : null}

      {confirmDue ? (
        <View style={styles.confirm}>
          <ErrorBanner tone="warn" message="Confirmation d’activité requise." />
          <Button
            label="Confirmer l’activité"
            variant="secondary"
            loading={confirm.isPending}
            onPress={() => confirm.mutate()}
            fullWidth
          />
        </View>
      ) : null}

      {bars.length > 0 ? (
        <Card style={styles.bars}>
          {bars.map((b) => (
            <ProgressBar key={b.key} ratio={b.ratio} label={b.label} detail={b.detail} />
          ))}
        </Card>
      ) : null}

      {fqdn || address || planBits.length > 0 ? (
        <Card style={styles.info}>
          {fqdn ? (
            <CopyRow
              label="Adresse"
              value={fqdn}
              onPress={() => copy(fqdn, 'Adresse copiée')}
              a11y="Copier l’adresse du serveur"
            />
          ) : null}
          {address ? (
            <CopyRow
              label="Allocation"
              value={address}
              onPress={() => copy(address, 'Adresse copiée')}
              a11y="Copier l’allocation du serveur"
            />
          ) : null}
          {planBits.length > 0 ? (
            <Text variant="secondary" color="muted">
              {planBits.join(' · ')}
            </Text>
          ) : null}
        </Card>
      ) : null}

      {server.is_owner === false || server.access_role === 'manager' ? (
        <Text variant="secondary" color="subtle">
          Accès gestionnaire
        </Text>
      ) : null}
      </ScrollView>
      ) : null}
    </Screen>
  );
}

function CopyRow({
  label,
  value,
  onPress,
  a11y,
}: {
  label: string;
  value: string;
  onPress: () => void;
  a11y: string;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${a11y} : ${value}`}
      style={({ pressed }) => [styles.copy, { opacity: pressed ? 0.7 : 1 }]}
    >
      <View style={styles.copyText}>
        <Text variant="label" color="subtle">
          {label}
        </Text>
        <Text variant="body" mono numberOfLines={1}>
          {value}
        </Text>
      </View>
      <Copy size={18} color={theme.fgSubtle} strokeWidth={1.75} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pad: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
  loader: { paddingVertical: 48 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 8 },
  headText: { flex: 1, minWidth: 0, gap: 4 },
  confirm: { gap: 8 },
  bars: { gap: 14 },
  info: { gap: 14 },
  copy: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  copyText: { flex: 1, minWidth: 0, gap: 2 },
});
