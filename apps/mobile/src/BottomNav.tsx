import { Pressable, Text, View } from 'react-native';
import { styles } from './theme';

export type TabId = 'home' | 'discover' | 'nearby' | 'meetups' | 'chats';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'home', label: 'Home', icon: '⌂' },
  { id: 'discover', label: 'Explore', icon: '◎' },
  { id: 'nearby', label: 'Nearby', icon: '⌖' },
  { id: 'meetups', label: 'Meetups', icon: '☰' },
  { id: 'chats', label: 'Chats', icon: '✉' },
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
  return (
    <View style={styles.tabBar}>
      {TABS.map((t) => {
        const active = tab === t.id;
        return (
          <Pressable key={t.id} style={styles.tabItem} onPress={() => onChange(t.id)}>
            <Text style={[styles.tabIcon, active ? styles.tabIconActive : null]}>{t.icon}</Text>
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
