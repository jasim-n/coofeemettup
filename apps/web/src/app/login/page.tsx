'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError } from '@jrst/api-client';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Wordmark } from '@/components/wordmark';

export default function LoginPage() {
  const router = useRouter();
  const { requestOtp, verifyOtp } = useAuth();
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const dev = await requestOtp(phone);
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
    setBusy(true);
    try {
      await verifyOtp(phone, code);
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
              {step === 'phone' ? 'Step 1 of 2' : 'Step 2 of 2'}
            </p>
            <h1 className="display text-2xl uppercase">
              {step === 'phone' ? 'Sign in' : 'Check your phone'}
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {step === 'phone'
                ? 'Enter your mobile number — we’ll send a one-time code.'
                : `We sent a 6-digit code to ${phone}.`}
            </p>
          </div>

          {step === 'phone' ? (
            <form onSubmit={handleRequest} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="font-semibold">Mobile number</Label>
                <Input
                  id="phone"
                  inputMode="tel"
                  placeholder="03XX XXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              {error && <p className="text-destructive text-sm font-medium">{error}</p>}
              <Button type="submit" variant="hero" size="lg" className="w-full" disabled={busy}>
                {busy ? 'Sending…' : 'Send code →'}
              </Button>
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
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  autoFocus
                  required
                />
              </div>
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
                  setStep('phone');
                  setCode('');
                  setError(null);
                }}
              >
                ← Use a different number
              </Button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
