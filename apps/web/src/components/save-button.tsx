'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
export function SaveButton({ tableId, saved, className = '' }: { tableId: string; saved?: boolean; className?: string }) {
  const [on, setOn] = useState(!!saved);
  const [busy, setBusy] = useState(false);
  async function toggle(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    if (busy) return;
    setBusy(true);
    const prev = on; setOn(!prev);
    try { const r = await api.saveTable(tableId); setOn(r.saved); }
    catch { setOn(prev); }
    finally { setBusy(false); }
  }
  return (
    <button type="button" onClick={toggle} disabled={busy} aria-label={on ? 'Unsave' : 'Save'}
      className={`grid size-8 place-items-center rounded-full bg-white/90 text-sm shadow-sm transition-transform hover:scale-110 ${className}`}>
      <i className={`fa-heart ${on ? 'fa-solid text-primary' : 'fa-regular text-foreground/60'}`} />
    </button>
  );
}
