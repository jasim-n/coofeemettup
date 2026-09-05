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
  type ChatMessage,
  type CreateTableInput,
  type EventDto,
  type NotificationDto,
  type PublicUser,
  type SubmitFeedbackInput,
  type TableDto,
  type TableJoinRequestDto,
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
function handleOf(u?: { username?: string | null } | null): string {
  return u?.username ? `@${u.username}` : '@member';
}

type Screen =
  | { name: 'events' }
  | { name: 'profile' }
  | { name: 'feedback'; event: EventDto }
  | { name: 'map' }
  | { name: 'meetups' }
  | { name: 'notifications' }
  | { name: 'tables' }
  | { name: 'table'; id: string }
  | { name: 'tableChat'; id: string }
  | { name: 'createTable' };

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
    api.setAuthToken(null);
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
  const [screen, setScreen] = useState<Screen>({ name: 'tables' });

  if (screen.name === 'profile') {
    return (
      <ProfileScreen
        user={user}
        onSaved={setUser}
        onBack={() => setScreen({ name: 'tables' })}
      />
    );
  }
  if (screen.name === 'feedback') {
    return <FeedbackScreen event={screen.event} onBack={() => setScreen({ name: 'tables' })} />;
  }
  if (screen.name === 'map') {
    return <MapScreen onBack={() => setScreen({ name: 'tables' })} />;
  }
  if (screen.name === 'meetups') {
    return (
      <MeetupsScreen
        onBack={() => setScreen({ name: 'tables' })}
        onOpenTable={(id) => setScreen({ name: 'table', id })}
      />
    );
  }
  if (screen.name === 'notifications') {
    return <NotificationsScreen onBack={() => setScreen({ name: 'tables' })} />;
  }
  if (screen.name === 'table') {
    return <TableDetailScreen id={screen.id} user={user} nav={setScreen} />;
  }
  if (screen.name === 'tableChat') {
    return (
      <TableChatScreen
        id={screen.id}
        userId={user.id}
        onBack={() => setScreen({ name: 'table', id: screen.id })}
      />
    );
  }
  if (screen.name === 'createTable') {
    return (
      <CreateTableScreen
        onDone={(id) => setScreen({ name: 'table', id })}
        onBack={() => setScreen({ name: 'tables' })}
      />
    );
  }
  if (screen.name === 'events') {
    return (
      <EventsScreen
        user={user}
        onLogout={onLogout}
        onProfile={() => setScreen({ name: 'profile' })}
        onFeedback={(event) => setScreen({ name: 'feedback', event })}
        onMap={() => setScreen({ name: 'map' })}
        onMeetups={() => setScreen({ name: 'meetups' })}
        onNotifications={() => setScreen({ name: 'notifications' })}
        onTables={() => setScreen({ name: 'tables' })}
      />
    );
  }
  return <TablesScreen user={user} nav={setScreen} onLogout={onLogout} />;
}

