'use client';

import { useEffect, useRef, useState } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import MapGL, { Marker, NavigationControl } from 'react-map-gl/maplibre';
import type { MapRef } from 'react-map-gl/maplibre';
import type { MapLayerMouseEvent } from 'maplibre-gl';
import {
  ISLAMABAD_CENTER,
  MAP_STYLE_EN,
  PAKISTAN_MAX_BOUNDS,
  isInPakistan,
} from '@/lib/map-style';

function validCoord(n: number | undefined): n is number {
  return n != null && Number.isFinite(n);
}

/** Click the map or drag the pin to set venue coordinates (Pakistan only). */
export default function LocationPicker({
  lat,
  lng,
  onChange,
}: {
  lat?: number;
  lng?: number;
  onChange: (lat: number, lng: number) => void;
}) {
  const mapRef = useRef<MapRef | null>(null);
  const [ready, setReady] = useState(false);
  const hasPin = validCoord(lat) && validCoord(lng);
  const pinLat = hasPin ? lat : undefined;
  const pinLng = hasPin ? lng : undefined;
  const center = {
    lng: pinLng ?? ISLAMABAD_CENTER.lng,
    lat: pinLat ?? ISLAMABAD_CENTER.lat,
  };

  useEffect(() => {
    if (!ready || pinLat == null || pinLng == null) return;
    if (!isInPakistan(pinLat, pinLng)) return;
    mapRef.current?.flyTo({
      center: [pinLng, pinLat],
      zoom: 14,
      duration: 500,
    });
  }, [ready, pinLat, pinLng]);

  function setPin(nextLat: number, nextLng: number) {
    if (!isInPakistan(nextLat, nextLng)) return;
    onChange(nextLat, nextLng);
  }

  return (
    <div id="venue-location-picker" className="overflow-hidden rounded-2xl border">
      <div className="h-56 w-full">
        <MapGL
          ref={mapRef}
          onLoad={() => setReady(true)}
          initialViewState={{
            longitude: center.lng,
            latitude: center.lat,
            zoom: hasPin ? 14 : 11,
          }}
          maxBounds={PAKISTAN_MAX_BOUNDS}
          minZoom={5}
          mapStyle={MAP_STYLE_EN}
          style={{ width: '100%', height: '100%' }}
          cursor="crosshair"
          onClick={(e: MapLayerMouseEvent) =>
            setPin(e.lngLat.lat, e.lngLat.lng)
          }
        >
          <NavigationControl position="top-right" showCompass={false} />
          {pinLat != null && pinLng != null && isInPakistan(pinLat, pinLng) && (
            <Marker
              key={`${pinLat.toFixed(6)},${pinLng.toFixed(6)}`}
              longitude={pinLng}
              latitude={pinLat}
              anchor="bottom"
              draggable
              onDragEnd={(e) => setPin(e.lngLat.lat, e.lngLat.lng)}
            >
              <span
                className="text-primary pointer-events-none flex flex-col items-center drop-shadow-md"
                aria-label="Selected venue"
              >
                <i className="fa-solid fa-location-dot text-4xl leading-none" />
              </span>
            </Marker>
          )}
        </MapGL>
      </div>
      <p className="text-muted-foreground bg-muted/50 px-3 py-2 text-xs">
        {pinLat != null && pinLng != null && isInPakistan(pinLat, pinLng)
          ? `Pin at ${pinLat.toFixed(5)}, ${pinLng.toFixed(5)} — tap the map or drag the pin to adjust`
          : 'Search a venue in Pakistan, or tap the map to drop a pin.'}
      </p>
    </div>
  );
}
