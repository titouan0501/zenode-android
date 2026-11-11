import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import {
  useBotManagerMutations,
  useBotManagers,
  useBotModules,
  useBotToken,
  usePublicModules,
} from '@/api/panel';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { TextField } from '@/components/Controls';
import { EmptyState } from '@/components/EmptyState';
import { ErrorBanner } from '@/components/ErrorBanner';
import { Text } from '@/components/Text';
import { useTheme } from '@/theme/ThemeProvider';
import { Puzzle } from 'lucide-react-native';

export function BotModules({ botId, enabled }: { botId: string; enabled: string[] }) {
  const theme = useTheme();
  const catalog = usePublicModules();
  const save = useBotModules(botId);
  const [filter, setFilter] = useState<'all' | 'on' | 'off'>('all');
  const on = useMemo(() => new Set(enabled), [enabled]);

  const rows = (catalog.data ?? []).filter((m) => {
    if (filter === 'on') return on.has(m.key);
    if (filter === 'off') return !on.has(m.key);
    return true;
  });

  function toggle(key: string, name: string, required: boolean, next: boolean) {
    if (required) return;
    const apply = () => {
      const modules = next ? [...enabled, key] : enabled.filter((k) => k !== key);
      save.mutate(modules);
    };
    if (next) {
      Alert.alert('Activer le module ?', `${name} sera activé sur ce bot.`, [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Activer', onPress: apply },
      ]);
      return;
    }
    apply();
  }

  if (catalog.isLoading) return <ActivityIndicator color={theme.accent} style={styles.loader} />;
  if (catalog.isError) return <ErrorBanner error={catalog.error} onRetry={() => catalog.refetch()} />;
  if ((catalog.data ?? []).length === 0) {
    return <EmptyState icon={Puzzle} title="Aucun module" text="Le catalogue de modules est vide." />;
  }

  return (
    <View style={styles.gap}>
      <View style={styles.filters}>
        {(
          [
            ['all', 'Tous'],
            ['on', 'Activés'],
            ['off', 'Inactifs'],
          ] as const
        ).map(([key, label]) => (
          <Button
            key={key}
            label={label}
            size="md"
            variant={filter === key ? 'primary' : 'secondary'}
            onPress={() => setFilter(key)}
          />
        ))}
      </View>
      {rows.map((m) => {
        const active = on.has(m.key);
        return (
          <Card key={m.key} style={styles.gapSmall}>
            <Text variant="body" weight="medium">
              {m.name}
            </Text>
            {m.description ? (
              <Text variant="secondary" color="muted">
                {m.description}
              </Text>
            ) : null}
            <Button
              label={m.required ? 'Obligatoire' : active ? 'Désactiver' : 'Activer'}
              variant={active ? 'secondary' : 'primary'}
              size="md"
              disabled={m.required || m.blocked || save.isPending}
              loading={save.isPending && save.variables?.includes(m.key)}
              onPress={() => toggle(m.key, m.name, m.required, !active)}
            />
          </Card>
        );
      })}
    </View>
  );
}

export function BotToken({ botId }: { botId: string }) {
  const [token, setToken] = useState('');
  const save = useBotToken(botId);
  const valid = token.split('.').length === 3 && token.length >= 50;
  return (
    <View style={styles.gap}>
      <Text variant="secondary" color="muted">
        Le jeton actuel n’est pas affiché. Coller un nouveau jeton Discord le remplace.
      </Text>
      <TextField label="Nouveau jeton" value={token} onChangeText={setToken} secure placeholder="Jeton" />
      <Button
        label="Enregistrer le jeton"
        variant="primary"
        loading={save.isPending}
        disabled={!valid}
        onPress={() => {
          save.mutate(token.trim(), { onSuccess: () => setToken('') });
        }}
      />
    </View>
  );
}

export function BotAccess({ botId }: { botId: string }) {
  const theme = useTheme();
  const managers = useBotManagers(botId);
  const { invite, revoke } = useBotManagerMutations(botId);
  const [email, setEmail] = useState('');
  return (
    <View style={styles.gap}>
      <TextField
        label="Inviter par e-mail"
        value={email}
        onChangeText={setEmail}
        placeholder="nom@exemple.fr"
        autoCapitalize="none"
      />
      <Button
        label="Inviter"
        variant="primary"
        loading={invite.isPending}
        disabled={!email.includes('@')}
        onPress={() => invite.mutate(email.trim(), { onSuccess: () => setEmail('') })}
      />
      {managers.isLoading ? <ActivityIndicator color={theme.accent} /> : null}
      {managers.isError ? <ErrorBanner error={managers.error} onRetry={() => managers.refetch()} /> : null}
      {(managers.data ?? []).length === 0 && !managers.isLoading ? (
        <Text variant="secondary" color="muted">
          Aucun gestionnaire.
        </Text>
      ) : (
        (managers.data ?? []).map((m) => (
          <Card key={m.id || m.email} style={styles.row}>
            <View style={styles.flex}>
              <Text variant="body" weight="medium" numberOfLines={1}>
                {m.email || 'Gestionnaire'}
              </Text>
              <Text variant="meta" color="subtle">
                {[m.role, m.status].filter(Boolean).join(' · ') || 'Accès'}
              </Text>
            </View>
            <Button
              label="Retirer"
              variant="ghost"
              destructive
              size="md"
              loading={revoke.isPending && revoke.variables === m.id}
              onPress={() =>
                Alert.alert('Retirer cet accès ?', m.email, [
                  { text: 'Annuler', style: 'cancel' },
                  { text: 'Retirer', style: 'destructive', onPress: () => revoke.mutate(m.id) },
                ])
              }
            />
          </Card>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: 12 },
  gapSmall: { gap: 8 },
  filters: { flexDirection: 'row', gap: 8 },
  loader: { paddingVertical: 32 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1, minWidth: 0, gap: 2 },
});
