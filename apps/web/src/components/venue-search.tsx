'use client';

import { useEffect, useRef, useState } from 'react';
import type { GeocodeResult } from '@jrst/api-client';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * Debounced place search (free Photon/OSM geocoder). Selecting a suggestion
 * hands back name + address + coordinates so the caller can fill the venue
 * fields and drop the map pin. Manual entry / pin-drop still work alongside it.
 */
export default function VenueSearch({
  onSelect,
}: {
  onSelect: (r: GeocodeResult) => void;
}) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Debounced fetch as the user types (min 3 chars). All state changes happen
  // inside the timeout callback (not synchronously in the effect body).
  useEffect(() => {
    const term = q.trim();
    const t = setTimeout(async () => {
      if (term.length < 3) {
        setResults([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const r = await api.geocode(term);
        setResults(r);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  // Close the dropdown on outside click.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const pick = (r: GeocodeResult) => {
    onSelect(r);
    setQ(r.name);
    setOpen(false);
    setResults([]);
  };

  return (
    <div className="space-y-1.5" ref={boxRef}>
      <Label htmlFor="venueSearch">Search for a place</Label>
      <div className="relative">
        <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
          <i className="fa-solid fa-magnifying-glass" />
        </span>
        <Input
          id="venueSearch"
          className="pl-9"
          placeholder="e.g. Kohsar Market, Islamabad"
          value={q}
          autoComplete="off"
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
        />
        {loading && (
          <span className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2 text-sm">
            <i className="fa-solid fa-circle-notch fa-spin" />
          </span>
        )}
        {open && results.length > 0 && (
          <ul className="bg-popover absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border shadow-soft">
            {results.map((r, i) => (
              <li key={`${r.lat},${r.lng},${i}`}>
                <button
                  type="button"
                  onClick={() => pick(r)}
                  className="hover:bg-accent flex w-full items-start gap-2.5 px-3 py-2 text-left text-sm transition-colors"
                >
                  <i className="fa-solid fa-location-dot text-primary mt-0.5" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{r.name}</span>
                    <span className="text-muted-foreground block truncate text-xs">
                      {r.label}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="text-muted-foreground text-xs">
        Pick a result to auto-fill the venue and drop the pin — or set it manually below.
      </p>
    </div>
  );
}
