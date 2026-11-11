import * as Updates from 'expo-updates';

/** Vrai seulement dans un APK release dont l'URL EAS Update est configurée. */
export function canCheckForUpdates(): boolean {
  return !__DEV__ && Updates.isEnabled;
}

/**
 * Télécharge la mise à jour publiée sur le canal, puis relance l'app.
 * `alreadyPending` : le bundle est déjà en cache (contrôle au lancement).
 */
export async function installAvailableUpdate(alreadyPending: boolean): Promise<'none' | 'reloading'> {
  if (!canCheckForUpdates()) {
    throw new Error('Les mises à jour à distance ne sont pas actives sur cette installation.');
  }

  if (!alreadyPending) {
    const check = await Updates.checkForUpdateAsync();
    if (!check.isAvailable && !check.isRollBackToEmbedded) return 'none';
    const fetched = await Updates.fetchUpdateAsync();
    if (!fetched.isNew && !fetched.isRollBackToEmbedded) return 'none';
  }

  await Updates.reloadAsync();
  return 'reloading';
}
