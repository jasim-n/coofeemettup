import { type ComponentProps, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ApiError, type PublicUser } from '@jrst/api-client';
import { api } from '../api';
import { BORDER, DESTRUCTIVE, INK, MUTED, PRIMARY, PRIMARY_SOFT } from '../theme';

const PK_PHONE_RE = /^(?:\+92|92|0)(3\d{9})$/;

function normalisePkPhone(raw: string): string | null {
  const m = raw.replace(/\s/g, '').match(PK_PHONE_RE);
  if (!m) return null;
  return `+92${m[1]}`;
}

const QUIPS = [
  'Psst… I saved you a seat.',
  'Headphones on. Circles loading…',
  'Meet. Connect. Waddle in.',
  'No awkward hellos. Promise.',
  'Ready when you are.',
];

const HERO = ['#082F32', '#0B4A4A', '#18B7A0'] as const;

/**
 * Login UI mirrored from apps/web login: hero gradient, white wordmark,
 * mascot, centered card, Poppins, same copy + field order.
 */
export function LoginScreen({ onAuthed }: { onAuthed: (u: PublicUser) => void }) {
  const [step, setStep] = useState<'password' | 'email' | 'code' | 'reset'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [handleStatus, setHandleStatus] = useState<
    'idle' | 'checking' | 'ok' | 'taken' | 'invalid'
  >('idle');
  const [isNewUser, setIsNewUser] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [resetRequested, setResetRequested] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [quipIndex, setQuipIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setQuipIndex((i) => (i + 1) % QUIPS.length), 4200);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!isNewUser) return;
    const u = username.trim().replace(/^@/, '').toLowerCase();
    const t = setTimeout(() => {
      void (async () => {
        if (u.length < 3) {
          setHandleStatus(u.length ? 'invalid' : 'idle');
          return;
        }
        setHandleStatus('checking');
        try {
          const { available, valid } = await api.usernameAvailable(u);
          setHandleStatus(!valid ? 'invalid' : available ? 'ok' : 'taken');
        } catch {
          setHandleStatus('idle');
        }
      })();
    }, 350);
    return () => clearTimeout(t);
  }, [username, isNewUser]);

  async function handleLogin() {
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
            setDevCode(result.devCode);
            setCode(result.devCode);
          }
          setStep('code');
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

  async function handleRequest() {
    setError(null);
    setBusy(true);
    try {
      const result = await api.requestOtp(email.trim().toLowerCase(), 'signup');
      setIsNewUser(result.isNewUser);
      if (result.devCode) {
        setDevCode(result.devCode);
        setCode(result.devCode);
      }
      setStep('code');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  async function handleResetRequest() {
    setError(null);
    setBusy(true);
    try {
      const result = await api.requestPasswordReset(email.trim().toLowerCase());
      if (result.devCode) {
        setDevCode(result.devCode);
        setCode(result.devCode);
      }
      setResetRequested(true);
      setStep('reset');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  async function handleReset() {
    setError(null);
    setBusy(true);
    try {
      const res = await api.resetPassword(email.trim().toLowerCase(), code, resetPasswordValue);
      onAuthed(res.user);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify() {
    setError(null);
    setPhoneError(null);
    if (isNewUser) {
      if (!firstName.trim() || !lastName.trim()) {
        setError('Please enter your first and last name.');
        return;
      }
      if (handleStatus === 'invalid' || username.trim().replace(/^@/, '').length < 3) {
        setError('Pick a handle: 3–20 letters, numbers or underscores.');
        return;
      }
      if (handleStatus === 'taken') {
        setError('That handle is taken — try another.');
        return;
      }
      if (!normalisePkPhone(phone)) {
        setPhoneError('Enter a valid Pakistani mobile number (e.g. 03XX XXXXXXX or +923XXXXXXXXX)');
        return;
      }
    }
    setBusy(true);
    try {
      const res = await api.verifyOtp(email.trim().toLowerCase(), code, {
        phone: isNewUser ? normalisePkPhone(phone) ?? undefined : undefined,
        firstName: isNewUser ? firstName.trim() : undefined,
        lastName: isNewUser ? lastName.trim() : undefined,
        username: isNewUser ? username.trim().replace(/^@/, '').toLowerCase() : undefined,
        password: password || undefined,
      });
      onAuthed(res.user);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  const eyebrow =
    step === 'password'
      ? 'Sign in'
      : step === 'reset'
        ? 'Reset password'
        : step === 'email'
          ? 'Create account'
          : 'Verify email';

  const heading =
    step === 'password'
      ? 'Sign in'
      : step === 'reset'
        ? 'Reset your password'
        : step === 'email'
          ? 'Create your account'
          : 'Check your email';

  const blurb =
    step === 'password'
      ? 'Sign in with your email and password.'
      : step === 'email'
        ? 'We’ll email a code to verify a new account. Existing accounts should sign in instead.'
        : step === 'reset'
          ? resetRequested
            ? `We sent a 6-digit code to ${email}.`
            : 'Enter your email and we’ll send a reset code if an account exists.'
          : `We sent a 6-digit code to ${email}.`;

  return (
    <LinearGradient colors={[...HERO]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={s.wordmarkBlock}>
            <Image
              source={require('../../assets/brand/logo-in-white.png')}
              style={s.wordmark}
              resizeMode="contain"
              accessibilityLabel="Nine Circles"
            />
            <Text style={s.tagline}>Connecting People, One Circle at a Time</Text>
          </View>

          <View style={s.mascotBlock}>
            <View style={s.bubble}>
              <Text style={s.bubbleText}>{QUIPS[quipIndex]}</Text>
            </View>
            <Image
              source={require('../../assets/brand/mascot-sm.png')}
              style={s.mascot}
              resizeMode="contain"
            />
          </View>

          <View style={s.card}>
            <View style={s.cardHeader}>
              <Text style={s.eyebrow}>{eyebrow}</Text>
              <Text style={s.display}>{heading}</Text>
              <Text style={s.blurb}>{blurb}</Text>
              {step === 'code' && isNewUser ? (
                <Text style={s.blurb}>
                  New here? Pick a public <Text style={s.em}>@handle</Text> and add your details to
                  finish signup.
                </Text>
              ) : null}
            </View>

            {step === 'password' ? (
              <View style={s.form}>
                <Field label="Email address" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoFocus />
                <Field label="Password" value={password} onChangeText={setPassword} placeholder="Leave blank if you have not set one yet" secureTextEntry />
                {error ? <Text style={s.error}>{error}</Text> : null}
                <HeroButton label={busy ? 'Signing in…' : 'Sign in →'} onPress={() => void handleLogin()} disabled={busy} />
                <TextLink
                  label="Create an account with email code"
                  onPress={() => {
                    setStep('email');
                    setError(null);
                  }}
                  primary
                />
                <TextLink
                  label="Forgot password?"
                  onPress={() => {
                    setStep('reset');
                    setError(null);
                    setResetRequested(false);
                    setDevCode(null);
                    setCode('');
                  }}
                />
              </View>
            ) : null}

            {step === 'email' ? (
              <View style={s.form}>
                <Field label="Email address" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoFocus />
                {error ? <Text style={s.error}>{error}</Text> : null}
                <HeroButton label={busy ? 'Sending…' : 'Send email code →'} onPress={() => void handleRequest()} disabled={busy} />
                <TextLink
                  label="Already have an account? Sign in"
                  onPress={() => {
                    setStep('password');
                    setError(null);
                    setDevCode(null);
                    setCode('');
                  }}
                />
              </View>
            ) : null}

            {step === 'reset' ? (
              <View style={s.form}>
                {!resetRequested ? (
                  <>
                    <Field label="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoFocus />
                    <HeroButton label={busy ? 'Sending…' : 'Send reset code →'} onPress={() => void handleResetRequest()} disabled={busy} />
                  </>
                ) : (
                  <>
                    <Field label="Verification code" value={code} onChangeText={setCode} placeholder="000000" keyboardType="number-pad" maxLength={6} />
                    {devCode ? (
                      <View style={s.devCode}>
                        <Text style={s.devCodeText}>
                          Dev code: <Text style={s.devCodeMono}>{devCode}</Text>
                        </Text>
                      </View>
                    ) : null}
                    <Field label="New password" value={resetPasswordValue} onChangeText={setResetPasswordValue} placeholder="New password (8+ characters)" secureTextEntry />
                    <HeroButton label={busy ? 'Resetting…' : 'Set new password →'} onPress={() => void handleReset()} disabled={busy} />
                  </>
                )}
                {error ? <Text style={s.error}>{error}</Text> : null}
              </View>
            ) : null}

            {step === 'code' ? (
              <View style={s.form}>
                <Field label="Verification code" value={code} onChangeText={setCode} placeholder="000000" keyboardType="number-pad" maxLength={6} autoFocus />
                <Field label="Set your password" value={password} onChangeText={setPassword} placeholder="At least 8 characters" secureTextEntry />
                <Text style={s.hint}>You’ll use this password for future sign-ins.</Text>
                {isNewUser ? (
                  <>
                    <View style={s.row2}>
                      <View style={{ flex: 1 }}>
                        <Field label="First name" value={firstName} onChangeText={setFirstName} placeholder="Sarah" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Field label="Last name" value={lastName} onChangeText={setLastName} placeholder="Khan" />
                      </View>
                    </View>
                    <Field
                      label="Handle"
                      value={username}
                      onChangeText={(t) => setUsername(t.replace(/^@/, '').toLowerCase())}
                      placeholder="sarah_k"
                      autoCapitalize="none"
                      prefix="@"
                    />
                    <Text style={s.hint}>
                      {handleStatus === 'taken'
                        ? 'That handle is taken — try another.'
                        : handleStatus === 'invalid'
                          ? '3–20 letters, numbers or underscores.'
                          : handleStatus === 'ok'
                            ? 'Handle is available.'
                            : 'Your @handle is public. Your name, phone & email stay private.'}
                    </Text>
                    <Field
                      label="Phone number"
                      value={phone}
                      onChangeText={(t) => {
                        setPhone(t);
                        setPhoneError(null);
                      }}
                      placeholder="03XX XXXXXXX"
                      keyboardType="phone-pad"
                    />
                    <Text style={s.hint}>Pakistani mobile — private, only admins can see it.</Text>
                    {phoneError ? <Text style={s.error}>{phoneError}</Text> : null}
                  </>
                ) : null}
                {devCode ? (
                  <View style={s.devCode}>
                    <Text style={s.devCodeText}>
                      Dev code: <Text style={s.devCodeMono}>{devCode}</Text>
                    </Text>
                  </View>
                ) : null}
                {error ? <Text style={s.error}>{error}</Text> : null}
                <HeroButton label={busy ? 'Verifying…' : 'Verify & sign in →'} onPress={() => void handleVerify()} disabled={busy} />
                <TextLink
                  label="← Use a different email"
                  onPress={() => {
                    setStep('email');
                    setCode('');
                    setDevCode(null);
                    setError(null);
                    setPhoneError(null);
                  }}
                />
              </View>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

function Field({
  label,
  prefix,
  ...props
}: {
  label: string;
  prefix?: string;
} & ComponentProps<typeof TextInput>) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <View style={prefix ? s.inputWrap : undefined}>
        {prefix ? <Text style={s.prefix}>{prefix}</Text> : null}
        <TextInput
          style={[s.input, prefix ? { paddingLeft: 28 } : null]}
          placeholderTextColor={MUTED}
          {...props}
        />
      </View>
    </View>
  );
}

function HeroButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[s.heroBtn, disabled ? { opacity: 0.45 } : null]}>
      {disabled ? <ActivityIndicator color="#fff" /> : <Text style={s.heroBtnText}>{label}</Text>}
    </Pressable>
  );
}

function TextLink({
  label,
  onPress,
  primary,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={{ alignItems: 'center', paddingVertical: 4 }}>
      <Text style={[s.link, primary ? { color: PRIMARY, fontWeight: '600' } : null]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 40,
    gap: 16,
  },
  wordmarkBlock: { alignItems: 'center', gap: 8 },
  wordmark: { width: 96, height: 96 },
  tagline: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    textAlign: 'center',
  },
  mascotBlock: { alignItems: 'center', gap: 8, marginTop: 4 },
  bubble: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    borderBottomLeftRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: 180,
  },
  bubbleText: {
    color: INK,
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    textAlign: 'center',
  },
  mascot: { width: 96, height: 96 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    padding: 28,
    gap: 24,
    shadowColor: PRIMARY,
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  cardHeader: { gap: 6, alignItems: 'center' },
  eyebrow: {
    color: PRIMARY,
    fontSize: 11,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  display: {
    color: INK,
    fontSize: 24,
    fontFamily: 'Poppins_800ExtraBold',
    textTransform: 'uppercase',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  blurb: {
    color: MUTED,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    lineHeight: 20,
    textAlign: 'center',
  },
  em: { fontFamily: 'Poppins_600SemiBold', color: INK },
  form: { gap: 14 },
  field: { gap: 6 },
  label: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: INK },
  inputWrap: { position: 'relative' },
  prefix: {
    position: 'absolute',
    left: 12,
    top: 14,
    color: MUTED,
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    zIndex: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: INK,
    fontFamily: 'Poppins_400Regular',
  },
  hint: { color: MUTED, fontSize: 12, fontFamily: 'Poppins_400Regular', marginTop: -6 },
  error: { color: DESTRUCTIVE, fontSize: 14, fontFamily: 'Poppins_500Medium' },
  heroBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: PRIMARY,
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  heroBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Poppins_700Bold' },
  link: { color: MUTED, fontSize: 14, fontFamily: 'Poppins_400Regular' },
  row2: { flexDirection: 'row', gap: 12 },
  devCode: {
    backgroundColor: PRIMARY_SOFT,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  devCodeText: {
    textAlign: 'center',
    color: INK,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
  },
  devCodeMono: { fontFamily: 'Poppins_700Bold' },
});
