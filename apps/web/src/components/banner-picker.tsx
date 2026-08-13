'use client';

import { useRef, useState } from 'react';
import { ApiError } from '@jrst/api-client';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/spinner';

const ACCEPT = 'image/jpeg,image/png,image/webp';
const MAX_BYTES = 5 * 1024 * 1024;

/** Optional table banner upload with preview + remove. */
export function BannerPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setError(null);
    if (!file.type.startsWith('image/')) {
      setError('Choose a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('Image must be 5 MB or smaller.');
      return;
    }

    setBusy(true);
    try {
      const { url } = await api.uploadTableCover(file);
      onChange(url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={onFileChange}
      />

      {value ? (
        <div className="relative overflow-hidden rounded-2xl border bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Banner preview"
            className="aspect-[16/7] w-full object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 flex flex-wrap gap-2 bg-gradient-to-t from-black/55 to-transparent p-3">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              {busy ? <Spinner className="size-4" /> : 'Replace'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => onChange(null)}
            >
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="bg-muted/50 hover:bg-muted grid aspect-[16/7] w-full place-items-center rounded-2xl border border-dashed px-4 text-center transition-colors disabled:opacity-60"
        >
          <span className="space-y-1">
            {busy ? (
              <Spinner className="text-primary mx-auto size-6" />
            ) : (
              <i className="fa-solid fa-image text-primary text-xl" />
            )}
            <p className="text-sm font-semibold">
              {busy ? 'Uploading…' : 'Add a banner image'}
            </p>
            <p className="text-muted-foreground text-xs">
              Optional · JPEG, PNG, or WebP · up to 5 MB
            </p>
          </span>
        </button>
      )}

      {error && <p className="text-destructive text-xs">{error}</p>}
      <p className="text-muted-foreground text-xs">
        Shown on cards and the table page. If you skip this, a category cover is used.
      </p>
    </div>
  );
}
