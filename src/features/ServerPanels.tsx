import { router } from 'expo-router';
import { Folder, FileText } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import {
  consoleWebSocketUrl,
  fetchConsoleTicket,
  useBackupMutations,
  useBackups,
  useFileMutations,
  useSaveStartup,
  useServerFiles,
  useServerManagerMutations,
  useServerManagers,
  useStartup,
  useSubdomainMutations,
  useSuffixes,
  type FileEntry,
} from '@/api/panel';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { TextField } from '@/components/Controls';
import { ErrorBanner } from '@/components/ErrorBanner';
import { Text } from '@/components/Text';
import { formatBytes, formatDate } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';

function joinPath(dir: string, name: string) {
  if (!dir || dir === '/') return `/${name}`;
  return `${dir.replace(/\/$/, '')}/${name}`;
}

function parentPath(dir: string) {
  if (!dir || dir === '/') return null;
  const parts = dir.split('/').filter(Boolean);
  parts.pop();
  return parts.length ? `/${parts.join('/')}` : '/';
}

function isTextFile(entry: FileEntry) {
  if (entry.directory) return false;
  if (/^text\/|json|xml|javascript|yaml/.test(entry.mime)) return true;
  return /\.(txt|log|json|yml|yaml|xml|properties|toml|cfg|conf|ini|md|js|ts|mjs|py|sh|env|csv|html|css)$/i.test(
    entry.name,
  );
}

