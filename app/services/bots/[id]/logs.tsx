import { useLocalSearchParams } from 'expo-router';
import { Download, RefreshCw } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Platform, Share, StyleSheet, View } from 'react-native';

import { useBotLogs } from '@/api/queries';
import { IconButton } from '@/components/Button';
import { ErrorState } from '@/components/ErrorBanner';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { TopBar } from '@/components/TopBar';
import { usePullRefresh } from '@/lib/usePullRefresh';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius } from '@/theme/tokens';

export default function BotLogs() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const botId = String(id);
  const logs = useBotLogs(botId);
  const pull = usePullRefresh([logs.refetch]);

  function download() {
    const text = logs.data?.trim() ? logs.data : '';
    if (!text) return;
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const blob = new Blob([text], { type: 'text/plain' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${botId}.log`;
      link.click();
      URL.revokeObjectURL(link.href);
      return;
    }
    Share.share({ message: text, title: `Journaux ${botId}` }).catch(() => {});
  }

  return (
    <Screen
      header={
        <TopBar
          back
          title="Journaux"
          right={
            <View style={styles.actions}>
            <IconButton accessibilityLabel="Télécharger les journaux" onPress={download}>
              <Download size={20} color={theme.fgMuted} strokeWidth={1.75} />
            </IconButton>
            <IconButton accessibilityLabel="Rafraîchir les journaux" onPress={() => logs.refetch()}>
              {logs.isFetching ? (
                <ActivityIndicator size={18} color={theme.fgMuted} />
              ) : (
                <RefreshCw size={20} color={theme.fgMuted} strokeWidth={1.75} />
              )}
            </IconButton>
            </View>
          }
        />
      }
      scroll
      bottomInset
      refreshing={pull.refreshing}
      onRefresh={pull.onRefresh}
    >
      {logs.isLoading ? (
        <ActivityIndicator color={theme.accent} style={styles.loader} />
      ) : logs.isError && logs.data === undefined ? (
        <ErrorState error={logs.error} onRetry={() => logs.refetch()} />
      ) : (
        <View style={[styles.box, { backgroundColor: theme.sunken, borderColor: theme.line }]}>
          <Text
            selectable
            style={{
              fontFamily: fonts.mono,
              fontSize: 12,
              lineHeight: 17,
              color: theme.fgMuted,
            }}
          >
            {logs.data && logs.data.trim() ? logs.data : 'Aucun journal pour le moment.'}
          </Text>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row' },
  loader: { paddingVertical: 48 },
  box: { borderRadius: radius.card, borderWidth: 1, padding: 12 },
});
