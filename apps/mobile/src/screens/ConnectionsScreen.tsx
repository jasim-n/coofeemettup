import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  ApiError,
  type ConnectionRequestDto,
  type PublicUser,
  type SuggestedPerson,
} from '@jrst/api-client';
import { api } from '../api';
import { handleOf } from '../format';
import { styles } from '../theme';
import { ScreenHeader } from '../ui';

export function ConnectionsScreen({
  onBack,
  onMessage,
}: {
  onBack: () => void;
  onMessage: (userId: string, title: string) => void;
}) {
  const [connections, setConnections] = useState<PublicUser[]>([]);
  const [requests, setRequests] = useState<ConnectionRequestDto[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestedPerson[]>([]);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [mine, reqs, sugg] = await Promise.all([
        api.myConnections(),
        api.connectionRequests(),
        api.connectionSuggestions(),
      ]);
      setConnections(mine);
      setRequests(reqs);
      setSuggestions(sugg);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load');
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

  async function search(text: string) {
    setQ(text);
    if (text.trim().length < 2) {
      setResults([]);
      return;
    }
    try {
      setResults(await api.searchUsers(text.trim()));
    } catch {
      setResults([]);
    }
  }

  return (
    <View style={styles.flex}>
      <ScreenHeader title="People" onBack={onBack} />
      <TextInput
        style={styles.input}
        value={q}
        onChangeText={(t) => void search(t)}
        placeholder="Search @username"
        autoCapitalize="none"
      />
      {loading ? (
        <ActivityIndicator style={styles.spinner} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <FlatList
          data={[{ key: 'body' }]}
          keyExtractor={(i) => i.key}
          contentContainerStyle={styles.listInPad}
          renderItem={() => (
            <View style={{ gap: 16 }}>
              {results.length > 0 ? (
                <View style={{ gap: 8 }}>
                  <Text style={styles.fieldLabel}>Search</Text>
                  {results.map((u) => (
                    <View key={u.id} style={styles.groupMember}>
                      <Text style={styles.meta}>{handleOf(u)}</Text>
                      <Pressable onPress={() => void run(() => api.requestConnection(u.id))}>
                        <Text style={styles.link}>Connect</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : null}

              {requests.length > 0 ? (
                <View style={{ gap: 8 }}>
                  <Text style={styles.fieldLabel}>Requests</Text>
                  {requests.map((r) => (
                    <View key={r.id} style={styles.card}>
                      <Text style={styles.cardTitle}>{handleOf(r.user)}</Text>
                      <View style={styles.rowGap}>
                        <Pressable onPress={() => void run(() => api.acceptConnection(r.user.id))}>
                          <Text style={styles.link}>Accept</Text>
                        </Pressable>
                        <Pressable onPress={() => void run(() => api.declineConnection(r.user.id))}>
                          <Text style={styles.link}>Decline</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}

              <View style={{ gap: 8 }}>
                <Text style={styles.fieldLabel}>Your connections</Text>
                {connections.length === 0 ? (
                  <Text style={styles.subtitle}>No connections yet.</Text>
                ) : (
                  connections.map((u) => (
                    <View key={u.id} style={styles.groupMember}>
                      <Text style={styles.meta}>{handleOf(u)}</Text>
                      <Pressable onPress={() => onMessage(u.id, handleOf(u))}>
                        <Text style={styles.link}>Message</Text>
                      </Pressable>
                    </View>
                  ))
                )}
              </View>

              {suggestions.length > 0 ? (
                <View style={{ gap: 8 }}>
                  <Text style={styles.fieldLabel}>Suggested</Text>
                  {suggestions.map((s) => (
                    <View key={s.user.id} style={styles.groupMember}>
                      <Text style={styles.meta}>
                        {handleOf(s.user)}
                        {s.mutuals > 0 ? ` · ${s.mutuals} mutual` : ''}
                      </Text>
                      <Pressable onPress={() => void run(() => api.requestConnection(s.user.id))}>
                        <Text style={styles.link}>Connect</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          )}
        />
      )}
    </View>
  );
}
