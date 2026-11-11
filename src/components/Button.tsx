import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { fontSize, fonts, radius, size as sizes } from '@/theme/tokens';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'lg' | 'xl';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Rend l'icone a gauche, avec la couleur du texte. */
  icon?: (color: string) => React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  /** Ghost : texte en couleur danger (ex. « Revoquer »). */
  destructive?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

const HEIGHT: Record<ButtonSize, number> = {
  md: sizes.buttonMd,
  lg: sizes.buttonLg,
  xl: sizes.buttonXl,
};

export function Button({
  label,
  onPress,
  variant = 'secondary',
  size = 'lg',
  icon,
  loading,
  disabled,
  fullWidth,
  destructive,
  accessibilityLabel,
  style,
}: ButtonProps) {
  const theme = useTheme();
  const inactive = disabled || loading;

  let bg = 'transparent';
  let pressedBg = theme.pressed;
  let border = 'transparent';
  let color = theme.fgMuted;

  switch (variant) {
    case 'primary':
      bg = theme.accent;
      pressedBg = theme.accentHover;
      color = theme.accentFg;
      break;
    case 'secondary':
      bg = theme.secondaryBg;
      border = theme.line;
      color = theme.fg;
      break;
    case 'danger':
      bg = theme.danger;
      pressedBg = theme.danger;
      color = '#ffffff';
      break;
    case 'ghost':
      color = destructive ? theme.tones.danger.dot : theme.fgMuted;
      break;
  }

  const halo =
    variant === 'primary'
      ? theme.isDark
        ? {
            shadowColor: theme.accent,
            shadowOpacity: 0.35,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 4 },
            elevation: 6,
          }
        : {
            shadowColor: '#111110',
            shadowOpacity: 0.06,
            shadowRadius: 4,
            shadowOffset: { width: 0, height: 1 },
            elevation: 1,
          }
      : null;

  const h = HEIGHT[size];
  const hit = Math.max(0, Math.ceil((sizes.touch - h) / 2));

  return (
    <Pressable
      onPress={inactive ? undefined : onPress}
      disabled={inactive}
      hitSlop={{ top: hit, bottom: hit }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      style={({ pressed }) => [
        styles.base,
        {
          height: h,
          backgroundColor: pressed && !inactive ? pressedBg : bg,
          borderColor: border,
          opacity: disabled ? 0.55 : 1,
          paddingHorizontal: size === 'md' ? 12 : 16,
        },
        halo,
        fullWidth && styles.full,
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size={16} color={color} />
        ) : icon ? (
          icon(color)
        ) : null}
        <Text
          numberOfLines={1}
          style={{
            color,
            fontFamily: fonts.medium,
            fontSize: size === 'md' ? fontSize.body : fontSize.button,
          }}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

/** Bouton icone seul (ghost), zone tactile 44. */
export function IconButton({
  children,
  onPress,
  accessibilityLabel,
}: {
  children: React.ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.icon,
        { backgroundColor: pressed ? theme.pressed : 'transparent' },
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.control,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  full: { alignSelf: 'stretch' },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  icon: {
    width: sizes.touch,
    height: sizes.touch,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