export function ServerFiles({ serverId }: { serverId: string }) {
  const theme = useTheme();
  const [dir, setDir] = useState('/');
  const [folderName, setFolderName] = useState('');
  const files = useServerFiles(serverId, dir);
  const mut = useFileMutations(serverId);
  const parent = parentPath(files.data?.directory || dir);

  async function upload() {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      file.text().then((content) => {
        mut.write.mutate({ path: joinPath(dir, file.name), content });
      });
    };
    input.click();
  }

  return (
    <View style={styles.flex}>
      <View style={styles.toolbar}>
        <Text variant="meta" color="subtle" mono numberOfLines={1} style={styles.flex}>
          {files.data?.directory || dir}
        </Text>
        {parent ? (
          <Button label="Dossier parent" size="md" variant="secondary" onPress={() => setDir(parent)} />
        ) : null}
      </View>
      <View style={styles.toolbar}>
        <View style={styles.flex}>
          <TextField label="Nouveau dossier" value={folderName} onChangeText={setFolderName} placeholder="nom" />
        </View>
        <Button
          label="Créer"
          size="md"
          variant="secondary"
          loading={mut.mkdir.isPending}
          disabled={!folderName.trim()}
          onPress={() => mut.mkdir.mutate({ directory: dir, name: folderName.trim() }, { onSuccess: () => setFolderName('') })}
        />
      </View>
      {Platform.OS === 'web' ? (
        <Button label="Envoyer un fichier texte" variant="secondary" onPress={upload} />
      ) : (
        <Text variant="meta" color="subtle">
          La création de fichier se fait depuis l’éditeur.
        </Text>
      )}
      {files.isLoading ? <ActivityIndicator color={theme.accent} /> : null}
      {files.isError ? <ErrorBanner error={files.error} onRetry={() => files.refetch()} /> : null}
      <ScrollView style={styles.flex} contentContainerStyle={styles.list}>
        {(files.data?.entries ?? []).length === 0 && !files.isLoading ? (
          <Text variant="secondary" color="muted">
            Dossier vide.
          </Text>
        ) : null}
        {(files.data?.entries ?? []).map((entry) => {
          const path = joinPath(files.data?.directory || dir, entry.name);
          return (
            <Pressable
              key={path}
              onPress={() => {
                if (entry.directory) setDir(path);
                else if (isTextFile(entry)) {
                  router.push({
                    pathname: '/services/servers/[id]/file',
                    params: { id: serverId, path: encodeURIComponent(path) },
                  });
                }
              }}
              style={({ pressed }) => [styles.file, { backgroundColor: pressed ? theme.pressed : 'transparent' }]}
            >
              {entry.directory ? (
                <Folder size={18} color={theme.fgMuted} strokeWidth={1.75} />
              ) : (
                <FileText size={18} color={theme.fgMuted} strokeWidth={1.75} />
              )}
              <View style={styles.flex}>
                <Text variant="body" weight="medium" numberOfLines={1}>
                  {entry.name}
                </Text>
                <Text variant="meta" color="subtle">
                  {entry.directory ? 'Dossier' : formatBytes(entry.size)}
                  {!entry.directory && !isTextFile(entry) ? ' · binaire' : ''}
                </Text>
              </View>
              {!entry.directory && /\.(zip|tar|gz|tgz)$/i.test(entry.name) ? (
                <Button label="Extraire" size="md" variant="ghost" onPress={() => mut.decompress.mutate(path)} />
              ) : null}
              <Button
                label="Supprimer"
                size="md"
                variant="ghost"
                destructive
                onPress={() =>
                  Alert.alert('Supprimer ?', entry.name, [
                    { text: 'Annuler', style: 'cancel' },
                    { text: 'Supprimer', style: 'destructive', onPress: () => mut.remove.mutate([path]) },
                  ])
                }
              />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function ServerConsole({ serverId }: { serverId: string }) {
  const theme = useTheme();
  const [lines, setLines] = useState<string[]>([]);
  const [status, setStatus] = useState('connexion');
  const [error, setError] = useState<string | null>(null);
  const [command, setCommand] = useState('');
  const [socket, setSocket] = useState<WebSocket | null>(null);

  useEffect(() => {
    let closed = false;
    let ws: WebSocket | null = null;
    setStatus('connexion');
    setError(null);
    fetchConsoleTicket(serverId)
      .then((ticket) => {
        if (closed) return;
        ws = new WebSocket(consoleWebSocketUrl(serverId, ticket));
        setSocket(ws);
        ws.onmessage = (event) => {
          let payload: any = null;
          try {
            payload = JSON.parse(String(event.data));
          } catch {
            payload = { event: 'output', line: String(event.data) };
          }
          if (payload?.event === 'output' && payload.line != null) {
            setLines((prev) => [...prev.slice(-200), String(payload.line)]);
          } else if (payload?.event === 'ready') setStatus('en direct');
          else if (payload?.event === 'status' && payload.state) setStatus(String(payload.state));
          else if (payload?.event === 'error') setError(payload.message || 'Console indisponible.');
        };
        ws.onerror = () => {
          if (!closed) setError('Connexion interrompue.');
        };
        ws.onclose = () => {
          if (!closed) setStatus('fermée');
        };
      })
      .catch((e) => {
        if (!closed) setError(e instanceof Error ? e.message : 'Console indisponible.');
      });
    return () => {
      closed = true;
      ws?.close();
    };
  }, [serverId]);

  function send() {
    const value = command.trim();
    if (!value || !socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({ event: 'command', command: value }));
    setLines((prev) => [...prev, `> ${value}`]);
    setCommand('');
  }

  return (
    <View style={styles.flex}>
      <Text variant="meta" color="subtle">
        {status}
      </Text>
      {error ? <ErrorBanner message={error} /> : null}
      <ScrollView style={[styles.console, { backgroundColor: theme.sunken, borderColor: theme.line }]}>
        {lines.length === 0 ? (
          <Text variant="meta" color="subtle">
            En attente de sortie.
          </Text>
        ) : (
          lines.map((line, i) => (
            <Text key={`${i}-${line.slice(0, 12)}`} selectable style={{ color: theme.fgMuted, fontSize: 12 }}>
              {line || ' '}
            </Text>
          ))
        )}
      </ScrollView>
      <TextField label="Commande" value={command} onChangeText={setCommand} placeholder="Commande" />
      <Button label="Envoyer" variant="primary" disabled={!command.trim()} onPress={send} />
    </View>
  );
}

export function ServerStartup({ serverId }: { serverId: string }) {
  const theme = useTheme();
  const query = useStartup(serverId);
  const save = useSaveStartup(serverId);
  const [command, setCommand] = useState('');
  const [image, setImage] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!query.data) return;
    setCommand(query.data.command);
    setImage(query.data.image);
    const next: Record<string, string> = {};
    for (const v of query.data.variables) next[v.key] = v.value;
    setValues(next);
  }, [query.data]);

  if (query.isLoading) return <ActivityIndicator color={theme.accent} />;
  if (query.isError) return <ErrorBanner error={query.error} onRetry={() => query.refetch()} />;
  const data = query.data;
  if (!data) return null;

  return (
    <ScrollView contentContainerStyle={styles.list}>
      <TextField label="Commande" value={command} onChangeText={setCommand} multiline />
      <TextField label="Image Docker" value={image} onChangeText={setImage} />
      {data.images.length > 0 ? (
        <Text variant="meta" color="subtle">
          {data.images.join(' · ')}
        </Text>
      ) : null}
      {data.variables.map((v) => (
        <TextField
          key={v.key}
          label={v.name || v.key}
          value={values[v.key] ?? ''}
          onChangeText={(text) => setValues((prev) => ({ ...prev, [v.key]: text }))}
          placeholder={v.description || v.key}
        />
      ))}
      <Button
        label="Enregistrer"
        variant="primary"
        loading={save.isPending}
        onPress={() => save.mutate({ startup: command, docker_image: image, environment: values })}
      />
    </ScrollView>
  );
}

export function ServerBackups({ serverId }: { serverId: string }) {
  const theme = useTheme();
  const query = useBackups(serverId);
  const mut = useBackupMutations(serverId);
  if (query.isLoading) return <ActivityIndicator color={theme.accent} />;
  if (query.isError) return <ErrorBanner error={query.error} onRetry={() => query.refetch()} />;
  const data = query.data;
  return (
    <ScrollView contentContainerStyle={styles.list}>
      <Text variant="secondary" color="muted">
        {data?.used ?? 0}
        {data?.limit != null ? ` / ${data.limit}` : ''} sauvegarde{(data?.used ?? 0) > 1 ? 's' : ''}
      </Text>
      <Button label="Créer une sauvegarde" variant="primary" loading={mut.create.isPending} onPress={() => mut.create.mutate()} />
      {(data?.backups ?? []).length === 0 ? (
        <Text variant="secondary" color="muted">
          Aucune sauvegarde.
        </Text>
      ) : (
        data?.backups.map((b) => (
          <Card key={b.id} style={styles.list}>
            <Text variant="body" weight="medium">
              {b.name}
            </Text>
            <Text variant="meta" color="subtle">
              {[b.status, formatDate(b.createdAt), b.bytes != null ? formatBytes(b.bytes) : null].filter(Boolean).join(' · ')}
            </Text>
            {b.error ? (
              <Text variant="meta" color="muted">
                {b.error}
              </Text>
            ) : null}
            <Button
              label="Restaurer"
              variant="secondary"
              size="md"
              loading={mut.restore.isPending && mut.restore.variables === b.id}
              onPress={() =>
                Alert.alert('Restaurer cette sauvegarde ?', 'Les fichiers actuels seront remplacés.', [
                  { text: 'Annuler', style: 'cancel' },
                  { text: 'Restaurer', style: 'destructive', onPress: () => mut.restore.mutate(b.id) },
                ])
              }
            />
          </Card>
        ))
      )}
    </ScrollView>
  );
}

export function ServerAccess({ serverId }: { serverId: string }) {
  const theme = useTheme();
  const managers = useServerManagers(serverId);
  const { invite, revoke } = useServerManagerMutations(serverId);
  const [email, setEmail] = useState('');
  return (
    <ScrollView contentContainerStyle={styles.list}>
      <TextField label="Inviter par e-mail" value={email} onChangeText={setEmail} placeholder="nom@exemple.fr" />
      <Button
        label="Inviter"
        variant="primary"
        disabled={!email.includes('@')}
        loading={invite.isPending}
        onPress={() => invite.mutate(email.trim(), { onSuccess: () => setEmail('') })}
      />
      {managers.isLoading ? <ActivityIndicator color={theme.accent} /> : null}
      {managers.isError ? <ErrorBanner error={managers.error} onRetry={() => managers.refetch()} /> : null}
      {(managers.data ?? []).length === 0 && !managers.isLoading ? (
        <Text variant="secondary" color="muted">
          Aucun gestionnaire.
        </Text>
      ) : (
        (managers.data ?? []).map((m) => (
          <Card key={m.id || m.email} style={styles.row}>
            <View style={styles.flex}>
              <Text variant="body" weight="medium">
                {m.email || 'Gestionnaire'}
              </Text>
              <Text variant="meta" color="subtle">
                {[m.role, m.status].filter(Boolean).join(' · ')}
              </Text>
            </View>
            <Button
              label="Retirer"
              variant="ghost"
              destructive
              size="md"
              onPress={() => revoke.mutate(m.id)}
            />
          </Card>
        ))
      )}
    </ScrollView>
  );
}

export function ServerNetwork({
  serverId,
  fqdn,
}: {
  serverId: string;
  fqdn: string | null;
}) {
  const suffixes = useSuffixes();
  const mut = useSubdomainMutations(serverId);
  const [name, setName] = useState('');
  const [suffix, setSuffix] = useState('');

  useEffect(() => {
    if (!suffix && suffixes.data && suffixes.data[0]) setSuffix(suffixes.data[0].id);
  }, [suffix, suffixes.data]);

  return (
    <ScrollView contentContainerStyle={styles.list}>
      <Text variant="secondary" color="muted">
        {fqdn ? `Adresse actuelle : ${fqdn}` : 'Aucun sous-domaine.'}
      </Text>
      <TextField label="Sous-domaine" value={name} onChangeText={setName} placeholder="nom" />
      <Text variant="label" color="subtle">
        Suffixe
      </Text>
      <View style={styles.toolbar}>
        {(suffixes.data ?? []).map((s) => (
          <Button
            key={s.id}
            label={s.label}
            size="md"
            variant={suffix === s.id ? 'primary' : 'secondary'}
            onPress={() => setSuffix(s.id)}
          />
        ))}
      </View>
      <Button
        label="Enregistrer"
        variant="primary"
        loading={mut.save.isPending}
        disabled={!name.trim() || !suffix}
        onPress={() => mut.save.mutate({ subdomain: name.trim().toLowerCase(), suffix_id: suffix, exists: Boolean(fqdn) })}
      />
      {fqdn ? (
        <Button label="Retirer le sous-domaine" variant="ghost" destructive onPress={() => mut.remove.mutate()} />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  toolbar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 16 },
  list: { padding: 16, gap: 12 },
  file: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16 },
  console: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 10, marginHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
