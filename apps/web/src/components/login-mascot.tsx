'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

const QUIPS = [
  'Psst… I saved you a seat.',
  'Headphones on. Circles loading…',
  'Meet. Connect. Waddle in.',
  'No awkward hellos. Promise.',
  'Ready when you are.',
];

/**
 * Playful login mascot. Parent positions it (above form on mobile,
 * left gutter on laptop) so the centered sign-in card does not shift.
 */
export function LoginMascot() {
  const [quipIndex, setQuipIndex] = useState(0);
  const [showQuip, setShowQuip] = useState(false);

  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-only reduced-motion branch
      setShowQuip(true);
      return;
    }

    const enter = window.setTimeout(() => setShowQuip(true), 900);
    const rotate = window.setInterval(() => {
      setQuipIndex((i) => (i + 1) % QUIPS.length);
    }, 4200);

    return () => {
      window.clearTimeout(enter);
      window.clearInterval(rotate);
    };
  }, []);

  return (
    <div className="login-mascot relative flex w-auto flex-col items-center lg:w-52 xl:w-60">
      <div
        className={`login-mascot-bubble mb-2 max-w-[11rem] transition-all duration-500 lg:mb-3 lg:max-w-[14rem] ${
          showQuip ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
        }`}
        aria-live="polite"
      >
        <p className="rounded-2xl rounded-bl-md bg-white/95 px-3 py-2 text-center text-xs font-semibold text-ink shadow-soft lg:text-sm">
          {QUIPS[quipIndex]}
        </p>
      </div>

      <div className="login-mascot-stage relative size-[96px] lg:size-[200px] xl:size-[220px]">
        <div aria-hidden className="login-mascot-glow absolute inset-0 rounded-full" />
        <div className="login-mascot-bob relative size-full">
          <Image
            src="/brand/mascot.png"
            alt=""
            width={220}
            height={220}
            priority
            className="login-mascot-img relative size-full object-contain drop-shadow-lg"
            aria-hidden
          />
        </div>
      </div>
    </div>
  );
}
