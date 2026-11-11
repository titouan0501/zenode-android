import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import {
  useAssociationActions,
  useAssociationCalendar,
  useAssociationDocs,
  useAssociationHome,
  useAssociationNews,
  useAssociationVotes,
} from '@/api/panel';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { TabStrip } from '@/components/Controls';
import { ErrorBanner } from '@/components/ErrorBanner';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { TopBar } from '@/components/TopBar';
import { formatDate } from '@/lib/format';
import { openWeb } from '@/lib/links';
import { useTheme } from '@/theme/ThemeProvider';

type Tab = 'home' | 'calendar' | 'news' | 'docs' | 'votes';

export default function Adherent() {
  const theme = useTheme();
  const [tab, setTab] = useState<Tab>('home');
  const home = useAssociationHome();
  const calendar = useAssociationCalendar();
  const news = useAssociationNews();
  const docs = useAssociationDocs();
  const votes = useAssociationVotes();
  const actions = useAssociationActions();

  return (
    <Screen header={<TopBar back title="Adhérent" />} scroll bottomInset>
      <TabStrip
        value={tab}
        onChange={setTab}
        options={[
          { key: 'home', label: 'Accueil' },
          { key: 'calendar', label: 'Calendrier' },
          { key: 'news', label: 'Annonces' },
          { key: 'docs', label: 'Documents' },
          { key: 'votes', label: 'Votes' },
        ]}
      />
      <View style={styles.gap}>
        {tab === 'home' ? (
          home.isLoading ? <ActivityIndicator color={theme.accent} /> : home.isError ? (
            <ErrorBanner error={home.error} onRetry={() => home.refetch()} />
          ) : (
            <>
              <Text variant="section">{home.data?.membership?.display_name || 'Espace adhérent'}</Text>
              <Text variant="secondary" color="muted">
                {[home.data?.membership?.role_label, home.data?.membership?.status].filter(Boolean).join(' · ')}
              </Text>
              {(home.data?.upcoming_events ?? []).length === 0 ? (
                <Text variant="secondary" color="muted">Aucun événement à venir.</Text>
              ) : (
                (home.data?.upcoming_events ?? []).map((event: any) => (
                  <Card key={event.event_id}>
                    <Text variant="body" weight="medium">{event.title}</Text>
                    <Text variant="meta" color="subtle">{formatDate(event.starts_at)}</Text>
                  </Card>
                ))
              )}
              {(home.data?.bureau ?? []).map((member: any) => (
                <Text key={member.zenode_id} variant="meta" color="subtle">
                  {member.display_name} · {member.role_label}
                </Text>
              ))}
            </>
          )
        ) : null}

        {tab === 'calendar' ? (
          calendar.isLoading ? <ActivityIndicator color={theme.accent} /> : calendar.isError ? (
            <ErrorBanner error={calendar.error} onRetry={() => calendar.refetch()} />
          ) : (calendar.data?.events ?? []).length === 0 ? (
            <Text variant="secondary" color="muted">Aucun événement.</Text>
          ) : (
            (calendar.data?.events ?? []).map((event: any) => (
              <Card key={event.event_id} style={styles.gap}>
                <Text variant="body" weight="medium">{event.title}</Text>
                <Text variant="meta" color="subtle">
                  {[formatDate(event.starts_at), event.location].filter(Boolean).join(' · ')}
                </Text>
                {event.body ? <Text variant="secondary" color="muted">{event.body}</Text> : null}
                <View style={styles.row}>
                  {(['yes', 'no', 'proxy'] as const).map((response) => (
                    <Button
                      key={response}
                      label={response === 'yes' ? 'Présent' : response === 'no' ? 'Absent' : 'Procuration'}
                      size="md"
                      variant={event.my_rsvp?.response === response ? 'primary' : 'secondary'}
                      onPress={() => actions.rsvp.mutate({ eventId: event.event_id, response })}
                    />
                  ))}
                </View>
              </Card>
            ))
          )
        ) : null}

        {tab === 'news' ? (
          news.isLoading ? <ActivityIndicator color={theme.accent} /> : news.isError ? (
            <ErrorBanner error={news.error} onRetry={() => news.refetch()} />
          ) : (news.data?.announcements ?? []).length === 0 ? (
            <Text variant="secondary" color="muted">Aucune annonce.</Text>
          ) : (
            (news.data?.announcements ?? []).map((item: any) => (
              <Card key={item.announcement_id || item.id} style={styles.card}>
                <Text variant="body" weight="medium">{item.title}</Text>
                {item.body ? <Text variant="secondary" color="muted">{item.body}</Text> : null}
              </Card>
            ))
          )
        ) : null}

        {tab === 'docs' ? (
          docs.isLoading ? <ActivityIndicator color={theme.accent} /> : docs.isError ? (
            <ErrorBanner error={docs.error} onRetry={() => docs.refetch()} />
          ) : (docs.data?.documents ?? []).length === 0 ? (
            <Text variant="secondary" color="muted">Aucun document.</Text>
          ) : (
            (docs.data?.documents ?? []).map((doc: any) => (
              <Card key={doc.document_id} style={styles.card}>
                <Text variant="body" weight="medium">{doc.title}</Text>
                {doc.description ? <Text variant="secondary" color="muted">{doc.description}</Text> : null}
                <Button
                  label="Ouvrir"
                  size="md"
                  variant="secondary"
                  onPress={() =>
                    openWeb(
                      doc.file_url ||
                        `https://zenode.fr/api/association/documents/${encodeURIComponent(doc.document_id)}/download`,
                    )
                  }
                />
              </Card>
            ))
          )
        ) : null}

        {tab === 'votes' ? (
          votes.isLoading ? <ActivityIndicator color={theme.accent} /> : votes.isError ? (
            <ErrorBanner error={votes.error} onRetry={() => votes.refetch()} />
          ) : (votes.data?.votes ?? []).length === 0 ? (
            <Text variant="secondary" color="muted">Aucun vote.</Text>
          ) : (
            (votes.data?.votes ?? []).map((vote: any) => (
              <Card key={vote.vote_id} style={styles.gap}>
                <Text variant="body" weight="medium">{vote.title}</Text>
                {vote.body ? <Text variant="secondary" color="muted">{vote.body}</Text> : null}
                <Text variant="meta" color="subtle">
                  {vote.closed ? 'Clos' : 'Ouvert'}
                  {vote.ballot_count != null ? ` · ${vote.ballot_count} bulletins` : ''}
                </Text>
                {(vote.options ?? []).map((option: any) => (
                  <Button
                    key={option.option_id}
                    label={`${option.label}${option.percent != null ? ` · ${option.percent} %` : ''}`}
                    variant={vote.my_option_id === option.option_id ? 'primary' : 'secondary'}
                    disabled={vote.closed}
                    onPress={() =>
                      Alert.alert('Confirmer le vote ?', option.label, [
                        { text: 'Annuler', style: 'cancel' },
                        {
                          text: 'Voter',
                          onPress: () => actions.vote.mutate({ voteId: vote.vote_id, optionId: option.option_id }),
                        },
                      ])
                    }
                  />
                ))}
              </Card>
            ))
          )
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { gap: 12, paddingTop: 8 },
  card: { gap: 6 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
