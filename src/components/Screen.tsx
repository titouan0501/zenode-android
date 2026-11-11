import { BottomTabBarHeightContext } from 'expo-router/js-tabs';
import React, { useContext } from 'react';
import {
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

export function useRefreshControlProps() {
  const theme = useTheme();
  return {
    colors: [theme.accent],
    tintColor: theme.accent,
    progressBackgroundColor: theme.raised,
  };
}

export function AppRefreshControl({
  refreshing,
  onRefresh,
}: {
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const props = useRefreshControlProps();
  return <RefreshControl refreshing={refreshing} onRefresh={onRefresh} {...props} />;
}

/**
 * Sur le web, RefreshControl avale le contenu du défilement.
 * Le geste de rafraîchissement reste sur Android.
 */
export function listRefreshControl(refreshing: boolean, onRefresh: () => void) {
  if (Platform.OS === 'web') return undefined;
  return <AppRefreshControl refreshing={refreshing} onRefresh={onRefresh} />;
}

interface ScreenProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  /** Barre d'actions collee en bas (fiches). */
  footer?: React.ReactNode;
  /** true : contenu dans un ScrollView avec pull-to-refresh. */
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Ajoute l'inset de navigation en bas (ecrans sans tab bar ni footer). */
  bottomInset?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}

/** Fond canvas + insets. Aucun ecran ne pose un View blanc. */
export function Screen({
  children,
  header,
  footer,
  scroll,
  refreshing = false,
  onRefresh,
  bottomInset,
  contentStyle,
}: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  // Hors des onglets le contexte vaut undefined : l'écran prend toute la fenêtre.
  const tabBarHeight = useContext(BottomTabBarHeightContext) ?? 0;
  const web = Platform.OS === 'web';
  // Android : le conteneur d'onglet ne transmet pas flex, le défilement restait à hauteur 0.
  const height = Math.max(0, windowHeight - tabBarHeight);

  return (
    <View
      style={[
        styles.root,
        web ? styles.webFill : { height },
        { backgroundColor: theme.canvas, paddingTop: insets.top },
      ]}
    >
      {header}
      {scroll ? (
        <ScrollView
          style={styles.flex}
          collapsable={false}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: 24 + (bottomInset && !footer ? insets.bottom : 0) },
            contentStyle,
          ]}
          keyboardShouldPersistTaps="handled"
          refreshControl={onRefresh ? listRefreshControl(refreshing, onRefresh) : undefined}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={styles.flex} collapsable={false}>
          {children}
        </View>
      )}
      {footer}
    </View>
  );
}

/** Barre d'actions sticky : fond canvas, bord haut line, padding 16. */
export function ActionBar({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.actions,
        {
          backgroundColor: theme.canvas,
          borderTopColor: theme.line,
          paddingBottom: 16 + insets.bottom,
        },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%', flexDirection: 'column' },
  webFill: { flex: 1, height: '100%' },
  flex: { flex: 1, minHeight: 0 },
  content: { flexGrow: 1, paddingHorizontal: space.screenX, paddingTop: 4, gap: space.gap },
  actions: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    gap: 12,
  },
});
