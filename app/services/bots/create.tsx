import { router } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useCreateBot } from '@/api/panel';
import { Button } from '@/components/Button';
import { TextField } from '@/components/Controls';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { TopBar } from '@/components/TopBar';

function validToken(token: string) {
  const t = token.trim();
  const parts = t.split('.');
  return parts.length === 3 && parts.every((p) => p.length >= 4) && t.length >= 50 && !/^https?:/i.test(t);
}

export default function CreateBot() {
  const create = useCreateBot();
  const [name, setName] = useState('');
  const [token, setToken] = useState('');
  const [color, setColor] = useState('#3DDC97');
  const nameOk = name.trim().length >= 2;
  const tokenOk = validToken(token);
  const colorOk = /^#[0-9A-Fa-f]{6}$/.test(color);

  return (
    <Screen header={<TopBar back title="Nouveau bot" />} scroll bottomInset>
      <View style={styles.gap}>
        <Text variant="secondary" color="muted">
          Nom, jeton Discord et couleur. Le jeton n’est pas conservé dans l’application.
        </Text>
        <TextField label="Nom" value={name} onChangeText={setName} placeholder="Nom du bot" autoCapitalize="words" />
        <TextField label="Jeton Discord" value={token} onChangeText={setToken} secure placeholder="Jeton" />
        <TextField label="Couleur" value={color} onChangeText={setColor} placeholder="#3DDC97" />
        <Button
          label="Créer le bot"
          variant="primary"
          size="lg"
          fullWidth
          loading={create.isPending}
          disabled={!nameOk || !tokenOk || !colorOk}
          onPress={() =>
            create.mutate(
              { name: name.trim(), token: token.trim(), color },
              { onSuccess: () => router.back() },
            )
          }
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ gap: { gap: 14 } });
