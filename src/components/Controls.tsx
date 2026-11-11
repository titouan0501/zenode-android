import { ChevronRight, ExternalLink, Search, type LucideIcon } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { fontSize, fonts, radius, size } from '@/theme/tokens';
import { Text } from './Text';

// ------------------------------------------------------------- segmented

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const theme = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      style={[styles.segment, { backgroundColor: theme.sunken, borderColor: theme.line }]}
    >
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={o.label}
            style={[
              styles.segmentItem,
              active && { backgroundColor: theme.surface, borderColor: theme.line, borderWidth: 1 },
            ]}
          >
            <Text
              variant="body"
              weight="medium"
              style={{ color: active ? theme.fg : theme.fgMuted }}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function TabStrip<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const theme = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.tabs}
    >
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[
              styles.tab,
              {
                backgroundColor: active ? theme.surface : 'transparent',
                borderColor: active ? theme.line : 'transparent',
              },
            ]}
          >
            <Text variant="meta" weight="medium" style={{ color: active ? theme.fg : theme.fgMuted }}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  secure,
  multiline,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  secure?: boolean;
  multiline?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) {
  const theme = useTheme();
  return (
    <View style={styles.fieldBlock}>
      <Text variant="label" color="subtle">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.fgSubtle}
        secureTextEntry={secure}
        multiline={multiline}
        autoCapitalize={autoCapitalize ?? 'none'}
        autoCorrect={false}
        accessibilityLabel={label}
        selectionColor={theme.accent}
        style={[
          styles.area,
          multiline && styles.areaMulti,
          {
            color: theme.fg,
            backgroundColor: theme.sunken,
            borderColor: theme.line,
            fontFamily: fonts.regular,
          },
        ]}
      />
    </View>
  );
}

// ----------------------------------------------------------------- champ

export function SearchField({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
}) {
  const theme = useTheme();
  const [focus, setFocus] = useState(false);
  return (
    <View
      style={[
        styles.field,
        { backgroundColor: theme.sunken, borderColor: focus ? theme.accent : theme.line },
      ]}
    >
      <Search size={18} color={theme.fgSubtle} strokeWidth={1.75} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.fgSubtle}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        accessibilityLabel={placeholder}
        selectionColor={theme.accent}
        style={[styles.input, { color: theme.fg, fontFamily: fonts.regular }]}
      />
    </View>
  );
}

// --------------------------------------------------------------- sections

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text variant="secondary" color="muted" weight="semibold" accessibilityRole="header">
      {children}
    </Text>
  );
}

/** Rangee de navigation / lien (chevron, ou icone lien externe). */
export function LinkRow({
  icon: Icon,
  label,
  detail,
  external,
  onPress,
  divider,
  accessibilityLabel,
  right,
}: {
  icon?: LucideIcon;
  label: string;
  detail?: string;
  external?: boolean;
  onPress: () => void;
  divider?: boolean;
  accessibilityLabel?: string;
  right?: React.ReactNode;
}) {
  const theme = useTheme();
  const Trail = external ? ExternalLink : ChevronRight;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [
        styles.link,
        {
          backgroundColor: pressed ? theme.pressed : 'transparent',
          borderTopWidth: divider ? StyleSheet.hairlineWidth : 0,
          borderTopColor: theme.line,
        },
      ]}
    >
      {Icon ? <Icon size={20} color={theme.fgMuted} strokeWidth={1.75} /> : null}
      <View style={styles.linkText}>
        <Text variant="body" weight="medium" numberOfLines={1}>
          {label}
        </Text>
        {detail ? (
          <Text variant="meta" color="subtle" numberOfLines={1}>
            {detail}
          </Text>
        ) : null}
      </View>
      {right}
      <Trail size={18} color={theme.fgSubtle} strokeWidth={1.75} />
    </Pressable>
  );
}

/** Barre fine (hauteur 4) : fond sunken, remplissage accent. */
export function ProgressBar({ ratio, label, detail }: { ratio: number; label: string; detail: string }) {
  const theme = useTheme();
  return (
    <View
      style={styles.bar}
      accessible
      accessibilityLabel={`${label} : ${detail}`}
    >
      <View style={styles.barHead}>
        <Text variant="meta" color="muted">
          {label}
        </Text>
        <Text variant="meta" color="subtle" mono>
          {detail}
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: theme.sunken }]}>
        <View
          style={{
            width: `${Math.round(ratio * 100)}%`,
            height: '100%',
            backgroundColor: theme.accent,
            borderRadius: 2,
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  segment: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: radius.control,
    borderWidth: 1,
    gap: 2,
  },
  segmentItem: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  field: {
    height: size.field,
    borderRadius: radius.control,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: { flex: 1, fontSize: fontSize.body, paddingVertical: 0, height: '100%' },
  link: {
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  linkText: { flex: 1, minWidth: 0, gap: 2 },
  bar: { gap: 6 },
  barHead: { flexDirection: 'row', justifyContent: 'space-between' },
  track: { height: 4, borderRadius: 2, overflow: 'hidden' },
  tabs: { gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  tab: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldBlock: { gap: 6 },
  area: {
    minHeight: size.field,
    borderRadius: radius.control,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: fontSize.body,
  },
  areaMulti: { minHeight: 96, textAlignVertical: 'top' },
});
