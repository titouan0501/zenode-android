import React from 'react';
import { StyleSheet, View } from 'react-native';

import type { StatusInfo } from '@/lib/status';
import { describeStatus } from '@/lib/status';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, type ToneName } from '@/theme/tokens';
import { Text } from './Text';

interface Props {
  /** Statut API brut (ex. « running »). */
  status?: unknown;
  /** Ou un libelle/ton deja resolu. */
  info?: StatusInfo;
  label?: string;
  tone?: ToneName;
}

/** Point 8 px + libelle 12 semibold, fond soft selon le ton. */
export function StatusPill({ status, info, label, tone }: Props) {
  const theme = useTheme();
  const resolved: StatusInfo = info ?? (label ? { label, tone: tone ?? 'neutral' } : describeStatus(status));
  const t = theme.tones[resolved.tone];
  return (
    <View
      accessible
      accessibilityLabel={`Statut : ${resolved.label}`}
      style={[styles.pill, { backgroundColor: t.bg }]}
    >
      <View style={[styles.dot, { backgroundColor: t.dot }]} />
      <Text
        numberOfLines={1}
        style={{ color: t.fg, fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16 }}
      >
        {resolved.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
    flexShrink: 1,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
