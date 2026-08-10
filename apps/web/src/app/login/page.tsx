'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError } from '@jrst/api-client';
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
  const { requestOtp, verifyOtp } = useAuth();

  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
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

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { isNewUser: newUser, devCode: dev } = await requestOtp(
        email.trim().toLowerCase(),
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

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPhoneError(null);

    // Client-side PK phone validation for new users
    if (isNewUser) {
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
        referralCode: ref ?? undefined,
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
        <Wordmark className="text-2xl text-white" />
        <p className="text-white/80 text-sm font-medium">
          Small groups. Real conversations. Good coffee.
        </p>
      </div>

      {/* card */}
      <div className="mx-auto mt-8 w-full max-w-sm flex-1 px-6 pb-16">
        <div className="rounded-3xl border border-white/20 bg-card p-7 shadow-glow space-y-6">
          <div className="space-y-1 text-center">
            <p className="eyebrow text-primary">
              {step === 'email' ? 'Step 1 of 2' : 'Step 2 of 2'}
            </p>
            <h1 className="display text-2xl uppercase">
              {step === 'email' ? 'Sign in' : 'Check your email'}
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {step === 'email'
                ? "Enter your email — we'll send a one-time code."
                : `We sent a 6-digit code to ${email}.`}
            </p>
            {step === 'code' && isNewUser && (
              <p className="text-muted-foreground text-sm leading-relaxed">
                New here? Add your phone number to finish signup.
              </p>
            )}
            {ref && (
              <p className="bg-secondary text-secondary-foreground mx-auto w-fit rounded-full px-3 py-1 text-xs font-semibold">
                🎁 Invited with code {ref}
              </p>
            )}
          </div>

          {step === 'email' ? (
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
                {busy ? 'Sending…' : 'Send code →'}
              </Button>
              <button
                type="button"
                onClick={() => setEmail('coffeemeetupsadmin@yopmail.com')}
                className="bg-secondary text-secondary-foreground w-full rounded-2xl px-4 py-2.5 text-center text-xs transition-[filter] hover:brightness-95"
              >
                Testing? Tap to use admin:{' '}
                <span className="font-mono font-bold">coffeemeetupsadmin@yopmail.com</span>
              </button>
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
              {isNewUser && (
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
                    Pakistani mobile — required to finish signup
                  </p>
                  {phoneError && (
                    <p className="text-destructive text-sm font-medium">{phoneError}</p>
                  )}
                </div>
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
