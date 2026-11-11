import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';

interface Props {
  children: React.ReactNode;
  /** false : pas de padding (listes de rangees pleine largeur). */
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Fond surface, bord 1 px line, rayon 12, padding 16. Pas de carte dans une carte. */
export function Card({ children, padded = true, style }: Props) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.surface,
          borderColor: theme.line,
          borderWidth: 1,
          borderRadius: radius.card,
          padding: padded ? 16 : 0,
          overflow: 'hidden',
        },
        !theme.isDark && {
          shadowColor: '#111110',
          shadowOpacity: 0.06,
          shadowRadius: 3,
          shadowOffset: { width: 0, height: 1 },
          elevation: 1,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
