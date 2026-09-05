import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, Text, View } from 'react-native';
import { ApiError, type InviteDto } from '@jrst/api-client';
import { api } from '../api';
import { formatWhen, handleOf } from '../format';
import { styles } from '../theme';
import { ScreenHeader } from '../ui';

export function InvitesScreen({
  onBack,
  onOpenTable,
}: {
  onBack: () => void;
  onOpenTable: (id: string) => void;
}) {
  const [invites, setInvites] = useState<InviteDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setInvites(await api.myInvites());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load invites');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(fn: () => Promise<unknown>) {
    try {
      await fn();
      await load();
    } catch (err) {
      Alert.alert('Error', err instanceof ApiError ? err.message : 'Something went wrong');
    }
  }

  const pending = invites.filter((i) => i.status === 'PENDING' || i.status === 'MAYBE');

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Invites" onBack={onBack} />
      {loading ? (
        <ActivityIndicator style={styles.spinner} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <FlatList
          data={pending.length ? pending : invites}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.listInPad}
          ListEmptyComponent={<Text style={styles.subtitle}>No invites right now.</Text>}
          renderItem={({ item: inv }) => (
            <View style={styles.card}>
              <Pressable onPress={() => onOpenTable(inv.table.id)}>
                <Text style={styles.cardTitle}>{inv.table.title ?? inv.table.category}</Text>
              </Pressable>
              <Text style={styles.meta}>{formatWhen(inv.table.startAt)}</Text>
              <Text style={styles.meta}>
                {inv.table.venueName ?? 'Venue'} · from {handleOf(inv.inviter)}
              </Text>
              <Text style={styles.receiptRef}>{inv.status}</Text>
              {inv.status === 'PENDING' || inv.status === 'MAYBE' ? (
                <View style={[styles.rowGap, { marginTop: 8 }]}>
                  <Pressable onPress={() => void run(() => api.acceptInvite(inv.id))}>
                    <Text style={styles.link}>Accept</Text>
                  </Pressable>
                  <Pressable onPress={() => void run(() => api.maybeInvite(inv.id))}>
                    <Text style={styles.link}>Maybe</Text>
                  </Pressable>
                  <Pressable onPress={() => void run(() => api.declineInvite(inv.id))}>
                    <Text style={styles.link}>Decline</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          )}
        />
      )}
    </View>
  );
}
