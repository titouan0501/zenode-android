import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { readServerFile, useFileMutations } from '@/api/panel';
import { Button } from '@/components/Button';
import { TextField } from '@/components/Controls';
import { ErrorBanner } from '@/components/ErrorBanner';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { TopBar } from '@/components/TopBar';
import { useTheme } from '@/theme/ThemeProvider';

export default function ServerFile() {
  const theme = useTheme();
  const { id, path } = useLocalSearchParams<{ id: string; path: string }>();
  const serverId = String(id);
  const filePath = decodeURIComponent(String(path || ''));
  const name = filePath.split('/').filter(Boolean).pop() || 'Fichier';
  const mut = useFileMutations(serverId);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    readServerFile(serverId, filePath)
      .then((text) => {
        if (alive) setContent(text);
      })
      .catch((e) => {
        if (alive) setError(e instanceof Error ? e.message : 'Lecture impossible.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [serverId, filePath]);

  return (
    <Screen header={<TopBar back title={name} />} scroll bottomInset>
      <View style={styles.gap}>
        <Text variant="meta" color="subtle" mono selectable>
          {filePath}
        </Text>
        {loading ? <ActivityIndicator color={theme.accent} /> : null}
        {error ? <ErrorBanner message={error} /> : null}
        {!loading && !error ? (
          <>
            <Text variant="secondary" color="muted">
              Éditeur texte. Un fichier binaire n’est pas modifié ici.
            </Text>
            <TextField label="Contenu" value={content} onChangeText={setContent} multiline />
            <Button
              label="Enregistrer"
              variant="primary"
              loading={mut.write.isPending}
              onPress={() => mut.write.mutate({ path: filePath, content })}
            />
          </>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ gap: { gap: 12 } });
