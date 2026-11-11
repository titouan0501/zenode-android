import React from 'react';
import { Text as RNText, type TextProps, type TextStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { fontSize, fonts, type Theme } from '@/theme/tokens';

export type TextVariant =
  | 'kpi'
  | 'title'
  | 'section'
  | 'button'
  | 'body'
  | 'bodyStrong'
  | 'secondary'
  | 'meta'
  | 'label';

export type TextColor = 'fg' | 'muted' | 'subtle' | 'accent' | 'danger' | 'inverse' | 'accentFg';

const VARIANTS: Record<TextVariant, TextStyle> = {
  kpi: { fontFamily: fonts.semibold, fontSize: fontSize.kpi, lineHeight: 34 },
  title: { fontFamily: fonts.semibold, fontSize: fontSize.title, lineHeight: 30 },
  section: { fontFamily: fonts.semibold, fontSize: fontSize.section, lineHeight: 26 },
  button: { fontFamily: fonts.medium, fontSize: fontSize.button, lineHeight: 20 },
  body: { fontFamily: fonts.regular, fontSize: fontSize.body, lineHeight: 20 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: fontSize.body, lineHeight: 20 },
  secondary: { fontFamily: fonts.regular, fontSize: fontSize.secondary, lineHeight: 18 },
  meta: { fontFamily: fonts.regular, fontSize: fontSize.meta, lineHeight: 16 },
  label: {
    fontFamily: fonts.medium,
    fontSize: fontSize.tab,
    lineHeight: 14,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
};

function colorOf(theme: Theme, c: TextColor): string {
  switch (c) {
    case 'muted':
      return theme.fgMuted;
    case 'subtle':
      return theme.fgSubtle;
    case 'accent':
      return theme.accent;
    case 'danger':
      return theme.tones.danger.dot;
    case 'inverse':
      return theme.fgInverse;
    case 'accentFg':
      return theme.accentFg;
    default:
      return theme.fg;
  }
}

interface Props extends TextProps {
  variant?: TextVariant;
  color?: TextColor;
  /** JetBrains Mono : identifiants, ports, Zenode ID. */
  mono?: boolean;
  weight?: 'regular' | 'medium' | 'semibold';
}

export function Text({ variant = 'body', color = 'fg', mono, weight, style, ...rest }: Props) {
  const theme = useTheme();
  const base = VARIANTS[variant];
  const family = mono
    ? weight === 'medium' || weight === 'semibold'
      ? fonts.monoMedium
      : fonts.mono
    : weight
      ? fonts[weight]
      : base.fontFamily;
  return <RNText {...rest} style={[base, { color: colorOf(theme, color), fontFamily: family }, style]} />;
}
