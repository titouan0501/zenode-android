import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useSaveProfile } from '@/api/panel';
import { useAccountFull } from '@/api/queries';
import { Button } from '@/components/Button';
import { TextField } from '@/components/Controls';
import { ErrorBanner } from '@/components/ErrorBanner';
import { Screen } from '@/components/Screen';
import { TopBar } from '@/components/TopBar';
import { useTheme } from '@/theme/ThemeProvider';

export default function Identity() {
  const theme = useTheme();
  const account = useAccountFull();
  const save = useSaveProfile();
  const profile = account.data?.profile;
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [timezone, setTimezone] = useState('Europe/Paris');

  useEffect(() => {
    if (!profile) return;
    setName(typeof profile.display_name === 'string' ? profile.display_name : '');
    setBio(typeof profile.bio === 'string' ? profile.bio : '');
    setTimezone(typeof profile.timezone === 'string' && profile.timezone ? profile.timezone : 'Europe/Paris');
  }, [profile]);

  return (
    <Screen header={<TopBar back title="Identité" />} scroll bottomInset>
      <View style={styles.gap}>
        {account.isLoading ? <ActivityIndicator color={theme.accent} /> : null}
        {account.isError ? <ErrorBanner error={account.error} onRetry={() => account.refetch()} /> : null}
        <TextField label="Nom affiché" value={name} onChangeText={setName} autoCapitalize="words" />
        <TextField label="Bio" value={bio} onChangeText={setBio} multiline autoCapitalize="sentences" />
        <TextField label="Fuseau horaire" value={timezone} onChangeText={setTimezone} placeholder="Europe/Paris" />
        <Button
          label="Enregistrer"
          variant="primary"
          loading={save.isPending}
          onPress={() => save.mutate({ display_name: name.trim(), bio: bio.trim(), timezone: timezone.trim() })}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ gap: { gap: 12 } });
