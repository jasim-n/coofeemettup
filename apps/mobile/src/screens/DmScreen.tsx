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
import { ApiError, type DmMessage } from '@jrst/api-client';
import { api } from '../api';
import { styles } from '../theme';
import { ScreenHeader } from '../ui';

export function DmScreen({
  userId,
  title,
  myId,
  onBack,
}: {
  userId: string;
  title: string;
  myId: string;
  onBack: () => void;
}) {
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    const msgs = await api.dmThread(userId);
    setMessages(msgs);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void load().catch(() => setLoading(false));
    const t = setInterval(() => void load().catch(() => undefined), 6000);
    return () => clearInterval(t);
  }, [load]);

  async function send() {
    const text = body.trim();
    if (!text) return;
    setSending(true);
    try {
      await api.sendDm(userId, text);
      setBody('');
      await load();
    } catch (err) {
      Alert.alert('Error', err instanceof ApiError ? err.message : 'Could not send');
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={styles.flex}>
      <ScreenHeader title={title} onBack={onBack} />
      {loading ? (
        <ActivityIndicator style={styles.spinner} />
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.listInPad}
          ListEmptyComponent={<Text style={styles.subtitle}>Say hello.</Text>}
          renderItem={({ item: m }) => {
            const mine = m.senderId === myId;
            return (
              <View style={[styles.bubbleRow, { justifyContent: mine ? 'flex-end' : 'flex-start' }]}>
                <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
                  <Text style={mine ? styles.bubbleTextMine : styles.bubbleText}>{m.body}</Text>
                </View>
              </View>
            );
          }}
        />
      )}
      <View style={styles.rowGap}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={body}
          onChangeText={setBody}
          placeholder="Message…"
        />
        <Pressable style={styles.button} onPress={() => void send()} disabled={sending}>
          <Text style={styles.buttonText}>Send</Text>
        </Pressable>
      </View>
    </View>
  );
}
