import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold, Poppins_800ExtraBold } from '@expo-google-fonts/poppins';
import * as SecureStore from 'expo-secure-store';
import MapView, { Marker } from 'react-native-maps';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ApiError,
  type ChatMessage,
  type CreateTableInput,
  type NotificationDto,
  type PublicUser,
  type TableDto,
  type TableJoinRequestDto,
  type UpdateProfileInput,
} from '@jrst/api-client';
import { api, TOKEN_KEY } from './src/api';
import { BottomNav, type TabId } from './src/BottomNav';
import { EmptyState } from './src/EmptyState';
import { formatPKR, formatWhen, handleOf } from './src/format';
import { DiscoverScreen } from './src/screens/DiscoverScreen';
import { NearbyScreen } from './src/screens/NearbyScreen';
import { ChatsScreen } from './src/screens/ChatsScreen';
import { DmScreen } from './src/screens/DmScreen';
import { ConnectionsScreen } from './src/screens/ConnectionsScreen';
import { InvitesScreen } from './src/screens/InvitesScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { MobileTopBar } from './src/components/MobileTopBar';
import { PRIMARY, styles } from './src/theme';
import {
  Field,
  NumberRow,
  OptionRow,
  PrimaryButton,
  SecondaryButton,
  ScreenHeader,
  Toggle,
} from './src/ui';

type Overlay =
  | { name: 'profile' }
  | { name: 'notifications' }
  | { name: 'table'; id: string }
  | { name: 'tableChat'; id: string }
  | { name: 'createTable' }
  | { name: 'dm'; userId: string; title: string }
  | { name: 'connections' }
  | { name: 'invites' };

export default function App() {
  return (
    <SafeAreaProvider>
      <AppInner />
    </SafeAreaProvider>
  );
}

