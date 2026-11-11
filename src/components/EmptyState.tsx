import type { LucideIcon } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Button } from './Button';
import { Text } from './Text';

interface Props {
  icon: LucideIcon;
  title: string;
  text?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionLoading?: boolean;
}

/** Icone 28 fg-subtle, titre 16, texte 13 fg-muted, un seul bouton secondary. */
export function EmptyState({ icon: Icon, title, text, actionLabel, onAction, actionLoading }: Props) {
  const theme = useTheme();
  return (
    <View style={styles.wrap}>
      <Icon size={28} color={theme.fgSubtle} strokeWidth={1.75} />
      <Text variant="button" weight="semibold" style={styles.center}>
        {title}
      </Text>
      {text ? (
        <Text variant="secondary" color="muted" style={styles.center}>
          {text}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          onPress={onAction}
          variant="secondary"
          loading={actionLoading}
          style={styles.action}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 8, paddingVertical: 40, paddingHorizontal: 24 },
  center: { textAlign: 'center' },
  action: { marginTop: 8 },
});
