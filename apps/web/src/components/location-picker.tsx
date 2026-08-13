'use client';

import { useEffect, useRef, useState } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import MapGL, { Marker, NavigationControl } from 'react-map-gl/maplibre';
import type { MapRef } from 'react-map-gl/maplibre';
import type { MapLayerMouseEvent, StyleSpecification } from 'maplibre-gl';

// Free OpenStreetMap raster tiles — no token / account required.
const OSM_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
};

function validCoord(n: number | undefined): n is number {
  return n != null && Number.isFinite(n);
}

/** Click the map or drag the pin to set venue coordinates. */
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
    lng: pinLng ?? 73.0479,
    lat: pinLat ?? 33.6844,
  }; // Islamabad fallback

  // After venue search (or any lat/lng change): show pin at that point and fly camera there.
  // initialViewState alone only applies on first mount; Marker key remounts the pin on jumps.
  useEffect(() => {
    if (!ready || pinLat == null || pinLng == null) return;
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({
      center: [pinLng, pinLat],
      zoom: 14,
      duration: 500,
    });
  }, [ready, pinLat, pinLng]);

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
          mapStyle={OSM_STYLE}
          style={{ width: '100%', height: '100%' }}
          cursor="crosshair"
          onClick={(e: MapLayerMouseEvent) =>
            onChange(e.lngLat.lat, e.lngLat.lng)
          }
        >
          <NavigationControl position="top-right" showCompass={false} />
          {pinLat != null && pinLng != null && (
            <Marker
              key={`${pinLat.toFixed(6)},${pinLng.toFixed(6)}`}
              longitude={pinLng}
              latitude={pinLat}
              anchor="bottom"
              draggable
              onDragEnd={(e) => onChange(e.lngLat.lat, e.lngLat.lng)}
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
        {pinLat != null && pinLng != null
          ? `Pin at ${pinLat.toFixed(5)}, ${pinLng.toFixed(5)} — tap the map or drag the pin to adjust`
          : 'Search a venue above, or tap the map to drop a pin.'}
      </p>
    </div>
  );
}
