'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError } from '@jrst/api-client';
import { api } from '@/lib/api';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Wordmark } from '@/components/wordmark';

// Accepts: 03XXXXXXXXX, +923XXXXXXXXX, 923XXXXXXXXX (10 digits after the 3)
const PK_PHONE_RE = /^(?:\+92|92|0)(3\d{9})$/;

function normalisePkPhone(raw: string): string | null {
  const m = raw.replace(/\s/g, '').match(PK_PHONE_RE);
  if (!m) return null;
  return `+92${m[1]}`;
}

export default function LoginPage() {
  const router = useRouter();
  const { requestOtp, verifyOtp, login, requestPasswordReset, resetPassword } = useAuth();

  const [step, setStep] = useState<'password' | 'email' | 'code' | 'reset'>('password');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [resetPasswordValue, setResetPasswordValue] = useState('');
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
  const [ref, setRef] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Capture referral code from URL (/login?ref=CODE) once on mount.
  useEffect(() => {
    const refCode = new URLSearchParams(window.location.search).get('ref');
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of URL on mount
    if (refCode) setRef(refCode.toUpperCase());
  }, []);

  // Debounced live handle-availability check (new users only).
  useEffect(() => {
    if (!isNewUser) return;
    const u = username.trim().replace(/^@/, '').toLowerCase();
    const t = setTimeout(async () => {
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
    }, 350);
    return () => clearTimeout(t);
  }, [username, isNewUser]);

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      // Create-account path: API rejects existing emails before sending a code.
      const { isNewUser: newUser, devCode: dev } = await requestOtp(
        email.trim().toLowerCase(),
        'signup',
      );
      setIsNewUser(newUser);
      if (dev) {
        setDevCode(dev);
        setCode(dev); // dev convenience: prefill so you can just tap Verify
      }
      setStep('code');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email.trim().toLowerCase(), password || undefined);
      router.push('/');
    } catch (err) {
      if (
        err instanceof ApiError &&
        err.status === 400 &&
        err.message === 'Password setup required. Use email verification.'
      ) {
        try {
          const result = await requestOtp(email.trim().toLowerCase());
          setIsNewUser(result.isNewUser);
          if (result.devCode) {
            setDevCode(result.devCode);
            setCode(result.devCode);
          }
          setStep('code');
          return;
        } catch (otpError) {
          setError(
            otpError instanceof ApiError
              ? otpError.message
              : 'Something went wrong',
          );
        }
      } else {
        setError(err instanceof ApiError ? err.message : 'Something went wrong');
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleResetRequest(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const result = await requestPasswordReset(email.trim().toLowerCase());
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

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await resetPassword(email.trim().toLowerCase(), code, resetPasswordValue);
      router.push('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPhoneError(null);

    // New users: validate name, handle, and PK phone before submit.
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
      const normalised = normalisePkPhone(phone);
      if (!normalised) {
        setPhoneError(
          'Enter a valid Pakistani mobile number (e.g. 03XX XXXXXXX or +923XXXXXXXXX)',
        );
        return;
      }
    }

    setBusy(true);
    try {
      await verifyOtp(email, code, {
        phone: isNewUser ? normalisePkPhone(phone) ?? phone : undefined,
        firstName: isNewUser ? firstName.trim() : undefined,
        lastName: isNewUser ? lastName.trim() : undefined,
        username: isNewUser ? username.trim().replace(/^@/, '').toLowerCase() : undefined,
        referralCode: ref ?? undefined,
        password,
      });
      router.push('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-gradient-hero">
      {/* decorative blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 size-80 rounded-full bg-gradient-sky opacity-30 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 -left-20 size-72 rounded-full bg-gradient-ember opacity-20 blur-3xl"
      />

      {/* hero wordmark */}
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-2 px-6 pt-16 text-center">
        <Wordmark size="lg" variant="white" />
        <p className="text-white/80 text-sm font-medium">
          Small groups. Real conversations. Good coffee.
        </p>
      </div>

      {/* card */}
      <div className="mx-auto mt-8 w-full max-w-sm flex-1 px-6 pb-24 md:pb-16">
        <div className="rounded-3xl border border-white/20 bg-card p-7 shadow-glow space-y-6">
          <div className="space-y-1 text-center">
            <p className="eyebrow text-primary">
              {step === 'password'
                ? 'Sign in'
                : step === 'reset'
                  ? 'Reset password'
                  : step === 'email'
                    ? 'Create account'
                    : 'Verify email'}
            </p>
            <h1 className="display text-2xl uppercase">
              {step === 'password'
                ? 'Sign in'
                : step === 'reset'
                  ? 'Reset your password'
                  : step === 'email'
                    ? 'Create your account'
                    : 'Check your email'}
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {step === 'password'
                ? 'Sign in with your email and password.'
                : step === 'email'
                  ? 'We’ll email a code to verify a new account. Existing accounts should sign in instead.'
                  : step === 'reset'
                    ? resetRequested
                      ? `We sent a 6-digit code to ${email}.`
                      : 'Enter your email and we’ll send a reset code if an account exists.'
                    : `We sent a 6-digit code to ${email}.`}
            </p>
            {step === 'code' && isNewUser && (
              <p className="text-muted-foreground text-sm leading-relaxed">
                New here? Pick a public <span className="font-semibold">@handle</span> and add
                your details to finish signup.
              </p>
            )}
            {ref && (
              <p className="bg-secondary text-secondary-foreground mx-auto w-fit rounded-full px-3 py-1 text-xs font-semibold">
                🎁 Invited with code {ref}
              </p>
            )}
          </div>

          {step === 'password' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="font-semibold">Email address</Label>
                <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="font-semibold">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="Leave blank if you have not set one yet" />
              </div>
              {error && <p className="text-destructive text-sm font-medium">{error}</p>}
              <Button type="submit" variant="hero" size="lg" className="w-full" disabled={busy}>
                {busy ? 'Signing in…' : 'Sign in →'}
              </Button>
              <button type="button" className="text-primary w-full text-sm font-semibold hover:underline" onClick={() => { setStep('email'); setError(null); }}>
                Create an account with email code
              </button>
              <button type="button" className="text-muted-foreground w-full text-sm hover:underline" onClick={() => { setStep('reset'); setError(null); setResetRequested(false); setDevCode(null); setCode(''); }}>
                Forgot password?
              </button>
              <button type="button" className="bg-secondary text-secondary-foreground w-full rounded-2xl px-4 py-2.5 text-center text-xs transition-[filter] hover:brightness-95" onClick={() => setEmail('coffeemeetupsadmin@yopmail.com')}>
                Testing? Tap to use admin email
              </button>
            </form>
          ) : step === 'email' ? (
            <form onSubmit={handleRequest} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="font-semibold">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email ?? ''}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              {error && <p className="text-destructive text-sm font-medium">{error}</p>}
              <Button type="submit" variant="hero" size="lg" className="w-full" disabled={busy}>
                {busy ? 'Sending…' : 'Send email code →'}
              </Button>
              <button
                type="button"
                className="text-muted-foreground w-full text-sm hover:underline"
                onClick={() => {
                  setStep('password');
                  setError(null);
                  setDevCode(null);
                  setCode('');
                }}
              >
                Already have an account? Sign in
              </button>
            </form>
          ) : step === 'reset' ? (
            <form onSubmit={resetRequested ? handleReset : handleResetRequest} className="space-y-4">
              {!resetRequested ? (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="reset-email" className="font-semibold">Email address</Label>
                    <Input id="reset-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus required />
                  </div>
                  <Button type="submit" variant="hero" size="lg" className="w-full" disabled={busy}>{busy ? 'Sending…' : 'Send reset code →'}</Button>
                </>
              ) : (
                <>
                  <Input inputMode="numeric" maxLength={6} placeholder="Verification code" value={code} onChange={(e) => setCode(e.target.value)} required />
                  {devCode && <p className="bg-secondary text-secondary-foreground rounded-2xl px-4 py-2.5 text-center text-sm">Dev code: <span className="font-mono font-bold">{devCode}</span></p>}
                  <Input type="password" placeholder="New password (8+ characters)" value={resetPasswordValue} onChange={(e) => setResetPasswordValue(e.target.value)} autoComplete="new-password" required />
                  <Button type="submit" variant="hero" size="lg" className="w-full" disabled={busy}>{busy ? 'Resetting…' : 'Set new password →'}</Button>
                </>
              )}
              {error && <p className="text-destructive text-sm font-medium">{error}</p>}
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="code" className="font-semibold">Verification code</Label>
                <Input
                  id="code"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={code ?? ''}
                  onChange={(e) => setCode(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="first-password" className="font-semibold">Set your password</Label>
                <Input id="first-password" type="password" placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength={8} required />
                <p className="text-muted-foreground text-xs">You’ll use this password for future sign-ins.</p>
              </div>
              {isNewUser && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="firstName" className="font-semibold">First name</Label>
                      <Input
                        id="firstName"
                        placeholder="Sarah"
                        value={firstName ?? ''}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="lastName" className="font-semibold">Last name</Label>
                      <Input
                        id="lastName"
                        placeholder="Khan"
                        value={lastName ?? ''}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="username" className="font-semibold">Handle</Label>
                    <div className="relative">
                      <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                        @
                      </span>
                      <Input
                        id="username"
                        className="pl-7"
                        placeholder="sarah_k"
                        autoCapitalize="none"
                        autoComplete="off"
                        value={username ?? ''}
                        onChange={(e) =>
                          setUsername(e.target.value.replace(/^@/, '').toLowerCase())
                        }
                        required
                      />
                      {handleStatus === 'checking' && (
                        <span className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2 text-sm">
                          <i className="fa-solid fa-circle-notch fa-spin" />
                        </span>
                      )}
                      {handleStatus === 'ok' && (
                        <span className="text-primary absolute top-1/2 right-3 -translate-y-1/2 text-sm">
                          <i className="fa-solid fa-circle-check" />
                        </span>
                      )}
                      {(handleStatus === 'taken' || handleStatus === 'invalid') && (
                        <span className="text-destructive absolute top-1/2 right-3 -translate-y-1/2 text-sm">
                          <i className="fa-solid fa-circle-xmark" />
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {handleStatus === 'taken'
                        ? 'That handle is taken — try another.'
                        : handleStatus === 'invalid'
                          ? '3–20 letters, numbers or underscores.'
                          : 'Your @handle is public. Your name, phone & email stay private.'}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="font-semibold">Phone number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      inputMode="tel"
                      placeholder="03XX XXXXXXX"
                      value={phone ?? ''}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        setPhoneError(null);
                      }}
                      required
                    />
                    <p className="text-muted-foreground text-xs">
                      Pakistani mobile — private, only admins can see it.
                    </p>
                    {phoneError && (
                      <p className="text-destructive text-sm font-medium">{phoneError}</p>
                    )}
                  </div>
                </>
              )}
              {devCode && (
                <p className="bg-secondary text-secondary-foreground rounded-2xl px-4 py-2.5 text-center text-sm">
                  Dev code: <span className="font-mono font-bold">{devCode}</span>
                </p>
              )}
              {error && <p className="text-destructive text-sm font-medium">{error}</p>}
              <Button type="submit" variant="hero" size="lg" className="w-full" disabled={busy}>
                {busy ? 'Verifying…' : 'Verify & sign in →'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={() => {
                  setStep('email');
                  setCode('');
                  setDevCode(null);
                  setError(null);
                  setPhoneError(null);
                }}
              >
                ← Use a different email
              </Button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
