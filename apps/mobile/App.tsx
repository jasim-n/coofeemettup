import { type ComponentProps, useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SecureStore from 'expo-secure-store';
import MapView, { Marker } from 'react-native-maps';
import {
  ApiClient,
  ApiError,
  type BookingDto,
  type EventDto,
  type GroupMember,
  type NotificationDto,
  type PublicUser,
  type SubmitFeedbackInput,
  type UpdateProfileInput,
} from '@jrst/api-client';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';
const TOKEN_KEY = 'jrst_token';
const api = new ApiClient({ baseUrl: API_URL, clientType: 'mobile' });

function formatPKR(n: number): string {
  return `PKR ${n.toLocaleString('en-PK')}`;
}
function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('en-PK', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type Screen =
  | { name: 'events' }
  | { name: 'profile' }
  | { name: 'feedback'; event: EventDto }
  | { name: 'map' }
  | { name: 'meetups' }
  | { name: 'notifications' };

export default function App() {
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState<PublicUser | null>(null);

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
    setUser(null);
  }, []);

  if (booting) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      {user ? (
        <AuthedApp user={user} setUser={setUser} onLogout={onLogout} />
      ) : (
        <LoginScreen onAuthed={onAuthed} />
      )}
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
  const [screen, setScreen] = useState<Screen>({ name: 'events' });

  if (screen.name === 'profile') {
    return (
      <ProfileScreen
        user={user}
        onSaved={setUser}
        onBack={() => setScreen({ name: 'events' })}
      />
    );
  }
  if (screen.name === 'feedback') {
    return <FeedbackScreen event={screen.event} onBack={() => setScreen({ name: 'events' })} />;
  }
  if (screen.name === 'map') {
    return <MapScreen onBack={() => setScreen({ name: 'events' })} />;
  }
  if (screen.name === 'meetups') {
    return <MeetupsScreen onBack={() => setScreen({ name: 'events' })} />;
  }
  if (screen.name === 'notifications') {
    return <NotificationsScreen onBack={() => setScreen({ name: 'events' })} />;
  }
  return (
    <EventsScreen
      user={user}
      onLogout={onLogout}
      onProfile={() => setScreen({ name: 'profile' })}
      onFeedback={(event) => setScreen({ name: 'feedback', event })}
      onMap={() => setScreen({ name: 'map' })}
      onMeetups={() => setScreen({ name: 'meetups' })}
      onNotifications={() => setScreen({ name: 'notifications' })}
    />
  );
}

