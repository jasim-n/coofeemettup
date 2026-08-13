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

/** Click the map or drag the pin to set venue coordinates. Recenters after search select. */
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
  const hasPin =
    lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng);
  const center = {
    lng: hasPin ? lng : 73.0479,
    lat: hasPin ? lat : 33.6844,
  }; // Islamabad fallback

  // After venue search (or any lat/lng change), fly the camera to the pin.
  // initialViewState alone only applies on first mount.
  useEffect(() => {
    if (!ready || !hasPin || lat == null || lng == null) return;
    mapRef.current?.flyTo({
      center: [lng, lat],
      zoom: 14,
      duration: 500,
    });
  }, [ready, hasPin, lat, lng]);

  return (
    <div className="overflow-hidden rounded-2xl border">
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
          {hasPin && (
            <Marker
              longitude={lng}
              latitude={lat}
              anchor="bottom"
              draggable
              onDragEnd={(e) => onChange(e.lngLat.lat, e.lngLat.lng)}
            >
              <span className="text-3xl drop-shadow">📍</span>
            </Marker>
          )}
        </MapGL>
      </div>
      <p className="text-muted-foreground bg-muted/50 px-3 py-2 text-xs">
        {hasPin
          ? `📍 ${lat.toFixed(5)}, ${lng.toFixed(5)} — tap the map or drag the pin to adjust`
          : 'Search a venue above, or tap the map to drop a pin.'}
      </p>
    </div>
  );
}
