import * as Clipboard from 'expo-clipboard';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { useLinkMutations, useLinks } from '@/api/panel';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { TextField } from '@/components/Controls';
import { ErrorBanner } from '@/components/ErrorBanner';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { TopBar } from '@/components/TopBar';
import { useTheme } from '@/theme/ThemeProvider';

export default function Links() {
  const theme = useTheme();
  const toast = useToast();
  const query = useLinks();
  const mut = useLinkMutations();
  const [target, setTarget] = useState('');
  const [code, setCode] = useState('');
  const quota = query.data?.quota;

  return (
    <Screen header={<TopBar back title="Liens courts" />} scroll bottomInset>
      <View style={styles.gap}>
        <Text variant="secondary" color="muted">
          {quota ? `${quota.active ?? 0} / ${quota.max ?? '—'} liens actifs.` : 'Liens courts ZenodeLink.'}
        </Text>
        <TextField label="Adresse cible" value={target} onChangeText={setTarget} placeholder="https://" />
        <TextField label="Code (facultatif)" value={code} onChangeText={setCode} placeholder="code" />
        <Button
          label="Créer"
          variant="primary"
          loading={mut.create.isPending}
          disabled={!target.trim().startsWith('http')}
          onPress={() =>
            mut.create.mutate(
              { target_url: target.trim(), code: code.trim() || undefined },
              { onSuccess: () => { setTarget(''); setCode(''); } },
            )
          }
        />
        {query.isLoading ? <ActivityIndicator color={theme.accent} /> : null}
        {query.isError ? <ErrorBanner error={query.error} onRetry={() => query.refetch()} /> : null}
        {(query.data?.links ?? []).length === 0 && !query.isLoading ? (
          <Text variant="secondary" color="muted">
            Aucun lien.
          </Text>
        ) : (
          (query.data?.links ?? []).map((link) => (
            <Card key={link.id || link.code} style={styles.card}>
              <Text variant="body" weight="medium" selectable>
                {link.shortUrl || link.code}
              </Text>
              <Text variant="meta" color="subtle" numberOfLines={1}>
                {link.target}
                {link.hits != null ? ` · ${link.hits} visites` : ''}
              </Text>
              <View style={styles.row}>
                <Button
                  label="Copier"
                  size="md"
                  variant="secondary"
                  onPress={() =>
                    Clipboard.setStringAsync(link.shortUrl || link.target).then(() => toast.show('Lien copié'))
                  }
                />
                <Button
                  label="Supprimer"
                  size="md"
                  variant="ghost"
                  destructive
                  onPress={() =>
                    Alert.alert('Supprimer ce lien ?', link.code || link.target, [
                      { text: 'Annuler', style: 'cancel' },
                      { text: 'Supprimer', style: 'destructive', onPress: () => mut.remove.mutate(link.code || link.id) },
                    ])
                  }
                />
              </View>
            </Card>
          ))
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { gap: 12 },
  card: { gap: 6 },
  row: { flexDirection: 'row', gap: 8 },
});
