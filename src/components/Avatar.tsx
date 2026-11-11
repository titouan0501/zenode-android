import type { LucideIcon } from 'lucide-react-native';
import React, { useState } from 'react';
import { Image, View } from 'react-native';

import { initials } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import { Text } from './Text';

interface Props {
  size?: number;
  uri?: string | null;
  name?: string | null;
  /** Icone de repli (serveurs) au lieu des initiales. */
  icon?: LucideIcon;
  shape?: 'circle' | 'square';
  /** Bord de l'avatar (couleur du bot). */
  borderColor?: string | null;
}

/** Image si dispo, sinon initiales (ou icone) sur accent-soft / accent. */
export function Avatar({ size = 40, uri, name, icon: Icon, shape = 'circle', borderColor }: Props) {
  const theme = useTheme();
  const [failed, setFailed] = useState(false);
  const r = shape === 'circle' ? size / 2 : 10;
  const showImage = !!uri && !failed;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: r,
        backgroundColor: theme.accentSoft,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderWidth: borderColor ? 2 : 0,
        borderColor: borderColor ?? undefined,
      }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {showImage ? (
        <Image
          source={{ uri: uri! }}
          style={{ width: '100%', height: '100%' }}
          onError={() => setFailed(true)}
        />
      ) : Icon ? (
        <Icon size={size * 0.5} color={theme.accent} strokeWidth={1.75} />
      ) : (
        <Text style={{ color: theme.accent, fontFamily: fonts.semibold, fontSize: size * 0.36 }}>
          {initials(name)}
        </Text>
      )}
    </View>
  );
}