function LoginScreen({ onAuthed }: { onAuthed: (u: PublicUser) => void }) {
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestOtp() {
    setError(null);
    setBusy(true);
    try {
      await api.requestOtp(phone);
      setStep('code');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setError(null);
    setBusy(true);
    try {
      const res = await api.verifyOtp(phone, code);
      onAuthed(res.user);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.screen}>
      <Text style={[styles.title, { color: CORAL, textAlign: 'center', fontSize: 30 }]}>
        ☕ Coffee Meetups
      </Text>
      <Text style={styles.subtitle}>
        {step === 'phone' ? 'Enter your mobile number' : `Enter the code sent to ${phone}`}
      </Text>
      {step === 'phone' ? (
        <>
          <TextInput
            style={styles.input}
            placeholder="03XX XXXXXXX"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            autoFocus
          />
          <PrimaryButton label={busy ? 'Sending…' : 'Send code'} onPress={() => void requestOtp()} disabled={busy} />
        </>
      ) : (
        <>
          <TextInput
            style={styles.input}
            placeholder="000000"
            keyboardType="number-pad"
            maxLength={6}
            value={code}
            onChangeText={setCode}
            autoFocus
          />
          <PrimaryButton label={busy ? 'Verifying…' : 'Verify & sign in'} onPress={() => void verify()} disabled={busy} />
          <Pressable
            onPress={() => {
              setStep('phone');
              setCode('');
              setError(null);
            }}
            hitSlop={8}
            style={{ alignItems: 'center', marginTop: 8 }}
          >
            <Text style={styles.link}>Use a different number</Text>
          </Pressable>
        </>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function EventsScreen({
  user,
  onLogout,
  onProfile,
  onFeedback,
  onMap,
  onMeetups,
  onNotifications,
}: {
  user: PublicUser;
  onLogout: () => void;
  onProfile: () => void;
  onFeedback: (event: EventDto) => void;
  onMap: () => void;
  onMeetups: () => void;
  onNotifications: () => void;
}) {
  const [events, setEvents] = useState<EventDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setEvents(await api.browseEvents());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function joinAndPay(e: EventDto) {
    try {
      const booking = await api.joinEvent(e.id);
      const { checkoutUrl } = await api.initiatePayment(booking.id, `${API_URL}`);
      await Linking.openURL(checkoutUrl);
    } catch (err) {
      Alert.alert('Could not join', err instanceof ApiError ? err.message : 'Something went wrong');
    }
  }

  return (
    <View style={styles.flex}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Upcoming meetups</Text>
        <Pressable onPress={() => void onLogout()} hitSlop={8}>
          <Text style={styles.link}>Sign out</Text>
        </Pressable>
      </View>
      <View style={[styles.rowGap, styles.navRow]}>
        <Pressable onPress={onMeetups} hitSlop={8}>
          <Text style={styles.link}>My meetups</Text>
        </Pressable>
        <Pressable onPress={onNotifications} hitSlop={8}>
          <Text style={styles.link}>Notifications</Text>
        </Pressable>
        <Pressable onPress={onMap} hitSlop={8}>
          <Text style={styles.link}>Map</Text>
        </Pressable>
        <Pressable onPress={onProfile} hitSlop={8}>
          <Text style={styles.link}>Profile</Text>
        </Pressable>
      </View>
      <Text style={styles.subtitle}>Signed in as {user.phone}</Text>
      {loading ? (
        <ActivityIndicator style={styles.spinner} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(e) => e.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.subtitle}>No open meetups right now.</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.title ?? 'Coffee meetup'}</Text>
              <Text style={styles.meta}>{formatWhen(item.startAt)}</Text>
              <Text style={styles.meta}>
                {item.cafe?.name ?? item.area} · {formatPKR(item.pricePKR)} · {item.seatsLeft} left
              </Text>
              <View style={styles.rowGap}>
                <View style={styles.flexItem}>
                  <PrimaryButton
                    label={item.seatsLeft <= 0 ? 'Full' : 'Join & pay'}
                    onPress={() => void joinAndPay(item)}
                    disabled={item.seatsLeft <= 0}
                  />
                </View>
                <View style={styles.flexItem}>
                  <SecondaryButton label="Feedback" onPress={() => onFeedback(item)} />
                </View>
              </View>
            </View>
          )}
        />
      )}
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
  const [lastInitial, setLastInitial] = useState(user.lastInitial ?? '');
  const [city, setCity] = useState<string>(user.city ?? '');
  const [interests, setInterests] = useState(user.interests.join(', '));
  const [beverage, setBeverage] = useState<string>(user.beveragePref ?? '');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setStatus(null);
    const payload: UpdateProfileInput = {
      firstName: firstName || undefined,
      lastInitial: lastInitial || undefined,
      city: city || undefined,
      interests: interests
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      beveragePref: (beverage || undefined) as UpdateProfileInput['beveragePref'],
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
      <Field label="First name" value={firstName} onChangeText={setFirstName} />
      <Field label="Last initial" value={lastInitial} onChangeText={setLastInitial} maxLength={2} />
      <OptionRow
        label="City"
        value={city}
        onChange={setCity}
        options={[
          { value: 'Islamabad', label: 'Islamabad' },
          { value: 'Lahore', label: 'Lahore' },
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
      {status ? <Text style={styles.subtitle}>{status}</Text> : null}
      <PrimaryButton label={busy ? 'Saving…' : 'Save profile'} onPress={() => void save()} disabled={busy} />
    </ScrollView>
  );
}

function FeedbackScreen({ event, onBack }: { event: EventDto; onBack: () => void }) {
  const [form, setForm] = useState<SubmitFeedbackInput>({
    enjoyment: 5,
    meetAgain: 'ALL',
    mixFelt: 'JUST_RIGHT',
    sizeFelt: 'JUST_RIGHT',
    cafeRating: 5,
    comeAgain: 'YES',
    inviteFriend: true,
    nps: 9,
    feltUnsafe: false,
    improve: '',
  });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof SubmitFeedbackInput>(k: K, v: SubmitFeedbackInput[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await api.submitFeedback(event.id, form);
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not submit');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <View style={styles.screen}>
        <Text style={styles.title}>Thank you! 🙏</Text>
        <Text style={styles.subtitle}>Your feedback helps us make better matches.</Text>
        <PrimaryButton label="Back to meetups" onPress={onBack} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <ScreenHeader title="How was it?" onBack={onBack} />
      <Text style={styles.subtitle}>{event.title ?? 'Coffee meetup'}</Text>
      <NumberRow label="Enjoyment" value={form.enjoyment} min={1} max={5} onChange={(v) => set('enjoyment', v)} />
      <OptionRow
        label="Meet this group again?"
        value={form.meetAgain}
        onChange={(v) => set('meetAgain', v as SubmitFeedbackInput['meetAgain'])}
        options={[
          { value: 'ALL', label: 'All' },
          { value: 'SOME', label: 'Some' },
          { value: 'NO', label: 'No' },
        ]}
      />
      <OptionRow
        label="Group mix"
        value={form.mixFelt}
        onChange={(v) => set('mixFelt', v as SubmitFeedbackInput['mixFelt'])}
        options={[
          { value: 'TOO_SIMILAR', label: 'Too similar' },
          { value: 'JUST_RIGHT', label: 'Just right' },
          { value: 'TOO_DIFFERENT', label: 'Too different' },
        ]}
      />
      <OptionRow
        label="Group size"
        value={form.sizeFelt}
        onChange={(v) => set('sizeFelt', v as SubmitFeedbackInput['sizeFelt'])}
        options={[
          { value: 'TOO_SMALL', label: 'Too small' },
          { value: 'JUST_RIGHT', label: 'Just right' },
          { value: 'TOO_BIG', label: 'Too big' },
        ]}
      />
      <NumberRow label="Cafe rating" value={form.cafeRating} min={1} max={5} onChange={(v) => set('cafeRating', v)} />
      <OptionRow
        label="Come to another?"
        value={form.comeAgain}
        onChange={(v) => set('comeAgain', v as SubmitFeedbackInput['comeAgain'])}
        options={[
          { value: 'YES', label: 'Yes' },
          { value: 'MAYBE', label: 'Maybe' },
          { value: 'NO', label: 'No' },
        ]}
      />
      <Toggle label="I'd invite a friend" value={form.inviteFriend} onChange={(v) => set('inviteFriend', v)} />
      <NumberRow label="Recommend (0-10)" value={form.nps} min={0} max={10} onChange={(v) => set('nps', v)} />
      <Toggle
        label="Something felt unsafe"
        value={form.feltUnsafe ?? false}
        onChange={(v) => set('feltUnsafe', v)}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PrimaryButton label={busy ? 'Submitting…' : 'Submit feedback'} onPress={() => void submit()} disabled={busy} />
    </ScrollView>
  );
}

interface MapGroup {
  cafe: NonNullable<EventDto['cafe']>;
  events: EventDto[];
}

function MapScreen({ onBack }: { onBack: () => void }) {
  const [groups, setGroups] = useState<MapGroup[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const events = await api.browseEvents();
        const byCafe = new Map<string, MapGroup>();
        for (const e of events) {
          if (!e.cafe || e.cafe.lat == null || e.cafe.lng == null) continue;
          const g = byCafe.get(e.cafe.id) ?? { cafe: e.cafe, events: [] };
          g.events.push(e);
          byCafe.set(e.cafe.id, g);
        }
        if (active) setGroups([...byCafe.values()]);
      } catch {
        // ignore — map just shows no pins
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const selected = groups.find((g) => g.cafe.id === selectedId) ?? null;

  async function joinAndPay(e: EventDto) {
    try {
      const booking = await api.joinEvent(e.id);
      const { checkoutUrl } = await api.initiatePayment(booking.id, `${API_URL}`);
      await Linking.openURL(checkoutUrl);
    } catch (err) {
      Alert.alert('Could not join', err instanceof ApiError ? err.message : 'Something went wrong');
    }
  }

  return (
    <View style={styles.mapContainer}>
      <View style={[styles.headerRow, styles.mapHeader]}>
        <Text style={styles.title}>Meetups near you</Text>
        <Pressable onPress={onBack} hitSlop={8}>
          <Text style={styles.link}>List</Text>
        </Pressable>
      </View>
      <MapView
        style={styles.mapWrap}
        initialRegion={{
          latitude: 33.6844,
          longitude: 73.0479,
          latitudeDelta: 0.4,
          longitudeDelta: 0.4,
        }}
        showsUserLocation
      >
        {groups.map((g) => (
          <Marker
            key={g.cafe.id}
            coordinate={{ latitude: g.cafe.lat as number, longitude: g.cafe.lng as number }}
            title={g.cafe.name}
            description={`${g.events.length} meetup(s)`}
            pinColor={CORAL}
            onPress={() => setSelectedId(g.cafe.id)}
          />
        ))}
      </MapView>
      {selected && (
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <Text style={styles.cardTitle}>{selected.cafe.name}</Text>
            <Pressable onPress={() => setSelectedId(null)} hitSlop={8}>
              <Text style={styles.link}>Close</Text>
            </Pressable>
          </View>
          {selected.events.map((e) => (
            <View key={e.id} style={styles.sheetItem}>
              <Text style={styles.meta}>
                {e.title ?? 'Coffee meetup'} · {formatPKR(e.pricePKR)} · {e.seatsLeft} left
              </Text>
              <PrimaryButton
                label={e.seatsLeft <= 0 ? 'Full' : 'Join & pay'}
                onPress={() => void joinAndPay(e)}
                disabled={e.seatsLeft <= 0}
              />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function bookingStatus(b: BookingDto): { label: string; tint: string } {
  if (b.status === 'CANCELLED')
    return b.paymentStatus === 'REFUNDED'
      ? { label: 'Refunded', tint: MUTED }
      : { label: 'Cancelled', tint: '#C0392B' };
  if (b.status === 'WAITLISTED') return { label: 'Waitlisted', tint: '#B8860B' };
  if (b.paymentStatus === 'PAID') return { label: 'Paid', tint: '#2E7D32' };
  return { label: 'Payment pending', tint: MUTED };
}

function MeetupsScreen({ onBack }: { onBack: () => void }) {
  const [bookings, setBookings] = useState<BookingDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setBookings(await api.myBookings());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  function confirmCancel(b: BookingDto) {
    Alert.alert('Cancel booking', 'Cancel this booking?', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel booking',
        style: 'destructive',
        onPress: () => void doCancel(b),
      },
    ]);
  }
  async function doCancel(b: BookingDto) {
    setBusy(b.id);
    try {
      const updated = await api.cancelBooking(b.id);
      setBookings((prev) => prev.map((x) => (x.id === b.id ? updated : x)));
    } catch (err) {
      Alert.alert('Could not cancel', err instanceof ApiError ? err.message : 'Try again');
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={styles.flex}>
      <ScreenHeader title="My meetups" onBack={onBack} />
      {loading ? (
        <ActivityIndicator style={styles.spinner} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(b) => b.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.subtitle}>You haven’t joined any meetups yet.</Text>}
          renderItem={({ item: b }) => {
            const s = bookingStatus(b);
            return (
              <View style={styles.card}>
                <View style={styles.headerRow}>
                  <Text style={styles.cardTitle}>{b.event?.title ?? 'Coffee meetup'}</Text>
                  <Text style={[styles.badge, { color: s.tint }]}>{s.label}</Text>
                </View>
                {b.event && (
                  <Text style={styles.meta}>
                    {formatWhen(b.event.startAt)} · {b.event.cafe?.name ?? b.event.area}
                  </Text>
                )}
                <Text style={styles.meta}>{formatPKR(b.amountPKR)}</Text>
                {(b.paymentStatus === 'PAID' || b.paymentStatus === 'REFUNDED') &&
                  b.paymentRef && (
                    <Text style={styles.receiptRef}>Receipt · {b.paymentRef}</Text>
                  )}
                {b.status !== 'CANCELLED' && (
                  <SecondaryButton
                    label={busy === b.id ? 'Cancelling…' : 'Cancel booking'}
                    onPress={() => confirmCancel(b)}
                  />
                )}
                {b.status === 'ACTIVE' && <GroupMembersMobile eventId={b.eventId} />}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

function GroupMembersMobile({ eventId }: { eventId: string }) {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const r = await api.myGroup(eventId);
        if (active) setMembers(r.members);
      } catch {
        /* group not formed yet */
      } finally {
        if (active) setLoaded(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [eventId]);

  function actions(m: GroupMember) {
    Alert.alert(`${m.firstName ?? 'Member'} ${m.lastInitial ?? ''}`.trim(), 'Group member', [
      { text: 'Close', style: 'cancel' },
      {
        text: 'Block',
        onPress: async () => {
          try {
            await api.blockUser(m.id);
            setMsg('Blocked — you won’t be grouped again.');
          } catch (err) {
            setMsg(err instanceof ApiError ? err.message : 'Could not block');
          }
        },
      },
      {
        text: 'Report',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.reportUser(m.id, 'Reported from the app', eventId);
            setMsg('Reported — our team will review it.');
          } catch (err) {
            setMsg(err instanceof ApiError ? err.message : 'Could not report');
          }
        },
      },
    ]);
  }

  if (!loaded) return null;
  if (members.length === 0)
    return <Text style={styles.groupHint}>Group not formed yet.</Text>;

  return (
    <View style={styles.groupBox}>
      <Text style={styles.fieldLabel}>Your group</Text>
      {members.map((m) => (
        <Pressable key={m.id} style={styles.groupMember} onPress={() => actions(m)}>
          <Text style={styles.meta}>
            {m.firstName ?? 'Member'} {m.lastInitial ?? ''}
            {m.interests.length > 0 ? ` · ${m.interests.slice(0, 3).join(', ')}` : ''}
          </Text>
          <Text style={styles.link}>Manage</Text>
        </Pressable>
      ))}
      {msg ? <Text style={styles.groupHint}>{msg}</Text> : null}
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
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.subtitle}>You’re all caught up.</Text>}
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

// ---------- small building blocks ----------
function ScreenHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={styles.headerRow}>
      <Text style={styles.title}>{title}</Text>
      <Pressable onPress={onBack} hitSlop={8}>
        <Text style={styles.link}>Back</Text>
      </Pressable>
    </View>
  );
}

function Field({
  label,
  ...props
}: { label: string } & ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.fieldGap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput style={styles.input} {...props} />
    </View>
  );
}

function OptionRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.fieldGap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.pillRow}>
        {options.map((o) => (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[styles.pill, value === o.value ? styles.pillActive : null]}
          >
            <Text style={value === o.value ? styles.pillTextActive : styles.pillText}>{o.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function NumberRow({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const nums: number[] = [];
  for (let i = min; i <= max; i++) nums.push(i);
  return (
    <View style={styles.fieldGap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.pillRow}>
        {nums.map((n) => (
          <Pressable
            key={n}
            onPress={() => onChange(n)}
            style={[styles.pill, value === n ? styles.pillActive : null]}
          >
            <Text style={value === n ? styles.pillTextActive : styles.pillText}>{n}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Pressable style={styles.toggleRow} onPress={() => onChange(!value)}>
      <View style={[styles.checkbox, value ? styles.checkboxOn : null]}>
        {value ? <Text style={styles.checkMark}>✓</Text> : null}
      </View>
      <Text style={styles.subtitle}>{label}</Text>
    </Pressable>
  );
}

function PrimaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.button, disabled ? styles.buttonDisabled : null]}>
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.buttonOutline}>
      <Text style={styles.buttonOutlineText}>{label}</Text>
    </Pressable>
  );
}

const CORAL = '#E1583B';
const CREAM = '#FBF5EF';
const CARD = '#FFFFFF';
const INK = '#2B2019';
const MUTED = '#7C6E63';
const BORDER = '#EBE0D5';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CREAM },
  flex: { flex: 1, paddingHorizontal: 20, backgroundColor: CREAM },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: CREAM },
  screen: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 12, backgroundColor: CREAM },
  scroll: { padding: 20, gap: 14, backgroundColor: CREAM },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  rowGap: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  flexItem: { flex: 1 },
  title: { fontSize: 24, fontWeight: '800', color: INK, letterSpacing: -0.5 },
  subtitle: { color: MUTED, fontSize: 14 },
  spinner: { marginTop: 24 },
  list: { gap: 12, paddingVertical: 16 },
  fieldGap: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: INK },
  input: { borderWidth: 1, borderColor: BORDER, backgroundColor: CARD, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: INK },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { borderWidth: 1, borderColor: BORDER, backgroundColor: CARD, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 },
  pillActive: { backgroundColor: CORAL, borderColor: CORAL },
  pillText: { color: INK, fontSize: 13 },
  pillTextActive: { color: '#fff', fontSize: 13, fontWeight: '600' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 1, borderColor: '#c9bcae', alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: CORAL, borderColor: CORAL },
  checkMark: { color: '#fff', fontSize: 14 },
  button: { backgroundColor: CORAL, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 4, shadowColor: CORAL, shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  buttonOutline: { borderWidth: 1, borderColor: BORDER, backgroundColor: CARD, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  buttonOutlineText: { color: INK, fontWeight: '600' },
  link: { color: CORAL, fontWeight: '600' },
  error: { color: '#C0392B', fontSize: 14 },
  card: { borderWidth: 1, borderColor: BORDER, backgroundColor: CARD, borderRadius: 16, padding: 16, gap: 4 },
  cardUnread: { borderColor: CORAL, backgroundColor: '#FFF4EF' },
  cardTitle: { fontSize: 17, fontWeight: '700', color: INK },
  meta: { color: MUTED, fontSize: 13 },
  navRow: { flexWrap: 'wrap', marginTop: 4, marginBottom: 4 },
  badge: { fontSize: 12, fontWeight: '700' },
  receiptRef: { color: MUTED, fontSize: 11, marginTop: 2 },
  groupBox: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderColor: BORDER, gap: 6 },
  groupMember: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  groupHint: { color: MUTED, fontSize: 12 },
  mapContainer: { flex: 1, backgroundColor: CREAM },
  mapHeader: { paddingHorizontal: 20 },
  mapWrap: { flex: 1 },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: CARD,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    borderColor: BORDER,
    padding: 20,
    gap: 4,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: -3 },
  },
  sheetItem: { gap: 6, marginTop: 10 },
});
