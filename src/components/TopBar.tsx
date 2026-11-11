import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { size } from '@/theme/tokens';
import { IconButton } from './Button';
import { Text } from './Text';

interface Props {
  title?: string;
  /** Affiche un bouton retour. */
  back?: boolean;
  /** Remplace le titre (ex. logo + Zenode sur l'accueil). */
  leading?: React.ReactNode;
  right?: React.ReactNode;
}

/** Fond canvas, titre 16 semibold a gauche, actions a droite en ghost. */
export function TopBar({ title, back, leading, right }: Props) {
  const theme = useTheme();
  return (
    <View style={[styles.bar, { backgroundColor: theme.canvas, paddingLeft: back ? 4 : 16 }]}>
      {back ? (
        <IconButton
          accessibilityLabel="Retour"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        >
          <ArrowLeft size={22} color={theme.fg} strokeWidth={1.75} />
        </IconButton>
      ) : null}
      <View style={styles.title}>
        {leading ?? (
          <Text variant="button" weight="semibold" numberOfLines={1} accessibilityRole="header">
            {title}
          </Text>
        )}
      </View>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: size.topBar,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 4,
  },
  title: { flex: 1, minWidth: 0, paddingLeft: 4, justifyContent: 'center' },
  right: { flexDirection: 'row', alignItems: 'center' },
});
