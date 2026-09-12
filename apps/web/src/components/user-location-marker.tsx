'use client';

import { Marker } from 'react-map-gl/maplibre';

/** Standard map "you are here" dot with optional accuracy hint. */
export function UserLocationMarker({
  lat,
  lng,
  accuracyM,
}: {
  lat: number;
  lng: number;
  accuracyM?: number;
}) {
  const coarse = accuracyM != null && accuracyM > 150;

  return (
    <Marker longitude={lng} latitude={lat} anchor="center" style={{ zIndex: 2 }}>
      <span
        className="relative flex size-8 items-center justify-center"
        role="img"
        aria-label={
          accuracyM != null
            ? `Your location (±${Math.round(accuracyM)} metres)`
            : 'Your location'
        }
        title={
          accuracyM != null
            ? `Your location (±${Math.round(accuracyM)} m)`
            : 'Your location'
        }
      >
        {coarse && (
          <span
            className="absolute rounded-full border-2 border-blue-400/50 bg-blue-400/15"
            style={{
              width: Math.min(Math.max(accuracyM / 8, 28), 72),
              height: Math.min(Math.max(accuracyM / 8, 28), 72),
            }}
          />
        )}
        <span className="user-location-pulse absolute inline-flex size-full rounded-full bg-blue-500/35" />
        <span className="relative size-3.5 rounded-full border-[2.5px] border-white bg-blue-500 shadow-md" />
      </span>
    </Marker>
  );
}
