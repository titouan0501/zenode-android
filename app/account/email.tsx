import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useEmailChange } from '@/api/panel';
import { Button } from '@/components/Button';
import { TextField } from '@/components/Controls';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { TopBar } from '@/components/TopBar';

export default function EmailChange() {
  const { pending, requestCode, confirm } = useEmailChange();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const waiting = pending.data?.pending || pending.data?.email;

  return (
    <Screen header={<TopBar back title="Adresse e-mail" />} scroll bottomInset>
      <View style={styles.gap}>
        <Text variant="secondary" color="muted">
          Un code est envoyé à la nouvelle adresse. La confirmation remplace l’adresse du compte.
        </Text>
        {typeof waiting === 'string' && waiting ? (
          <Text variant="meta" color="subtle">
            {`Demande en cours pour ${waiting}.`}
          </Text>
        ) : null}
        <TextField label="Nouvelle adresse" value={email} onChangeText={setEmail} placeholder="nom@exemple.fr" />
        <Button
          label="Envoyer le code"
          variant="secondary"
          loading={requestCode.isPending}
          disabled={!email.includes('@')}
          onPress={() => requestCode.mutate(email.trim())}
        />
        <TextField label="Code reçu" value={code} onChangeText={setCode} placeholder="Code" />
        <Button
          label="Confirmer"
          variant="primary"
          loading={confirm.isPending}
          disabled={code.trim().length < 4}
          onPress={() => confirm.mutate(code.trim(), { onSuccess: () => setCode('') })}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ gap: { gap: 12 } });
