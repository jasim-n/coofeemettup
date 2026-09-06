import { type ComponentProps, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  type FeaturedImageDto,
  type NotificationDto,
  type PublicUser,
  type TableDto,
} from '@jrst/api-client';
import { api } from '../api';
import { TableCoverCard } from '../components/TableCoverCard';
import { FeaturedShowcase } from '../components/FeaturedShowcase';
import { ago, formatDateTime } from '../format';
import { categoryIcon, splitCategories } from '../lib/category-icon';
import {
  BORDER,
  CARD,
  INK,
  MUTED,
  PRIMARY,
  PRIMARY_SOFT,
} from '../theme';

const INK_DARK = '#082F32';

/**
 * Ported from apps/web/src/components/home-dashboard.tsx.
 * Mobile layout = main column + stacked rail (web `lg` grid collapses the same way).
 */
export function HomeScreen({
  user,
  onOpenTable,
  onNearby,
  onDiscover,
  onProfile,
  onNotifications,
  onInvite,
}: {
  user: PublicUser;
  onOpenTable: (id: string) => void;
  onNearby: () => void;
  onDiscover: () => void;
  onProfile: () => void;
  onNotifications: () => void;
  onInvite: () => void;
}) {
  const [tables, setTables] = useState<TableDto[]>([]);
  const [joined, setJoined] = useState<TableDto[]>([]);
  const [hosted, setHosted] = useState<TableDto[]>([]);
  const [activity, setActivity] = useState<NotificationDto[]>([]);
  const [featured, setFeatured] = useState<FeaturedImageDto[]>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [t, j, h] = await Promise.all([
          api.browseTables(),
          api.myJoinedTables(),
          api.myHostedTables().catch(() => [] as TableDto[]),
        ]);
        if (!active) return;
        setTables(t);
        setJoined(j);
        setHosted(h);
        setBusy(false);

        const [n, f] = await Promise.all([
          api.notifications().catch(() => ({ items: [] as NotificationDto[], unread: 0 })),
          api.featuredImages().catch(() => [] as FeaturedImageDto[]),
        ]);
        if (!active) return;
        setActivity(n.items.slice(0, 3));
        setFeatured(f);
      } catch {
        if (active) setBusy(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [user.id]);

  const viewerId = user.id;
  const upcoming = tables.slice(0, 6);
  const verified = user.verificationStatus === 'VERIFIED';
  const vibes = [...new Set(tables.flatMap((t) => splitCategories(t.category)))].slice(0, 6);
  const name = user.firstName ?? 'there';
  const now = Date.now();
  const hour = new Date(now).getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const next =
    [
      ...hosted,
      ...joined.filter(
        (t) => t.myRequestStatus === 'APPROVED' || t.myRequestStatus === 'PENDING',
      ),
    ]
      .filter((t) => new Date(t.startAt).getTime() >= now)
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())[0] ?? null;
  const needsName = !user.firstName || !user.lastName;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F8FAFC' }} contentContainerStyle={s.scroll}>
      {needsName ? (
        <Pressable onPress={onProfile} style={s.profileBanner}>
          <Ionicons name="card-outline" size={18} color={PRIMARY} />
          <Text style={s.profileBannerText}>
            Finish your profile — add your name so hosts can prep for your visit. Your name stays
            private; only your @handle is public.
          </Text>
          <Text style={s.profileBannerCta}>Add name →</Text>
        </Pressable>
      ) : null}

      {/* hero band — from home-dashboard.tsx */}
      <View style={s.hero}>
        <ImageBackground
          source={require('../../assets/hero-cafe.jpg')}
          style={s.heroBg}
          imageStyle={{ opacity: 0.35 }}
        >
          <View style={s.heroInner}>
            <Text style={s.heroGreeting}>{greeting}</Text>
            <Text style={s.heroName}>{name}</Text>
            <Text style={s.heroBlurb}>Find meaningful conversations, one coffee at a time.</Text>
            <View style={s.heroActions}>
              <Pressable onPress={onNearby} style={s.heroPrimary}>
                <Text style={s.heroPrimaryText}>Find a Table →</Text>
              </Pressable>
              <Pressable onPress={onDiscover} style={s.heroSecondary}>
                <Text style={s.heroSecondaryText}>Explore tables</Text>
              </Pressable>
            </View>
            <View style={s.heroStats}>
              <HeroStat icon="location" value={String(tables.length)} label="Tables nearby" />
              <HeroStat
                icon="calendar"
                value={next ? (next.title ?? next.category) : 'None yet'}
                label={next ? formatDateTime(next.startAt) : 'Next meetup'}
                onPress={next ? () => onOpenTable(next.id) : undefined}
              />
              <HeroStat icon="star" value={String(user.reliabilityScore)} label="Reliability score" />
            </View>
          </View>
        </ImageBackground>
      </View>

      {featured.length > 0 ? (
        <View style={s.section}>
          <View style={s.sectionHeadRow}>
            <View style={s.momentsIcon}>
              <Ionicons name="film-outline" size={14} color="#fff" />
            </View>
            <Text style={s.eyebrow}>Moments</Text>
          </View>
          <Text style={s.h2}>Featured from the tables</Text>
          <Text style={s.muted}>Photos, reels, and collages curated from real meetups.</Text>
          <FeaturedShowcase slides={featured} onOpenTable={onOpenTable} />
        </View>
      ) : null}

      {busy ? (
        <ActivityIndicator color={PRIMARY} style={{ marginVertical: 12 }} />
      ) : vibes.length > 0 ? (
        <View style={s.section}>
          <Text style={s.h3}>Popular vibes</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.vibeRow}>
            {vibes.map((c, i) => (
              <Pressable
                key={c}
                onPress={onDiscover}
                style={[s.vibePill, i === 0 ? s.vibePillActive : null]}
              >
                <Ionicons name={categoryIcon(c)} size={12} color={i === 0 ? '#fff' : INK} />
                <Text style={[s.vibeText, i === 0 ? s.vibeTextActive : null]}>{c}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <View style={s.section}>
        <View style={s.rowBetween}>
          <Text style={s.h2}>Tables near you</Text>
          <Pressable onPress={onDiscover}>
            <Text style={s.link}>See all →</Text>
          </Pressable>
        </View>
        {busy ? (
          <ActivityIndicator color={PRIMARY} />
        ) : upcoming.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="cafe-outline" size={28} color={MUTED} />
            <Text style={s.muted}>
              No open tables right now — check Discover.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 16 }}>
            {upcoming.map((t) => (
              <TableCoverCard
                key={t.id}
                t={t}
                viewerId={viewerId}
                onPress={() => onOpenTable(t.id)}
              />
            ))}
          </View>
        )}
      </View>

      {/* right rail stacked — same blocks as web aside */}
      <View style={s.railCard}>
        <View style={s.railProfile}>
          <View style={s.railAvatar}>
            <Text style={s.railAvatarText}>{(user.firstName ?? 'Y').charAt(0)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.railName}>{user.firstName ?? 'You'}</Text>
            <Text style={s.muted}>
              ★ <Text style={{ color: INK, fontFamily: 'Poppins_600SemiBold' }}>{user.reliabilityScore}</Text>{' '}
              Reliability
              {verified ? ' · Verified' : ''}
            </Text>
          </View>
        </View>
        <Pressable onPress={onProfile}>
          <Text style={s.link}>View profile →</Text>
        </Pressable>
      </View>

      {next ? (
        <Pressable onPress={() => onOpenTable(next.id)} style={s.railCard}>
          <Text style={s.railLabel}>Upcoming meetup</Text>
          <View style={s.nextRow}>
            <View style={s.nextIcon}>
              <Ionicons name={categoryIcon(next.category)} size={20} color={PRIMARY} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.railName}>{next.title ?? next.category}</Text>
              <Text style={s.muted}>{formatDateTime(next.startAt)}</Text>
              <Text style={s.muted}>{next.venueName ?? next.cafe?.name ?? 'See map'}</Text>
            </View>
            <Text style={s.muted}>→</Text>
          </View>
        </Pressable>
      ) : null}

      <View style={[s.railCard, { backgroundColor: PRIMARY_SOFT, borderColor: 'transparent' }]}>
        <Text style={s.railName}>Invite friends</Text>
        <Text style={s.muted}>Better tables with people you know.</Text>
        <Pressable onPress={onInvite} style={{ marginTop: 8 }}>
          <Text style={[s.link, { fontFamily: 'Poppins_700Bold' }]}>Invite now →</Text>
        </Pressable>
      </View>

      {activity.length > 0 ? (
        <View style={s.railCard}>
          <View style={s.rowBetween}>
            <Text style={s.railName}>Recent activity</Text>
            <Pressable onPress={onNotifications}>
              <Text style={s.linkSmall}>View all</Text>
            </Pressable>
          </View>
          {activity.map((n) => (
            <View key={n.id} style={s.activityRow}>
              <View style={s.activityIcon}>
                <Ionicons name="notifications" size={14} color={PRIMARY} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.activityTitle} numberOfLines={1}>
                  {n.title}
                </Text>
                <Text style={s.muted}>{ago(n.createdAt, now)}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {!verified ? (
        <View style={s.railCard}>
          <Text style={s.railName}>Verify your identity</Text>
          <Text style={s.muted}>Verified members build trust and get into tables faster.</Text>
          <Pressable onPress={onProfile} style={s.verifyBtn}>
            <Text style={s.verifyBtnText}>Verify now</Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

function HeroStat({
  icon,
  value,
  label,
  onPress,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  value: string;
  label: string;
  onPress?: () => void;
}) {
  const inner = (
    <>
      <View style={s.statIcon}>
        <Ionicons name={icon} size={16} color="#fff" />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.statValue} numberOfLines={1}>
          {value}
        </Text>
        <Text style={s.statLabel} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </>
  );
  return onPress ? (
    <Pressable onPress={onPress} style={s.stat}>
      {inner}
    </Pressable>
  ) : (
    <View style={s.stat}>{inner}</View>
  );
}

const s = {
  scroll: { padding: 16, gap: 16, paddingBottom: 28 },
  profileBanner: {
    borderWidth: 1,
    borderColor: `${PRIMARY}66`,
    backgroundColor: PRIMARY_SOFT,
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  profileBannerText: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: INK, lineHeight: 18 },
  profileBannerCta: { fontFamily: 'Poppins_600SemiBold', color: PRIMARY, fontSize: 14 },
  hero: { borderRadius: 24, overflow: 'hidden' as const, backgroundColor: INK_DARK },
  heroBg: { backgroundColor: INK_DARK },
  heroInner: { padding: 20, gap: 8 },
  heroGreeting: { color: 'rgba(255,255,255,0.7)', fontFamily: 'Poppins_500Medium', fontSize: 14 },
  heroName: {
    color: '#fff',
    fontFamily: 'Poppins_800ExtraBold',
    fontSize: 32,
    letterSpacing: -0.5,
  },
  heroBlurb: {
    color: 'rgba(255,255,255,0.7)',
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 280,
  },
  heroActions: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 10, marginTop: 8 },
  heroPrimary: {
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  heroPrimaryText: { color: INK_DARK, fontFamily: 'Poppins_700Bold', fontSize: 14 },
  heroSecondary: {
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  heroSecondaryText: { color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 14 },
  heroStats: {
    marginTop: 12,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    gap: 12,
  },
  stat: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10 },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  statValue: { color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 14 },
  statLabel: { color: 'rgba(255,255,255,0.6)', fontFamily: 'Poppins_400Regular', fontSize: 12 },
  section: { gap: 8 },
  sectionHeadRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 },
  momentsIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: PRIMARY,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  eyebrow: {
    color: PRIMARY,
    fontFamily: 'Poppins_700Bold',
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
  h2: { fontFamily: 'Poppins_700Bold', fontSize: 20, color: INK, letterSpacing: -0.3 },
  h3: { fontFamily: 'Poppins_700Bold', fontSize: 14, color: INK },
  muted: { color: MUTED, fontFamily: 'Poppins_400Regular', fontSize: 13, lineHeight: 18 },
  link: { color: PRIMARY, fontFamily: 'Poppins_600SemiBold', fontSize: 14 },
  linkSmall: { color: PRIMARY, fontFamily: 'Poppins_600SemiBold', fontSize: 12 },
  rowBetween: {
    flexDirection: 'row' as const,
    alignItems: 'baseline' as const,
    justifyContent: 'space-between' as const,
  },
  vibeRow: { gap: 8, paddingVertical: 4 },
  vibePill: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
  },
  vibePillActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  vibeText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: INK },
  vibeTextActive: { color: '#fff' },
  empty: {
    borderWidth: 1,
    borderStyle: 'dashed' as const,
    borderColor: BORDER,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center' as const,
    gap: 8,
  },
  railCard: {
    backgroundColor: CARD,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 20,
    gap: 8,
  },
  railProfile: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 },
  railAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: PRIMARY,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  railAvatarText: { color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 20 },
  railName: { fontFamily: 'Poppins_700Bold', fontSize: 15, color: INK },
  railLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: MUTED, marginBottom: 4 },
  nextRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 },
  nextIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: PRIMARY_SOFT,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  activityRow: { flexDirection: 'row' as const, gap: 12, marginTop: 8 },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: PRIMARY_SOFT,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  activityTitle: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: INK },
  verifyBtn: {
    marginTop: 8,
    alignSelf: 'flex-start' as const,
    backgroundColor: PRIMARY,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  verifyBtnText: { color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 13 },
};
