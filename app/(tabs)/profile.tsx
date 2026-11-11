import { useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import { Check, Copy, LogOut, Shield, Smartphone } from 'lucide-react-native';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { keys, useAccountFull, useMe, useSessions } from '@/api/queries';
import type { MobileSession } from '@/api/types';
import { revokeSession, signOut, useSession } from '@/auth/session';
import { AppUpdateSection } from '@/components/AppUpdate';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { LinkRow, SectionTitle } from '@/components/Controls';
import { ErrorBanner } from '@/components/ErrorBanner';
import { Screen } from '@/components/Screen';
import { StatusPill } from '@/components/StatusPill';
import { Text } from '@/components/Text';
import { useToast } from '@/components/Toast';
import { TopBar } from '@/components/TopBar';
import { formatRelative } from '@/lib/format';
import { openWeb, URLS } from '@/lib/links';
import { usePullRefresh } from '@/lib/usePullRefresh';
import { useThemeContext } from '@/theme/ThemeProvider';
import type { ThemePreference } from '@/theme/tokens';

const THEME_OPTIONS: { key: ThemePreference; label: string }[] = [
  { key: 'dark', label: 'Sombre' },
  { key: 'light', label: 'Clair' },
  { key: 'auto', label: 'Système' },
];

const PROVIDER_LABEL: Record<string, string> = {
  discord: 'Discord',
  google: 'Google',
  github: 'GitHub',
};

export default function Profile() {
  const { theme, preference, setPreference } = useThemeContext();
  const toast = useToast();
  const queryClient = useQueryClient();
  const session = useSession();

  const me = useMe();
  const account = useAccountFull();
  const sessions = useSessions();
  const pull = usePullRefresh([me.refetch, account.refetch, sessions.refetch]);
  const [revoking, setRevoking] = useState<string | null>(null);

  const user = me.data;
  const name = user?.global_name || user?.username || user?.email || 'Compte Zenode';
  const email = account.data?.profile?.email || user?.email || null;
  const zenodeId = user?.zenode_id || null;
  const version = Constants.expoConfig?.version ?? '1.0.0';

  async function copyId() {
    if (!zenodeId) return;
    try {
      await Clipboard.setStringAsync(zenodeId);
      toast.show('Zenode ID copié');
    } catch {
      // presse-papiers indisponible
    }
  }

  function confirmRevoke(s: MobileSession) {
    Alert.alert(
      'Révoquer cet appareil ?',
      `${s.device_name || 'Appareil'} sera déconnecté.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Révoquer',
          style: 'destructive',
          onPress: async () => {
            setRevoking(s.session_id);
            try {
              await revokeSession(s.session_id, s.current); // courant : deconnexion locale
              if (!s.current) {
                toast.show('Appareil révoqué');
                await queryClient.invalidateQueries({ queryKey: keys.sessions });
              }
            } catch (e) {
              toast.show(errorMessage(e));
            } finally {
              setRevoking(null);
            }
          },
        },
      ],
    );
  }

  const links: { key: string; linked: boolean | undefined }[] = [
    { key: 'discord', linked: user?.hasDiscordLinked },
    { key: 'google', linked: user?.hasGoogleLinked },
    { key: 'github', linked: user?.hasGithubLinked },
  ];

  return (
    <Screen
      header={<TopBar back title="Profil" />}
      scroll
      refreshing={pull.refreshing}
      onRefresh={pull.onRefresh}
    >
      {me.isError ? <ErrorBanner error={me.error} onRetry={() => me.refetch()} /> : null}

      <View style={styles.head}>
        <Avatar size={64} uri={user?.avatar_url} name={name} />
        <View style={styles.headText}>
          <Text variant="section" numberOfLines={1}>
            {name}
          </Text>
          {email ? (
            <Text variant="secondary" color="muted" numberOfLines={1}>
              {email}
            </Text>
          ) : null}
          {zenodeId ? (
            <Pressable
              onPress={copyId}
              accessibilityRole="button"
              accessibilityLabel={`Copier le Zenode ID ${zenodeId}`}
              style={styles.idRow}
              hitSlop={8}
            >
              <Text variant="meta" color="subtle" mono>
                {zenodeId}
              </Text>
              <Copy size={14} color={theme.fgSubtle} strokeWidth={1.75} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <SectionTitle>Connexions</SectionTitle>
      <Card padded={false}>
        {links.map((l, i) => (
          <View
            key={l.key}
            style={[
              styles.row,
              i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.line },
            ]}
          >
            <Text variant="body" weight="medium" style={styles.flex}>
              {PROVIDER_LABEL[l.key]}
            </Text>
            <StatusPill label={l.linked ? 'Lié' : 'Non lié'} tone={l.linked ? 'success' : 'neutral'} />
          </View>
        ))}
        <LinkRow
          label="Gérer sur le site"
          external
          divider
          onPress={() => openWeb(URLS.profile, { toolbar: theme.raised, control: theme.fg })}
        />
      </Card>

      <SectionTitle>Compte</SectionTitle>
      <Card padded={false}>
        <LinkRow label="Identité" onPress={() => router.push('/account/identity')} />
        <LinkRow label="Notifications" divider onPress={() => router.push('/account/notifications')} />
        <LinkRow label="Adresse e-mail" divider onPress={() => router.push('/account/email')} />
        <LinkRow label="Codes" divider onPress={() => router.push('/account/codes')} />
        <LinkRow label="Parrainage" divider onPress={() => router.push('/account/referral')} />
        <LinkRow label="Liens courts" divider onPress={() => router.push('/account/links')} />
        {user?.isAssociationMember ? (
          <LinkRow label="Espace adhérent" divider onPress={() => router.push('/account/adherent')} />
        ) : null}
        <LinkRow label="Facturation" divider onPress={() => router.push('/billing')} />
      </Card>

      <SectionTitle>Apparence</SectionTitle>
      <Card padded={false}>
        {THEME_OPTIONS.map((o, i) => {
          const current = preference === o.key;
          return (
            <Pressable
              key={o.key}
              onPress={() => setPreference(o.key)}
              accessibilityRole="radio"
              accessibilityState={{ selected: current }}
              accessibilityLabel={`Thème ${o.label}`}
              style={({ pressed }) => [
                styles.row,
                {
                  backgroundColor: pressed ? theme.pressed : 'transparent',
                  borderTopWidth: i > 0 ? StyleSheet.hairlineWidth : 0,
                  borderTopColor: theme.line,
                },
              ]}
            >
              <Text
                variant="body"
                weight="medium"
                style={styles.flex}
                color={current ? 'accent' : 'fg'}
              >
                {o.label}
              </Text>
              {current ? <Check size={18} color={theme.accent} strokeWidth={2.25} /> : null}
            </Pressable>
          );
        })}
      </Card>

      <SectionTitle>Appareils</SectionTitle>
      <Card padded={false}>
        {sessions.isLoading ? (
          <ActivityIndicator color={theme.accent} style={styles.loader} />
        ) : sessions.isError ? (
          <View style={styles.pad}>
            <ErrorBanner error={sessions.error} onRetry={() => sessions.refetch()} />
          </View>
        ) : (sessions.data ?? []).length === 0 ? (
          <View style={styles.row}>
            <Text variant="secondary" color="muted">
              Aucune session.
            </Text>
          </View>
        ) : (
          (sessions.data ?? []).map((s, i) => (
            <View
              key={s.session_id}
              style={[
                styles.row,
                styles.session,
                i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.line },
              ]}
            >
              <Smartphone size={20} color={theme.fgMuted} strokeWidth={1.75} />
              <View style={styles.flex}>
                <Text variant="body" weight="medium" numberOfLines={1}>
                  {s.device_name || 'Appareil'}
                </Text>
                <Text variant="meta" color="subtle" numberOfLines={1}>
                  {[PROVIDER_LABEL[s.auth_provider ?? ''], `actif ${formatRelative(s.last_used_at)}`]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
              {s.current ? (
                <StatusPill label="Cet appareil" tone="success" />
              ) : (
                <Button
                  label="Révoquer"
                  accessibilityLabel={`Révoquer l’appareil ${s.device_name ?? ''}`}
                  variant="ghost"
                  destructive
                  size="md"
                  loading={revoking === s.session_id}
                  disabled={revoking !== null && revoking !== s.session_id}
                  onPress={() => confirmRevoke(s)}
                />
              )}
            </View>
          ))
        )}
      </Card>

      {user?.hasStaffAccess ? (
        <Card padded={false}>
          <LinkRow
            icon={Shield}
            label="Portail staff sur le site"
            external
            onPress={() => openWeb(URLS.staff, { toolbar: theme.raised, control: theme.fg })}
          />
        </Card>
      ) : null}

      <AppUpdateSection />

      <Button
        label="Se déconnecter"
        accessibilityLabel="Se déconnecter"
        variant="secondary"
        size="lg"
        fullWidth
        icon={(c) => <LogOut size={18} color={c} strokeWidth={1.75} />}
        loading={session.signingOut}
        onPress={() => signOut()}
        style={styles.logout}
      />

      <Text variant="label" color="subtle" style={styles.version}>
        {`Zenode ${version}`}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 8 },
  headText: { flex: 1, minWidth: 0, gap: 2 },
  idRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, alignSelf: 'flex-start' },
  row: {
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  session: { minHeight: 64 },
  loader: { paddingVertical: 24 },
  pad: { padding: 12 },
  logout: { marginTop: 8 },
  version: {
    textAlign: 'center',
    textTransform: 'none',
    letterSpacing: 0,
    fontSize: 11,
    marginTop: 4,
  },
});
