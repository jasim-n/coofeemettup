import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MUTED, PRIMARY, styles } from './theme';

export type TabId = 'home' | 'discover' | 'nearby' | 'meetups' | 'chats';

const TABS: { id: TabId; label: string; icon: keyof typeof Ionicons.glyphMap; iconOutline: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'home', label: 'Home', icon: 'home', iconOutline: 'home-outline' },
  { id: 'discover', label: 'Explore', icon: 'search', iconOutline: 'search-outline' },
  { id: 'nearby', label: 'Nearby', icon: 'location', iconOutline: 'location-outline' },
  { id: 'meetups', label: 'Meetups', icon: 'calendar', iconOutline: 'calendar-outline' },
  { id: 'chats', label: 'Chats', icon: 'chatbubble', iconOutline: 'chatbubble-outline' },
];

export function BottomNav({
  tab,
  onChange,
  chatUnread = 0,
}: {
  tab: TabId;
  onChange: (t: TabId) => void;
  chatUnread?: number;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {TABS.map((t) => {
        const active = tab === t.id;
        return (
          <Pressable
            key={t.id}
            style={styles.tabItem}
            onPress={() => onChange(t.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={t.label}
          >
            <Ionicons
              name={active ? t.icon : t.iconOutline}
              size={22}
              color={active ? PRIMARY : MUTED}
            />
            <Text style={[styles.tabLabel, active ? styles.tabLabelActive : null]}>{t.label}</Text>
            {t.id === 'chats' && chatUnread > 0 ? (
              <View style={styles.unreadDot}>
                <Text style={styles.unreadDotText}>{chatUnread > 9 ? '9+' : chatUnread}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
