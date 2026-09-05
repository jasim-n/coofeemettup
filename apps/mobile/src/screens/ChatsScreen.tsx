import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { ApiError, type DmThread, type GroupThread } from '@jrst/api-client';
import { api } from '../api';
import { ago, handleOf } from '../format';
import { styles } from '../theme';

type Convo =
  | { kind: 'dm'; key: string; userId: string; title: string; last: string; time: string; unread: number }
  | {
      kind: 'group';
      key: string;
      tableId: string;
      title: string;
      last: string;
      time: string;
      unread: number;
    };

export function ChatsScreen({
  onOpenDm,
  onOpenGroup,
  onConnections,
  onInvites,
  onUnreadChange,
}: {
  onOpenDm: (userId: string, title: string) => void;
  onOpenGroup: (tableId: string) => void;
  onConnections: () => void;
  onInvites: () => void;
  onUnreadChange?: (n: number) => void;
}) {
  const [convos, setConvos] = useState<Convo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [dms, groups] = await Promise.all([api.dmThreads(), api.groupThreads()]);
      const mapped: Convo[] = [
        ...dms.map(
          (d: DmThread): Convo => ({
            kind: 'dm',
            key: `dm:${d.user.id}`,
            userId: d.user.id,
            title: handleOf(d.user),
            last: d.lastMessage,
            time: d.lastAt,
            unread: d.unread,
          }),
        ),
        ...groups.map(
          (g: GroupThread): Convo => ({
            kind: 'group',
            key: `g:${g.table.id}`,
            tableId: g.table.id,
            title: g.table.title ?? g.table.category,
            last: g.lastMessage ?? 'Table chat',
            time: g.lastAt,
            unread: g.unread,
          }),
        ),
      ].sort((a, b) => b.time.localeCompare(a.time));
      setConvos(mapped);
      onUnreadChange?.(mapped.reduce((sum, c) => sum + c.unread, 0));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load chats');
    } finally {
      setLoading(false);
    }
  }, [onUnreadChange]);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load().catch(() => undefined), 12_000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <View style={styles.flexBare}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Chats</Text>
        <View style={styles.rowGap}>
          <Pressable onPress={onInvites} hitSlop={8}>
            <Text style={styles.link}>Invites</Text>
          </Pressable>
          <Pressable onPress={onConnections} hitSlop={8}>
            <Text style={styles.link}>People</Text>
          </Pressable>
        </View>
      </View>
      {loading ? (
        <ActivityIndicator style={styles.spinner} />
      ) : error ? (
        <Text style={[styles.error, { paddingHorizontal: 20 }]}>{error}</Text>
      ) : (
        <FlatList
          data={convos}
          keyExtractor={(c) => c.key}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.subtitle}>No conversations yet. Connect with people to message.</Text>
          }
          renderItem={({ item: c }) => (
            <Pressable
              style={[styles.card, c.unread ? styles.cardUnread : null]}
              onPress={() => {
                if (c.kind === 'dm') onOpenDm(c.userId, c.title);
                else onOpenGroup(c.tableId);
              }}
            >
              <View style={styles.groupMember}>
                <Text style={styles.cardTitle}>
                  {c.kind === 'group' ? `Table · ${c.title}` : c.title}
                </Text>
                <Text style={styles.receiptRef}>{ago(c.time)}</Text>
              </View>
              <Text style={styles.meta} numberOfLines={1}>
                {c.last}
              </Text>
              {c.unread > 0 ? (
                <Text style={[styles.badge, { color: '#E1583B' }]}>{c.unread} new</Text>
              ) : null}
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
