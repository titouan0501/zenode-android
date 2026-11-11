import { TriangleAlert, WifiOff } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { isApiError } from '@/api/client';
import { MSG } from '@/api/config';
import { useTheme } from '@/theme/ThemeProvider';
import type { ToneName } from '@/theme/tokens';
import { Button } from './Button';
import { EmptyState } from './EmptyState';
import { Text } from './Text';

export function messageOf(error: unknown): string {
  if (isApiError(error) && error.message) return error.message;
  return MSG.generic;
}

/** Banniere (fond/texte du ton danger, rayon 12). Message serveur si present. */
export function ErrorBanner({
  error,
  message,
  tone = 'danger',
  onRetry,
}: {
  error?: unknown;
  message?: string;
  tone?: ToneName;
  onRetry?: () => void;
}) {
  const theme = useTheme();
  const t = theme.tones[tone];
  const text = message ?? messageOf(error);
  return (
    <View
      accessibilityRole="alert"
      style={[styles.banner, { backgroundColor: t.bg }]}
    >
      <TriangleAlert size={18} color={t.fg} strokeWidth={1.75} />
      <Text variant="secondary" style={[styles.text, { color: t.fg }]}>
        {text}
      </Text>
      {onRetry ? (
        <Button label="Réessayer" variant="ghost" size="md" onPress={onRetry} />
      ) : null}
    </View>
  );
}

/** Etat d'erreur plein ecran de liste/fiche (reseau coupe -> bouton Reessayer). */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const offline = isApiError(error) && error.status === 0;
  return (
    <EmptyState
      icon={offline ? WifiOff : TriangleAlert}
      title={offline ? 'Pas de connexion' : 'Impossible de charger'}
      text={messageOf(error)}
      actionLabel="Réessayer"
      onAction={onRetry}
    />
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
  },
  text: { flex: 1 },
});