function AppInner() {
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState<PublicUser | null>(null);
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
  });

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        if (token) {
          api.setAuthToken(token);
          const res = await api.me();
          if (active) setUser(res.user);
        }
      } catch {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        api.setAuthToken(null);
      } finally {
        if (active) setBooting(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const onAuthed = useCallback(async (u: PublicUser) => {
    const token = api.getAuthToken();
    if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
    setUser(u);
  }, []);

  const onLogout = useCallback(async () => {
    await api.logout();
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    api.setAuthToken(null);
    setUser(null);
  }, []);

  if (booting || !fontsLoaded) {
    return (
      <SafeAreaView style={styles.center} edges={['top', 'bottom']}>
        <ActivityIndicator color={PRIMARY} />
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <>
        <StatusBar style="light" />
        <LoginScreen onAuthed={onAuthed} />
      </>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <AuthedApp user={user} setUser={setUser} onLogout={onLogout} />
    </SafeAreaView>
  );
}

function AuthedApp({
  user,
  setUser,
  onLogout,
}: {
  user: PublicUser;
  setUser: (u: PublicUser) => void;
  onLogout: () => void;
}) {
  const [tab, setTab] = useState<TabId>('home');
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const [chatUnread, setChatUnread] = useState(0);
  const insets = useSafeAreaInsets();

  const close = () => setOverlay(null);
  const openTable = (id: string) => setOverlay({ name: 'table', id });

  const overlayPad = { flex: 1 as const, paddingBottom: Math.max(insets.bottom, 8) };

  if (overlay?.name === 'profile') {
    return (
      <View style={overlayPad}>
        <ProfileScreen
          user={user}
          onSaved={(u) => {
            setUser(u);
          }}
          onBack={close}
        />
      </View>
    );
  }
  if (overlay?.name === 'notifications') {
    return (
      <View style={overlayPad}>
        <NotificationsScreen onBack={close} />
      </View>
    );
  }
  if (overlay?.name === 'table') {
    return (
      <View style={overlayPad}>
        <TableDetailScreen
          id={overlay.id}
          user={user}
          onBack={close}
          onChat={(id) => setOverlay({ name: 'tableChat', id })}
        />
      </View>
    );
  }
  if (overlay?.name === 'tableChat') {
    return (
      <View style={overlayPad}>
        <TableChatScreen
          id={overlay.id}
          userId={user.id}
          onBack={() => setOverlay({ name: 'table', id: overlay.id })}
        />
      </View>
    );
  }
  if (overlay?.name === 'createTable') {
    return (
      <View style={overlayPad}>
        <CreateTableScreen
          onDone={(id) => setOverlay({ name: 'table', id })}
          onBack={close}
        />
      </View>
    );
  }
  if (overlay?.name === 'dm') {
    return (
      <View style={overlayPad}>
        <DmScreen
          userId={overlay.userId}
          title={overlay.title}
          myId={user.id}
          onBack={close}
        />
      </View>
    );
  }
  if (overlay?.name === 'connections') {
    return (
      <View style={overlayPad}>
        <ConnectionsScreen
          onBack={close}
          onMessage={(userId, title) => setOverlay({ name: 'dm', userId, title })}
        />
      </View>
    );
  }
  if (overlay?.name === 'invites') {
    return (
      <View style={overlayPad}>
        <InvitesScreen onBack={close} onOpenTable={openTable} />
      </View>
    );
  }

  return (
    <View style={styles.flexBare}>
      <MobileTopBar
        user={user}
        onLogout={onLogout}
        onNotifications={() => setOverlay({ name: 'notifications' })}
        onProfile={() => setOverlay({ name: 'profile' })}
        onInvites={() => setOverlay({ name: 'invites' })}
        onSearch={() => setTab('discover')}
        onHost={user.canHost ? () => setOverlay({ name: 'createTable' }) : undefined}
      />
      <View style={{ flex: 1 }}>
        {tab === 'home' ? (
          <HomeScreen
            user={user}
            onOpenTable={openTable}
            onNearby={() => setTab('nearby')}
            onDiscover={() => setTab('discover')}
            onProfile={() => setOverlay({ name: 'profile' })}
            onNotifications={() => setOverlay({ name: 'notifications' })}
            onInvite={() => setOverlay({ name: 'invites' })}
          />
        ) : null}
        {tab === 'discover' ? <DiscoverScreen onOpenTable={openTable} /> : null}
        {tab === 'nearby' ? <NearbyScreen onOpenTable={openTable} /> : null}
        {tab === 'meetups' ? <MeetupsScreen onOpenTable={openTable} /> : null}
        {tab === 'chats' ? (
          <ChatsScreen
            onOpenDm={(userId, title) => setOverlay({ name: 'dm', userId, title })}
            onOpenGroup={(tableId) => setOverlay({ name: 'tableChat', id: tableId })}
            onConnections={() => setOverlay({ name: 'connections' })}
            onInvites={() => setOverlay({ name: 'invites' })}
            onUnreadChange={setChatUnread}
          />
        ) : null}
      </View>
      <BottomNav tab={tab} onChange={setTab} chatUnread={chatUnread} />
    </View>
  );
}





function ProfileScreen({
  user,
  onSaved,
  onBack,
}: {
  user: PublicUser;
  onSaved: (u: PublicUser) => void;
  onBack: () => void;
}) {
  const [firstName, setFirstName] = useState(user.firstName ?? '');
  const [lastName, setLastName] = useState(user.lastName ?? '');
  const [city, setCity] = useState<string>(user.city ?? '');
  const [interests, setInterests] = useState(user.interests.join(', '));
  const [beverage, setBeverage] = useState<string>(user.beveragePref ?? '');
  const [agreeCodeOfConduct, setAgreeCodeOfConduct] = useState(!!user.codeOfConductAt);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setStatus(null);
    const payload: UpdateProfileInput = {
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      city: city || undefined,
      interests: interests
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      beveragePref: (beverage || undefined) as UpdateProfileInput['beveragePref'],
      agreeCodeOfConduct,
    };
    try {
      const updated = await api.updateProfile(payload);
      onSaved(updated);
      setStatus('Saved!');
    } catch (err) {
      setStatus(err instanceof ApiError ? err.message : 'Could not save');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <ScreenHeader title="Your profile" onBack={onBack} />
      {user.username ? (
        <View style={styles.fieldGap}>
          <Text style={styles.fieldLabel}>Username</Text>
          <Text style={styles.subtitle}>@{user.username}</Text>
        </View>
      ) : null}
      <Field label="First name" value={firstName} onChangeText={setFirstName} />
      <Field label="Last name" value={lastName} onChangeText={setLastName} />
      <OptionRow
        label="City"
        value={city}
        onChange={setCity}
        options={[
          { value: 'Islamabad', label: 'Islamabad' },
          { value: 'Lahore', label: 'Lahore' },
          { value: 'Karachi', label: 'Karachi' },
          { value: 'Rawalpindi', label: 'Rawalpindi' },
        ]}
      />
      <Field
        label="Interests (comma-separated)"
        value={interests}
        onChangeText={setInterests}
        placeholder="Books, Startups, Film"
      />
      <OptionRow
        label="Coffee or chai?"
        value={beverage}
        onChange={setBeverage}
        options={[
          { value: 'COFFEE', label: 'Coffee' },
          { value: 'CHAI', label: 'Chai' },
          { value: 'EITHER', label: 'Either' },
        ]}
      />
      <Toggle
        label="I agree to the code of conduct"
        value={agreeCodeOfConduct}
        onChange={setAgreeCodeOfConduct}
      />
      {status ? <Text style={styles.subtitle}>{status}</Text> : null}
      <PrimaryButton label={busy ? 'Saving…' : 'Save profile'} onPress={() => void save()} disabled={busy} />
    </ScrollView>
  );
}

function MeetupsScreen({ onOpenTable }: { onOpenTable: (id: string) => void }) {
  const [tables, setTables] = useState<TableDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [joined, hosted] = await Promise.all([api.myJoinedTables(), api.myHostedTables()]);
      const byId = new Map<string, TableDto>();
      for (const t of [...joined, ...hosted]) byId.set(t.id, t);
      setTables([...byId.values()].sort((a, b) => a.startAt.localeCompare(b.startAt)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load meetups');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <View style={styles.flexBare}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>My meetups</Text>
      </View>
      {loading ? (
        <ActivityIndicator style={styles.spinner} />
      ) : error ? (
        <Text style={[styles.error, { paddingHorizontal: 20 }]}>{error}</Text>
      ) : (
        <FlatList
          data={tables}
          keyExtractor={(t) => t.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              icon="calendar-outline"
              title="No meetups yet"
              body="Request a seat at a table and it’ll show up here."
            />
          }
          renderItem={({ item: t }) => (
            <Pressable style={styles.card} onPress={() => onOpenTable(t.id)}>
              <Text style={styles.cardTitle}>{t.title ?? t.category}</Text>
              <Text style={styles.meta}>
                {formatWhen(t.startAt)} · {t.venueName ?? t.cafe?.name ?? 'See map'}
              </Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

function NotificationsScreen({ onBack }: { onBack: () => void }) {
  const [items, setItems] = useState<NotificationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const res = await api.notifications();
        if (active) setItems(res.items);
        await api.markAllNotificationsRead();
      } catch (err) {
        if (active) setError(err instanceof ApiError ? err.message : 'Failed to load');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Notifications" onBack={onBack} />
      {loading ? (
        <ActivityIndicator style={styles.spinner} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(n) => n.id}
          contentContainerStyle={styles.listInPad}
          ListEmptyComponent={
            <EmptyState icon="notifications-outline" title="You’re all caught up" body="New alerts will land here." />
          }
          renderItem={({ item: n }) => (
            <View style={[styles.card, n.readAt ? null : styles.cardUnread]}>
              <Text style={styles.cardTitle}>{n.title}</Text>
              {n.body ? <Text style={styles.meta}>{n.body}</Text> : null}
              <Text style={styles.receiptRef}>
                {new Date(n.createdAt).toLocaleString('en-PK', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

function TableDetailScreen({
  id,
  user,
  onBack,
  onChat,
}: {
  id: string;
  user: PublicUser;
  onBack: () => void;
  onChat: (id: string) => void;
}) {
  const [table, setTable] = useState<TableDto | null>(null);
  const [requests, setRequests] = useState<TableJoinRequestDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const t = await api.getTable(id);
    setTable(t);
    if (t.hostId === user.id) setRequests(await api.tableRequests(id));
  }, [id, user.id]);

  useEffect(() => {
    void load().catch((err) =>
      setError(err instanceof ApiError ? err.message : 'Failed to load'),
    );
  }, [load]);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await load();
    } catch (err) {
      Alert.alert('Error', err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  if (!table) {
    return (
      <View style={styles.flex}>
        <ScreenHeader title="Table" onBack={onBack} />
        {error ? <Text style={styles.error}>{error}</Text> : <ActivityIndicator style={styles.spinner} />}
      </View>
    );
  }

  const isHost = table.hostId === user.id;
  const status = table.myRequestStatus;
  const full = table.seatsLeft <= 0 || table.status !== 'OPEN';

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <ScreenHeader title={table.title ?? table.category} onBack={onBack} />
      <View style={styles.card}>
        <Text style={styles.meta}>{formatWhen(table.startAt)}</Text>
        <Text style={styles.meta}>{table.venueName ?? table.cafe?.name ?? 'See map'}</Text>
        <Text style={styles.meta}>
          {table.pricePKR == null ? 'Free' : formatPKR(table.pricePKR)} · {table.seatsLeft} of{' '}
          {table.seats} seats left
        </Text>
        <Text style={styles.meta}>Hosted by {handleOf(table.host)}</Text>
        {table.description ? (
          <Text style={[styles.subtitle, { marginTop: 8 }]}>{table.description}</Text>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!isHost && (
        <View style={{ gap: 8 }}>
          {status === 'APPROVED' ? (
            <>
              <PrimaryButton label="Open group chat" onPress={() => onChat(id)} />
              <SecondaryButton label="Leave table" onPress={() => void run(() => api.leaveTable(id))} />
            </>
          ) : status === 'PENDING' ? (
            <>
              <Text style={styles.subtitle}>Request sent — waiting for the host to approve.</Text>
              <SecondaryButton label="Cancel request" onPress={() => void run(() => api.leaveTable(id))} />
            </>
          ) : full ? (
            <Text style={styles.subtitle}>This table is full.</Text>
          ) : (
            <PrimaryButton
              label={busy ? 'Sending…' : 'Request to join'}
              onPress={() => {
                if (!user.codeOfConductAt) {
                  Alert.alert(
                    'Code of conduct',
                    'Please accept the code of conduct in Profile before requesting to join.',
                  );
                  return;
                }
                void run(() => api.requestJoinTable(id));
              }}
              disabled={busy}
            />
          )}
        </View>
      )}

      {isHost && (
        <View style={{ gap: 8 }}>
          <PrimaryButton label="Open group chat" onPress={() => onChat(id)} />
          <Text style={styles.fieldLabel}>Join requests</Text>
          {requests.length === 0 ? (
            <Text style={styles.subtitle}>No pending requests.</Text>
          ) : (
            requests.map((r) => (
              <View key={r.id} style={styles.groupMember}>
                <Text style={styles.meta}>{handleOf(r.user)}</Text>
                <View style={styles.rowGap}>
                  <Pressable onPress={() => void run(() => api.approveTableRequest(id, r.id))}>
                    <Text style={styles.link}>Approve</Text>
                  </Pressable>
                  <Pressable onPress={() => void run(() => api.declineTableRequest(id, r.id))}>
                    <Text style={styles.link}>Decline</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </View>
      )}
    </ScrollView>
  );
}

function TableChatScreen({
  id,
  userId,
  onBack,
}: {
  id: string;
  userId: string;
  onBack: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [member, setMember] = useState<boolean | null>(null);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    const r = await api.tableChat(id);
    setMember(r.member);
    setMessages(r.messages);
  }, [id]);

  useEffect(() => {
    void load().catch(() => undefined);
    const t = setInterval(() => void load().catch(() => undefined), 6000);
    return () => clearInterval(t);
  }, [load]);

  async function send() {
    const text = body.trim();
    if (!text) return;
    setSending(true);
    try {
      await api.sendTableMessage(id, text);
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
      <ScreenHeader title="Group chat" onBack={onBack} />
      {member === false ? (
        <Text style={styles.subtitle}>Only the host and approved guests can chat here.</Text>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.listInPad}
          ListEmptyComponent={<Text style={styles.subtitle}>No messages yet — say hi.</Text>}
          renderItem={({ item: m }) => {
            const mine = m.userId === userId;
            return (
              <View style={[styles.bubbleRow, { justifyContent: mine ? 'flex-end' : 'flex-start' }]}>
                <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
                  {!mine ? <Text style={styles.bubbleName}>{handleOf(m)}</Text> : null}
                  <Text style={mine ? styles.bubbleTextMine : styles.bubbleText}>{m.body}</Text>
                </View>
              </View>
            );
          }}
        />
      )}
      {member ? (
        <View style={styles.rowGap}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={body}
            onChangeText={setBody}
            placeholder="Message the table…"
          />
          <Pressable style={styles.button} onPress={() => void send()} disabled={sending}>
            <Text style={styles.buttonText}>Send</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function CreateTableScreen({
  onDone,
  onBack,
}: {
  onDone: (id: string) => void;
  onBack: () => void;
}) {
  const [venueName, setVenueName] = useState('');
  const [seats, setSeats] = useState(6);
  const [category, setCategory] = useState('Deep talks');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [coord, setCoord] = useState<{ latitude: number; longitude: number } | null>(null);
  const [busy, setBusy] = useState(false);

  async function publish() {
    if (!coord) {
      Alert.alert('Pick a spot', 'Tap the map to set the venue location.');
      return;
    }
    const when = new Date(dateStr.replace(' ', 'T'));
    if (Number.isNaN(when.getTime())) {
      Alert.alert('Invalid date', 'Use the format 2026-08-15 18:00');
      return;
    }
    setBusy(true);
    try {
      const input: CreateTableInput = {
        venueName: venueName.trim() || undefined,
        lat: coord.latitude,
        lng: coord.longitude,
        startAt: when.toISOString(),
        seats,
        category,
        description: description.trim() || undefined,
        pricePKR: price.trim() ? Number(price) : undefined,
      };
      const t = await api.createTable(input);
      onDone(t.id);
    } catch (err) {
      Alert.alert('Could not publish', err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <ScreenHeader title="Host a table" onBack={onBack} />
      <Field label="Venue name" value={venueName} onChangeText={setVenueName} placeholder="e.g. Kohsar Coffee" />
      <Text style={styles.fieldLabel}>Tap the map to drop a pin</Text>
      <View style={styles.pickerMap}>
        <MapView
          style={{ flex: 1 }}
          initialRegion={{
            latitude: 33.6844,
            longitude: 73.0479,
            latitudeDelta: 0.15,
            longitudeDelta: 0.15,
          }}
          onPress={(e) => setCoord(e.nativeEvent.coordinate)}
        >
          {coord ? <Marker coordinate={coord} pinColor={PRIMARY} /> : null}
        </MapView>
      </View>
      <Field
        label="Date & time (YYYY-MM-DD HH:mm)"
        value={dateStr}
        onChangeText={setDateStr}
        placeholder="2026-08-15 18:00"
      />
      <NumberRow label="Seats" value={seats} min={2} max={12} onChange={setSeats} />
      <OptionRow
        label="Category"
        value={category}
        options={['Deep talks', 'Coffee & chill', 'Networking', 'Books', 'Startups'].map((c) => ({
          value: c,
          label: c,
        }))}
        onChange={setCategory}
      />
      <Field
        label="Description"
        value={description}
        onChangeText={setDescription}
        multiline
        placeholder="What's this table about?"
      />
      <Field
        label="Price per seat (blank = free)"
        value={price}
        onChangeText={setPrice}
        keyboardType="numeric"
        placeholder="Free"
      />
      <PrimaryButton label={busy ? 'Publishing…' : 'Publish table'} onPress={() => void publish()} disabled={busy} />
    </ScrollView>
  );
}
