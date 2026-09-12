'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type DeviceLocation = {
  lat: number;
  lng: number;
  /** Horizontal accuracy radius in metres (smaller = better). */
  accuracyM: number;
};

export type DeviceLocationError = 'denied' | 'unavailable';

export const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 20_000,
};

function toDeviceLocation(position: GeolocationPosition): DeviceLocation {
  return {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    accuracyM: position.coords.accuracy,
  };
}

/**
 * Live device location via `watchPosition` (refines after the first coarse fix).
 * Falls back to a one-shot read when watch is unavailable.
 */
export function useDeviceLocation(enabled = true) {
  const [location, setLocation] = useState<DeviceLocation | null>(null);
  const [error, setError] = useState<DeviceLocationError | null>(null);
  const [pending, setPending] = useState(enabled);
  const hasFixRef = useRef(false);

  const applyPosition = useCallback((position: GeolocationPosition) => {
    hasFixRef.current = true;
    setLocation(toDeviceLocation(position));
    setPending(false);
    setError(null);
  }, []);

  const refresh = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError('unavailable');
      setPending(false);
      return;
    }
    setPending(true);
    navigator.geolocation.getCurrentPosition(
      applyPosition,
      (err) => {
        setPending(false);
        if (!hasFixRef.current) {
          setError(err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable');
        }
      },
      GEOLOCATION_OPTIONS,
    );
  }, [applyPosition]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let watchId: number | null = null;

    // Deferred so state updates never run synchronously inside the effect body.
    const start = window.setTimeout(() => {
      if (cancelled) return;
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        setError('unavailable');
        setPending(false);
        return;
      }

      setPending(true);
      watchId = navigator.geolocation.watchPosition(
        applyPosition,
        (err) => {
          if (cancelled) return;
          setPending(false);
          if (!hasFixRef.current) {
            setError(err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable');
          }
        },
        GEOLOCATION_OPTIONS,
      );
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(start);
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
    };
  }, [enabled, applyPosition]);

  return { location, error, pending, refresh };
}
