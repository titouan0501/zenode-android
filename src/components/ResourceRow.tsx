import type { LucideIcon } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { StatusInfo } from '@/lib/status';
import { useTheme } from '@/theme/ThemeProvider';
import { Avatar } from './Avatar';
import { StatusPill } from './StatusPill';
import { Text } from './Text';

interface Props {
  title: string;
  subtitle?: string | null;
  /** Sous-titre en JetBrains Mono (identifiants). */
  monoSubtitle?: boolean;
  avatarUrl?: string | null;
  avatarBorder?: string | null;
  icon?: LucideIcon;
  shape?: 'circle' | 'square';
  status: StatusInfo;
  onPress: () => void;
  /** Separateur `line` au-dessus (liste dans une carte). */
  divider?: boolean;
  accessibilityLabel?: string;
}

/** Rangee de liste : hauteur min 64, avatar/icone 40, titre 14 semibold, pastille a droite. */
export function ResourceRow({
  title,
  subtitle,
  monoSubtitle,
  avatarUrl,
  avatarBorder,
  icon,
  shape = 'circle',
  status,
  onPress,
  divider,
  accessibilityLabel,
}: Props) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? `${title}, ${status.label}`}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed ? theme.pressed : 'transparent',
          borderTopWidth: divider ? StyleSheet.hairlineWidth : 0,
          borderTopColor: theme.line,
        },
      ]}
    >
      <Avatar size={40} uri={avatarUrl} name={title} icon={icon} shape={shape} borderColor={avatarBorder} />
      <View style={styles.texts}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="meta" color="subtle" mono={monoSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <StatusPill info={status} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  texts: { flex: 1, minWidth: 0, gap: 2 },
});
