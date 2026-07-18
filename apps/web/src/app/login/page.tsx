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
    <main className="bg-gradient-hero flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="mb-6 text-center text-white">
        <Wordmark className="text-3xl" />
        <p className="mt-2 text-sm text-white/85">
          Small groups. Real conversations. Good coffee.
        </p>
      </div>
      <div className="w-full max-w-sm space-y-5 rounded-2xl border border-white/20 bg-card p-6 shadow-xl">
        <div className="space-y-1 text-center">
          <h1 className="font-heading text-lg font-bold tracking-tight">
            {step === 'phone' ? 'Sign in' : 'Enter your code'}
          </h1>
          <p className="text-muted-foreground text-sm">
            {step === 'phone'
              ? 'Enter your mobile number to get a code.'
              : `We sent a 6-digit code to ${phone}.`}
          </p>
        </div>

      {step === 'phone' ? (
        <form onSubmit={handleRequest} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="phone">Mobile number</Label>
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
          {error && <p className="text-destructive text-sm">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? 'Sending…' : 'Send code'}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleVerify} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="code">Verification code</Label>
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
            <p className="bg-secondary text-secondary-foreground rounded-md px-3 py-2 text-center text-sm">
              Dev code: <span className="font-mono font-semibold">{devCode}</span>
            </p>
          )}
          {error && <p className="text-destructive text-sm">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? 'Verifying…' : 'Verify & sign in'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => {
              setStep('phone');
              setCode('');
              setError(null);
            }}
          >
            Use a different number
          </Button>
        </form>
      )}
      </div>
    </main>
  );
}
