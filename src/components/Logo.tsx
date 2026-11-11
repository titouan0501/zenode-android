import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Polygon, Rect } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import { Text } from './Text';

const Z_COMPACT = '11,12 37,12 37,18.5 17.5,29.5 37,29.5 37,36 11,36 11,29.5 30.5,18.5 11,18.5';
const Z_PILL = '12,9.5 36,9.5 36,15 17.5,24 36,24 36,29.5 12,29.5 12,24 30.5,15 12,15';

/** Marque 48x48 (rx 11). Sous 40 px : Z seul ; au-dessus : Z + pilule verte. */
export function Logo({ size = 48 }: { size?: number }) {
  const theme = useTheme();
  const withPill = size >= 40;
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" accessibilityLabel="Zenode">
      <Rect width={48} height={48} rx={11} fill={theme.logoTile} />
      <Polygon points={withPill ? Z_PILL : Z_COMPACT} fill="#d1fae4" />
      {withPill && <Rect x={12} y={34} width={15} height={4} rx={2} fill="#3fdc94" />}
    </Svg>
  );
}

/** Logo + « ZENODE » (uppercase, letter-spacing ~0.16em, semibold). */
export function LogoWordmark({ size = 48, fontSize = 20 }: { size?: number; fontSize?: number }) {
  return (
    <View style={styles.row}>
      <Logo size={size} />
      <Text
        style={{
          fontFamily: fonts.semibold,
          fontSize,
          letterSpacing: fontSize * 0.16,
          textTransform: 'uppercase',
        }}
        accessibilityRole="header"
      >
        Zenode
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
