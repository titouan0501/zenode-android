import * as Updates from 'expo-updates';
import React, { useEffect, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { canCheckForUpdates, installAvailableUpdate } from '@/lib/appUpdate';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from './Button';
import { Card } from './Card';
import { Text } from './Text';

function useRemoteUpdateCheck() {
  const info = Updates.useUpdates();

  useEffect(() => {
    if (!canCheckForUpdates()) return;
    const check = () => {
      Updates.checkForUpdateAsync().catch(() => {});
    };
    check();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => sub.remove();
  }, []);

  return info;
}

/** Carte flottante dès qu'une mise à jour est prête à installer. */
export function AppUpdateBanner() {
  const info = useRemoteUpdateCheck();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const ready = info.isUpdateAvailable || info.isUpdatePending;

  if (!canCheckForUpdates() || !ready) return null;

  return (
    <View pointerEvents="box-none" style={[styles.banner, { bottom: insets.bottom + 72 }]}>
      <UpdateCard
        busy={busy || info.isDownloading || info.isRestarting}
        pending={info.isUpdatePending}
        note={note ?? (info.downloadError ? 'Le téléchargement a échoué.' : null)}
        onInstall={() => runInstall(info.isUpdatePending, setBusy, setNote)}
      />
    </View>
  );
}

/** Bloc du profil : vérification manuelle, y compris quand rien n'est en attente. */
export function AppUpdateSection() {
  const info = Updates.useUpdates();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const active = canCheckForUpdates();
  const ready = info.isUpdateAvailable || info.isUpdatePending;

  return (
    <Card>
      <View style={styles.stack}>
        <Text variant="bodyStrong">Mises à jour</Text>
        <Text variant="secondary" color="muted">
          {active
            ? 'Le JavaScript se met à jour ici. Un nouvel APK n’est nécessaire que si le code natif change.'
            : __DEV__
              ? 'Indisponible pendant le développement. Ça fonctionne dans l’APK release.'
              : 'Inactif sur cet APK. Installe une fois la prochaine version, puis les suivantes arriveront ici.'}
        </Text>
        {note ? (
          <Text variant="secondary" color={note === 'Déjà à jour.' ? 'muted' : 'danger'}>
            {note}
          </Text>
        ) : null}
        {active ? (
          <Button
            label={ready ? 'Installer' : 'Vérifier'}
            variant={ready ? 'primary' : 'secondary'}
            fullWidth
            loading={busy || info.isDownloading || info.isRestarting}
            onPress={() => runInstall(info.isUpdatePending, setBusy, setNote)}
          />
        ) : null}
      </View>
    </Card>
  );
}

function UpdateCard({
  busy,
  pending,
  note,
  onInstall,
}: {
  busy: boolean;
  pending: boolean;
  note: string | null;
  onInstall: () => void;
}) {
  const theme = useTheme();
  return (
    <Card style={{ borderColor: theme.accent }}>
      <View style={styles.stack}>
        <Text variant="bodyStrong">Mise à jour disponible</Text>
        <Text variant="secondary" color="muted">
          {pending ? 'Téléchargée. Un redémarrage l’installe.' : 'Télécharge et redémarre l’application.'}
        </Text>
        {note ? (
          <Text variant="secondary" color="danger">
            {note}
          </Text>
        ) : null}
        <Button
          label={pending ? 'Installer et redémarrer' : 'Télécharger et installer'}
          variant="primary"
          fullWidth
          loading={busy}
          onPress={onInstall}
        />
      </View>
    </Card>
  );
}

async function runInstall(
  pending: boolean,
  setBusy: (value: boolean) => void,
  setNote: (value: string | null) => void,
) {
  setBusy(true);
  setNote(null);
  try {
    const result = await installAvailableUpdate(pending);
    if (result === 'none') setNote('Déjà à jour.');
  } catch (e) {
    setNote(e instanceof Error ? e.message : 'Impossible d’installer la mise à jour.');
  } finally {
    setBusy(false);
  }
}

const styles = StyleSheet.create({
  stack: { gap: 8 },
  banner: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 20,
  },
});
