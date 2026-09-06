import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { ApiError, type TableDto } from '@jrst/api-client';
import { api } from '../api';
import { EmptyState } from '../EmptyState';
import { formatPKR, formatWhen, handleOf } from '../format';
import { CITIES, nearestCity, type City } from '../geo';
import { styles } from '../theme';
import { OptionRow } from '../ui';

const CATEGORIES = [
  'All',
  'Deep talks',
  'Coffee & chill',
  'Networking',
  'Books',
  'Startups',
  'Language exchange',
  'Board games',
];

type WhenFilter = 'anytime' | 'today' | 'week' | 'weekend';

function matchesWhen(t: TableDto, when: WhenFilter): boolean {
  if (when === 'anytime') return true;
  const start = new Date(t.startAt);
  const now = new Date();
  if (when === 'today') {
    return start.toDateString() === now.toDateString();
  }
  if (when === 'week') {
    const end = new Date(now);
    end.setDate(end.getDate() + 7);
    return start >= now && start <= end;
  }
  // weekend: next Sat/Sun window (or this weekend if still ahead)
  const day = start.getDay();
  return (day === 0 || day === 6) && start >= now;
}

function matchesCategory(t: TableDto, cat: string): boolean {
  if (cat === 'All') return true;
  const raw = t.category ?? '';
  return raw.split(',').some((p) => p.trim().toLowerCase() === cat.toLowerCase());
}

export function DiscoverScreen({ onOpenTable }: { onOpenTable: (id: string) => void }) {
  const [tables, setTables] = useState<TableDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState('All');
  const [when, setWhen] = useState<WhenFilter>('anytime');
  const [city, setCity] = useState<City | 'Any'>('Any');

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

  const filtered = useMemo(() => {
    const now = Date.now();
    return tables
      .filter((t) => new Date(t.startAt).getTime() >= now - 60 * 60 * 1000)
      .filter((t) => matchesCategory(t, category))
      .filter((t) => matchesWhen(t, when))
      .filter((t) => (city === 'Any' ? true : nearestCity(t) === city));
  }, [tables, category, when, city]);

  return (
    <View style={styles.flexBare}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Explore</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
        {CATEGORIES.map((c) => (
          <Pressable
            key={c}
            onPress={() => setCategory(c)}
            style={[styles.pill, category === c ? styles.pillActive : null]}
          >
            <Text style={category === c ? styles.pillTextActive : styles.pillText}>{c}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={styles.sectionPad}>
        <OptionRow
          label=""
          value={when}
          options={[
            { value: 'anytime', label: 'Anytime' },
            { value: 'today', label: 'Today' },
            { value: 'week', label: 'This week' },
            { value: 'weekend', label: 'Weekend' },
          ]}
          onChange={(v) => setWhen(v as WhenFilter)}
        />
        <OptionRow
          label=""
          value={city}
          options={[{ value: 'Any', label: 'Any city' }, ...CITIES.map((c) => ({ value: c, label: c }))]}
          onChange={(v) => setCity(v as City | 'Any')}
        />
      </View>
      {loading ? (
        <ActivityIndicator style={styles.spinner} />
      ) : error ? (
        <Text style={[styles.error, { paddingHorizontal: 20 }]}>{error}</Text>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(t) => t.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              icon="filter-outline"
              title="No tables match"
              body="Try another category, city, or time window."
            />
          }
          renderItem={({ item: t }) => (
            <Pressable style={styles.card} onPress={() => onOpenTable(t.id)}>
              <Text style={styles.cardTitle}>{t.title ?? t.category}</Text>
              <Text style={styles.meta}>{formatWhen(t.startAt)}</Text>
              <Text style={styles.meta}>
                {t.venueName ?? t.cafe?.name ?? 'See map'} ·{' '}
                {t.pricePKR == null ? 'Free' : formatPKR(t.pricePKR)} · {t.seatsLeft} left
              </Text>
              <Text style={styles.meta}>Hosted by {handleOf(t.host)}</Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
