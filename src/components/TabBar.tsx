import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { House, LayoutGrid, LifeBuoy, Server, type LucideIcon } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';
import { size } from '@/theme/tokens';
import { Text } from './Text';

const TABS: Record<string, { label: string; icon: LucideIcon }> = {
  index: { label: 'Accueil', icon: House },
  services: { label: 'Services', icon: Server },
  shop: { label: 'Offres', icon: LayoutGrid },
  support: { label: 'Support', icon: LifeBuoy },
};
const ORDER = ['index', 'services', 'shop', 'support'];

/** Fond raised, filet haut. Actif : icône claire et tiret, sans pastille. */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const focusedName = state.routes[state.index]?.name;

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: theme.raised,
          borderTopColor: theme.line,
          height: size.tabBar + insets.bottom,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      {ORDER.map((name) => {
        const route = state.routes.find((r) => r.name === name);
        if (!route) return null;
        const { label, icon: Icon } = TABS[name];
        const active = focusedName === name;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected: active }}
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!active && !event.defaultPrevented) navigation.navigate(route.name);
            }}
            style={styles.item}
          >
            <Icon
              size={22}
              color={active ? theme.fg : theme.fgSubtle}
              strokeWidth={active ? 2 : 1.75}
            />
            <View style={[styles.mark, { backgroundColor: active ? theme.fg : 'transparent' }]} />
            <Text
              style={styles.label}
              variant="meta"
              weight={active ? 'semibold' : 'medium'}
              color={active ? 'fg' : 'subtle'}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  mark: { width: 16, height: 2, borderRadius: 1 },
  label: { fontSize: 11, lineHeight: 14 },
});
