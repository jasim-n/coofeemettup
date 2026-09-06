import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { ApiError, type TableDto } from '@jrst/api-client';
import { api } from '../api';
import { formatPKR, formatWhen } from '../format';
import {
  CITY_COORDS,
  CITIES,
  formatDistance,
  haversineKm,
  tableCoords,
  type City,
} from '../geo';
import { MUTED, PRIMARY, styles } from '../theme';
import { EmptyState } from '../EmptyState';
import { OptionRow } from '../ui';

type RadiusKm = number | null;

export function NearbyScreen({ onOpenTable }: { onOpenTable: (id: string) => void }) {
  const [tables, setTables] = useState<TableDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [city, setCity] = useState<City>('Islamabad');
  const [radius, setRadius] = useState<RadiusKm>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const center = CITY_COORDS[city];

  const load = useCallback(async () => {
    try {
      setTables(await api.browseTables());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const withDist = useMemo(() => {
    const now = Date.now();
    return tables
      .filter((t) => new Date(t.startAt).getTime() >= now - 60 * 60 * 1000)
      .map((t) => {
        const c = tableCoords(t);
        const km = c ? haversineKm(center.lat, center.lng, c.lat, c.lng) : null;
        return { t, km, coords: c };
      })
      .filter(({ km }) => (radius == null || km == null ? true : km <= radius))
      .sort((a, b) => (a.km ?? 9999) - (b.km ?? 9999));
  }, [tables, center, radius]);

  const selected = withDist.find((x) => x.t.id === selectedId) ?? withDist[0] ?? null;

  return (
    <View style={styles.mapContainer}>
      <View style={[styles.mapHeader, { gap: 8, paddingTop: 8 }]}>
        <Text style={styles.title}>Nearby</Text>
        <OptionRow
          label=""
          value={city}
          options={CITIES.map((c) => ({ value: c, label: c }))}
          onChange={(v) => setCity(v as City)}
        />
        <OptionRow
          label=""
          value={radius == null ? 'any' : String(radius)}
          options={[
            { value: 'any', label: 'Any' },
            { value: '1', label: '1 km' },
            { value: '3', label: '3 km' },
            { value: '5', label: '5 km' },
            { value: '10', label: '10 km' },
          ]}
          onChange={(v) => setRadius(v === 'any' ? null : Number(v))}
        />
      </View>

      {loading ? (
        <ActivityIndicator style={styles.spinner} />
      ) : error ? (
        <Text style={[styles.error, { paddingHorizontal: 20 }]}>{error}</Text>
      ) : (
        <>
          <View style={styles.mapWrap}>
            <MapView
              style={{ flex: 1 }}
              region={{
                latitude: center.lat,
                longitude: center.lng,
                latitudeDelta: 0.18,
                longitudeDelta: 0.18,
              }}
            >
              {withDist.map(({ t, coords }) =>
                coords ? (
                  <Marker
                    key={t.id}
                    coordinate={{ latitude: coords.lat, longitude: coords.lng }}
                    pinColor={selected?.t.id === t.id ? PRIMARY : MUTED}
                    onPress={() => setSelectedId(t.id)}
                  />
                ) : null,
              )}
            </MapView>
          </View>

          <View style={{ maxHeight: 220, borderTopWidth: 1, borderColor: '#EBE0D5' }}>
            <FlatList
              data={withDist.map((x) => x.t)}
              keyExtractor={(t) => t.id}
              contentContainerStyle={{ padding: 12, gap: 8 }}
              ListEmptyComponent={
                <EmptyState icon="map-outline" title="Nothing nearby" body="Try another city or widen the radius." />
              }
              renderItem={({ item: t }) => {
                const row = withDist.find((x) => x.t.id === t.id);
                return (
                  <Pressable
                    style={[styles.card, selected?.t.id === t.id ? styles.cardUnread : null]}
                    onPress={() => {
                      setSelectedId(t.id);
                      onOpenTable(t.id);
                    }}
                  >
                    <Text style={styles.cardTitle}>{t.title ?? t.category}</Text>
                    <Text style={styles.meta}>
                      {formatWhen(t.startAt)}
                      {row?.km != null ? ` · ${formatDistance(row.km)}` : ''}
                    </Text>
                    <Text style={styles.meta}>
                      {t.venueName ?? t.cafe?.name ?? 'Venue'} ·{' '}
                      {t.pricePKR == null ? 'Free' : formatPKR(t.pricePKR)}
                    </Text>
                  </Pressable>
                );
              }}
            />
          </View>
        </>
      )}
    </View>
  );
}
