import { Image, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { TableDto } from '@jrst/api-client';
import { formatDateTime, formatPKR } from '../format';
import { categoryIcon, splitCategories } from '../lib/category-icon';
import { coverFor } from '../lib/cover';
import { tableCta } from '../lib/table-cta';
import { AMBER, BORDER, CARD, INK, MUTED, PRIMARY, PRIMARY_SOFT } from '../theme';

/**
 * Ported from apps/web/src/components/home-dashboard.tsx `TableCoverCard`.
 */
export function TableCoverCard({
  t,
  viewerId,
  onPress,
}: {
  t: TableDto;
  viewerId?: string | null;
  onPress: () => void;
}) {
  const low = t.seatsLeft > 0 && t.seatsLeft <= 2;
  const cta = tableCta(t, viewerId);
  const cats = splitCategories(t.category).slice(0, 3);
  const hostInitial = (t.host?.username ?? '?').charAt(0).toUpperCase();
  const coverSource = t.imageUrl ? { uri: t.imageUrl } : coverFor(t.category);

  return (
    <Pressable onPress={onPress} style={s.card}>
      <View style={s.coverWrap}>
        <Image source={coverSource} style={s.cover} />
        <View style={s.coverGrad} />
        <View style={s.pills}>
          {cats.map((c) => (
            <View key={c} style={s.pill}>
              <Ionicons name={categoryIcon(c)} size={10} color="#fff" />
              <Text style={s.pillText}>{c}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={s.body}>
        <Text style={s.title}>{t.title ?? t.category}</Text>
        <View style={s.metaRow}>
          <Ionicons name="calendar-outline" size={13} color={MUTED} />
          <Text style={s.meta}>{formatDateTime(t.startAt)}</Text>
        </View>
        <View style={s.metaRow}>
          <Ionicons name="location-outline" size={13} color={MUTED} />
          <Text style={s.meta}>{t.venueName ?? t.cafe?.name ?? 'See map'}</Text>
        </View>
        <View style={s.hostRow}>
          <View style={s.hostAvatar}>
            <Text style={s.hostInitial}>{hostInitial}</Text>
          </View>
          <Text style={s.hostText}>Hosted by @{t.host?.username ?? 'member'}</Text>
        </View>
        <View style={s.footer}>
          <View style={[s.badge, low ? s.badgeWarn : s.badgeMuted]}>
            <Text style={[s.badgeText, low ? s.badgeWarnText : s.badgeMutedText]}>
              {t.seatsLeft > 0 ? `${t.seatsLeft} seats left` : 'Full'}
            </Text>
          </View>
          <Text style={s.price}>{t.pricePKR == null ? 'Free' : formatPKR(t.pricePKR)}</Text>
        </View>
        <View style={[s.cta, cta.primary ? s.ctaPrimary : s.ctaSecondary]}>
          <Text style={[s.ctaText, cta.primary ? s.ctaTextPrimary : s.ctaTextSecondary]}>
            {cta.label}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const s = {
  card: {
    backgroundColor: CARD,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden' as const,
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  coverWrap: { height: 160, position: 'relative' as const },
  cover: { width: '100%' as const, height: '100%' as const },
  coverGrad: {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    bottom: 0,
    height: 64,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  pills: {
    position: 'absolute' as const,
    left: 12,
    top: 12,
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 6,
    maxWidth: '90%' as const,
  },
  pill: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    backgroundColor: 'rgba(15,23,42,0.45)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pillText: { color: '#fff', fontSize: 11, fontFamily: 'Poppins_600SemiBold' },
  body: { padding: 16, gap: 6 },
  title: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: INK, letterSpacing: -0.3 },
  metaRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 },
  meta: { color: MUTED, fontSize: 13, fontFamily: 'Poppins_400Regular', flex: 1 },
  hostRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, marginTop: 4 },
  hostAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: PRIMARY_SOFT,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  hostInitial: { color: PRIMARY, fontSize: 10, fontFamily: 'Poppins_700Bold' },
  hostText: { color: MUTED, fontSize: 12, fontFamily: 'Poppins_400Regular' },
  footer: {
    marginTop: 8,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeMuted: { backgroundColor: PRIMARY_SOFT },
  badgeWarn: { backgroundColor: '#FEF3C7' },
  badgeText: { fontSize: 12, fontFamily: 'Poppins_600SemiBold' },
  badgeMutedText: { color: PRIMARY },
  badgeWarnText: { color: AMBER },
  price: { fontFamily: 'Poppins_800ExtraBold', color: PRIMARY, fontSize: 14 },
  cta: {
    marginTop: 10,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: 'center' as const,
  },
  ctaPrimary: { backgroundColor: PRIMARY },
  ctaSecondary: { backgroundColor: PRIMARY_SOFT },
  ctaText: { fontSize: 14, fontFamily: 'Poppins_600SemiBold' },
  ctaTextPrimary: { color: '#fff' },
  ctaTextSecondary: { color: PRIMARY },
};