function LoginScreen({ onAuthed }: { onAuthed: (u: PublicUser) => void }) {
  const [step, setStep] = useState<'password' | 'signup' | 'reset'>('password');
  const [codePhase, setCodePhase] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [isNewUser, setIsNewUser] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devHint, setDevHint] = useState<string | null>(null);

  function resetCodeState() {
    setCode('');
    setDevHint(null);
    setCodePhase(false);
  }

  async function doLogin() {
    setError(null);
    setBusy(true);
    try {
      const res = await api.login(email.trim().toLowerCase(), password || undefined);
      onAuthed(res.user);
    } catch (err) {
      if (
        err instanceof ApiError &&
        err.status === 400 &&
        err.message === 'Password setup required. Use email verification.'
      ) {
        try {
          const result = await api.requestOtp(email.trim().toLowerCase(), 'login');
          setIsNewUser(result.isNewUser);
          if (result.devCode) {
            setDevHint(result.devCode);
            setCode(result.devCode);
          }
          setStep('signup');
          setCodePhase(true);
        } catch (otpErr) {
          setError(otpErr instanceof ApiError ? otpErr.message : 'Something went wrong');
        }
      } else {
        setError(err instanceof ApiError ? err.message : 'Something went wrong');
      }
    } finally {
      setBusy(false);
    }
  }

  async function startSignup() {
    setError(null);
    setBusy(true);
    try {
      const result = await api.requestOtp(email.trim().toLowerCase(), 'signup');
      setIsNewUser(result.isNewUser);
      if (result.devCode) {
        setDevHint(result.devCode);
        setCode(result.devCode);
      }
      setCodePhase(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  async function verifySignup() {
    setError(null);
    setBusy(true);
    try {
      const res = await api.verifyOtp(email.trim().toLowerCase(), code, {
        phone: isNewUser ? phone.trim() || undefined : undefined,
        firstName: isNewUser ? firstName.trim() || undefined : undefined,
        lastName: isNewUser ? lastName.trim() || undefined : undefined,
        username: isNewUser
          ? username.trim().replace(/^@/, '').toLowerCase() || undefined
          : undefined,
        password: password || undefined,
      });
      onAuthed(res.user);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  async function startReset() {
    setError(null);
    setBusy(true);
    try {
      const result = await api.requestPasswordReset(email.trim().toLowerCase());
      if (result.devCode) {
        setDevHint(result.devCode);
        setCode(result.devCode);
      }
      setCodePhase(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  async function doReset() {
    setError(null);
    setBusy(true);
    try {
      const res = await api.resetPassword(email.trim().toLowerCase(), code, password);
      onAuthed(res.user);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={[styles.scroll, { justifyContent: 'center', flexGrow: 1 }]}>
      <Text style={[styles.title, { color: CORAL, textAlign: 'center', fontSize: 30 }]}>
        Nine Circles
      </Text>
      <Text style={[styles.subtitle, { textAlign: 'center' }]}>
        {step === 'password' && !codePhase
          ? 'Sign in with email and password'
          : step === 'signup' && !codePhase
            ? 'Create an account'
            : step === 'signup' && codePhase
              ? `Enter the code sent to ${email}`
              : step === 'reset' && !codePhase
                ? 'Reset your password'
                : `Enter the reset code sent to ${email}`}
      </Text>
      <Text style={[styles.receiptRef, { textAlign: 'center' }]}>API: {API_URL}</Text>

      {step === 'password' && (
        <>
          <TextInput
            style={styles.input}
            placeholder="Email"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
            autoFocus
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <PrimaryButton
            label={busy ? 'Signing in…' : 'Sign in'}
            onPress={() => void doLogin()}
            disabled={busy}
          />
          <Pressable
            onPress={() => {
              setStep('signup');
              resetCodeState();
              setPassword('');
              setError(null);
            }}
            hitSlop={8}
            style={{ alignItems: 'center', marginTop: 8 }}
          >
            <Text style={styles.link}>Create an account</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setStep('reset');
              resetCodeState();
              setPassword('');
              setError(null);
            }}
            hitSlop={8}
            style={{ alignItems: 'center' }}
          >
            <Text style={styles.link}>Forgot password?</Text>
          </Pressable>
        </>
      )}

      {step === 'signup' && !codePhase && (
        <>
          <TextInput
            style={styles.input}
            placeholder="Email"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
            autoFocus
          />
          <PrimaryButton
            label={busy ? 'Sending…' : 'Send verification code'}
            onPress={() => void startSignup()}
            disabled={busy}
          />
          <Pressable
            onPress={() => {
              setStep('password');
              resetCodeState();
              setError(null);
            }}
            hitSlop={8}
            style={{ alignItems: 'center', marginTop: 8 }}
          >
            <Text style={styles.link}>Back to sign in</Text>
          </Pressable>
        </>
      )}

      {step === 'signup' && codePhase && (
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
          <TextInput
            style={styles.input}
            placeholder="Password (min 8 characters)"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          {isNewUser ? (
            <>
              <TextInput
                style={styles.input}
                placeholder="First name"
                value={firstName}
                onChangeText={setFirstName}
              />
              <TextInput
                style={styles.input}
                placeholder="Last name"
                value={lastName}
                onChangeText={setLastName}
              />
              <TextInput
                style={styles.input}
                placeholder="@username"
                autoCapitalize="none"
                autoCorrect={false}
                value={username}
                onChangeText={setUsername}
              />
              <TextInput
                style={styles.input}
                placeholder="03XX XXXXXXX"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </>
          ) : null}
          {devHint ? <Text style={styles.receiptRef}>Dev code: {devHint}</Text> : null}
          <PrimaryButton
            label={busy ? 'Verifying…' : 'Verify & continue'}
            onPress={() => void verifySignup()}
            disabled={busy}
          />
          <Pressable
            onPress={() => {
              resetCodeState();
              setError(null);
            }}
            hitSlop={8}
            style={{ alignItems: 'center', marginTop: 8 }}
          >
            <Text style={styles.link}>Use a different email</Text>
          </Pressable>
        </>
      )}

      {step === 'reset' && !codePhase && (
        <>
          <TextInput
            style={styles.input}
            placeholder="Email"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
            autoFocus
          />
          <PrimaryButton
            label={busy ? 'Sending…' : 'Send reset code'}
            onPress={() => void startReset()}
            disabled={busy}
          />
          <Pressable
            onPress={() => {
              setStep('password');
              resetCodeState();
              setError(null);
            }}
            hitSlop={8}
            style={{ alignItems: 'center', marginTop: 8 }}
          >
            <Text style={styles.link}>Back to sign in</Text>
          </Pressable>
        </>
      )}

      {step === 'reset' && codePhase && (
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
          <TextInput
            style={styles.input}
            placeholder="New password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          {devHint ? <Text style={styles.receiptRef}>Dev code: {devHint}</Text> : null}
          <PrimaryButton
            label={busy ? 'Saving…' : 'Reset password'}
            onPress={() => void doReset()}
            disabled={busy}
          />
          <Pressable
            onPress={() => {
              resetCodeState();
              setError(null);
            }}
            hitSlop={8}
            style={{ alignItems: 'center', marginTop: 8 }}
          >
            <Text style={styles.link}>Use a different email</Text>
          </Pressable>
        </>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </ScrollView>
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
  onTables,
}: {
  user: PublicUser;
  onLogout: () => void;
  onProfile: () => void;
  onFeedback: (event: EventDto) => void;
  onMap: () => void;
  onMeetups: () => void;
  onNotifications: () => void;
  onTables: () => void;
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
        <Pressable onPress={onTables} hitSlop={8}>
          <Text style={styles.link}>Tables</Text>
        </Pressable>
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

function MeetupsScreen({
  onBack,
  onOpenTable,
}: {
  onBack: () => void;
  onOpenTable: (id: string) => void;
}) {
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
    <View style={styles.flex}>
      <ScreenHeader title="My meetups" onBack={onBack} />
      {loading ? (
        <ActivityIndicator style={styles.spinner} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <FlatList
          data={tables}
          keyExtractor={(t) => t.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.subtitle}>You haven’t joined any tables yet.</Text>}
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

// ---------- Tables ----------
function TablesScreen({
  user,
  nav,
  onLogout,
}: {
  user: PublicUser;
  nav: (s: Screen) => void;
  onLogout: () => void;
}) {
  const [tables, setTables] = useState<TableDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setTables(await api.browseTables());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load tables');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  return (
    <View style={styles.flex}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Tables</Text>
        <Pressable onPress={() => void onLogout()} hitSlop={8}>
          <Text style={styles.link}>Sign out</Text>
        </Pressable>
      </View>
      <View style={[styles.rowGap, styles.navRow]}>
        <Pressable onPress={() => nav({ name: 'profile' })} hitSlop={8}>
          <Text style={styles.link}>Profile</Text>
        </Pressable>
        <Pressable onPress={() => nav({ name: 'meetups' })} hitSlop={8}>
          <Text style={styles.link}>My meetups</Text>
        </Pressable>
        <Pressable onPress={() => nav({ name: 'notifications' })} hitSlop={8}>
          <Text style={styles.link}>Notifications</Text>
        </Pressable>
        {user.canHost ? (
          <Pressable onPress={() => nav({ name: 'createTable' })} hitSlop={8}>
            <Text style={styles.link}>Host</Text>
          </Pressable>
        ) : null}
      </View>
      {loading ? (
        <ActivityIndicator style={styles.spinner} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <FlatList
          data={tables}
          keyExtractor={(t) => t.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.subtitle}>No open tables right now.</Text>}
          renderItem={({ item: t }) => (
            <Pressable style={styles.card} onPress={() => nav({ name: 'table', id: t.id })}>
              <Text style={styles.cardTitle}>{t.title ?? t.category}</Text>
              <Text style={styles.meta}>{formatWhen(t.startAt)}</Text>
              <Text style={styles.meta}>
                {t.venueName ?? t.cafe?.name ?? 'See map'} ·{' '}
                {t.pricePKR == null ? 'Free' : formatPKR(t.pricePKR)} · {t.seatsLeft} left
              </Text>
              <Text style={styles.meta}>Hosted by {handleOf(t.host)}</Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

function TableDetailScreen({
  id,
  user,
  nav,
}: {
  id: string;
  user: PublicUser;
  nav: (s: Screen) => void;
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
        <ScreenHeader title="Table" onBack={() => nav({ name: 'tables' })} />
        {error ? <Text style={styles.error}>{error}</Text> : <ActivityIndicator style={styles.spinner} />}
      </View>
    );
  }

  const isHost = table.hostId === user.id;
  const status = table.myRequestStatus;
  const full = table.seatsLeft <= 0 || table.status !== 'OPEN';

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <ScreenHeader title={table.title ?? table.category} onBack={() => nav({ name: 'tables' })} />
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
              <PrimaryButton label="Open group chat" onPress={() => nav({ name: 'tableChat', id })} />
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
          <PrimaryButton label="Open group chat" onPress={() => nav({ name: 'tableChat', id })} />
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
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.subtitle}>No messages yet — say hi 👋</Text>}
          renderItem={({ item: m }) => {
            const mine = m.userId === userId;
            return (
              <View style={[styles.bubbleRow, { justifyContent: mine ? 'flex-end' : 'flex-start' }]}>
                <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
                  {!mine ? (
                    <Text style={styles.bubbleName}>{handleOf(m)}</Text>
                  ) : null}
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
          {coord ? <Marker coordinate={coord} pinColor={CORAL} /> : null}
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
      <Field label="Description" value={description} onChangeText={setDescription} multiline placeholder="What's this table about?" />
      <Field label="Price per seat (blank = free)" value={price} onChangeText={setPrice} keyboardType="numeric" placeholder="Free" />
      <PrimaryButton label={busy ? 'Publishing…' : 'Publish table'} onPress={() => void publish()} disabled={busy} />
    </ScrollView>
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
  pickerMap: { height: 220, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: BORDER },
  bubbleRow: { flexDirection: 'row', marginVertical: 3 },
  bubble: { maxWidth: '80%', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  bubbleMine: { backgroundColor: CORAL, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER, borderBottomLeftRadius: 4 },
  bubbleName: { color: MUTED, fontSize: 11, fontWeight: '600', marginBottom: 2 },
  bubbleText: { color: INK, fontSize: 14 },
  bubbleTextMine: { color: '#fff', fontSize: 14 },
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
