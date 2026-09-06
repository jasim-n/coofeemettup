import { type ComponentProps, useEffect, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PublicUser } from '@jrst/api-client';
import { api } from '../api';
import { BORDER, CARD, DESTRUCTIVE, INK, MUTED, PRIMARY } from '../theme';

/**
 * Ported from apps/web/src/components/mobile-top-bar.tsx.
 * Sticky top chrome: wordmark · search · notifications · account menu.
 */
export function MobileTopBar({
  user,
  onLogout,
  onNotifications,
  onProfile,
  onInvites,
  onSearch,
  onHost,
}: {
  user: PublicUser;
  onLogout: () => void;
  onNotifications: () => void;
  onProfile: () => void;
  onInvites: () => void;
  onSearch: (q: string) => void;
  onHost?: () => void;
}) {
  const [unread, setUnread] = useState(0);
  const [q, setQ] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const res = await api.notifications();
        if (active) setUnread(res.unread);
      } catch {
        /* best-effort */
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const name =
    [user.firstName, user.lastName].filter(Boolean).join(' ') ||
    (user.username ? `@${user.username}` : 'Member');
  const initial = name.charAt(0).toUpperCase();

  return (
    <View style={s.header}>
      <Image
        source={require('../../assets/brand/logo.png')}
        style={s.wordmark}
        resizeMode="contain"
        accessibilityLabel="Nine Circles"
      />

      <View style={s.search}>
        <Ionicons name="search" size={14} color={MUTED} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search…"
          placeholderTextColor={MUTED}
          style={s.searchInput}
          returnKeyType="search"
          onSubmitEditing={() => onSearch(q.trim())}
        />
      </View>

      <Pressable
        onPress={onNotifications}
        style={s.iconBtn}
        accessibilityLabel="Notifications"
      >
        <Ionicons name="notifications-outline" size={22} color={INK} />
        {unread > 0 ? (
          <View style={s.badge}>
            <Text style={s.badgeText}>{unread > 9 ? '9+' : unread}</Text>
          </View>
        ) : null}
      </Pressable>

      <Pressable
        onPress={() => setMenuOpen(true)}
        style={s.avatarBtn}
        accessibilityLabel="Account menu"
      >
        {user.photoUrl ? (
          <Image source={{ uri: user.photoUrl }} style={s.avatar} />
        ) : (
          <View style={[s.avatar, s.avatarFallback]}>
            <Text style={s.avatarInitial}>{initial}</Text>
          </View>
        )}
      </Pressable>

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={s.menuBackdrop} onPress={() => setMenuOpen(false)}>
          <View style={s.menu}>
            <View style={s.menuHead}>
              {user.photoUrl ? (
                <Image source={{ uri: user.photoUrl }} style={s.menuAvatar} />
              ) : (
                <View style={[s.menuAvatar, s.avatarFallback]}>
                  <Text style={s.avatarInitial}>{initial}</Text>
                </View>
              )}
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.menuName} numberOfLines={1}>
                  {name}
                </Text>
                <Text style={s.menuHandle} numberOfLines={1}>
                  {user.username ? `@${user.username}` : 'Set your handle'}
                </Text>
              </View>
            </View>
            <View style={s.menuDivider} />
            <MenuItem
              icon="person"
              label="Profile"
              onPress={() => {
                setMenuOpen(false);
                onProfile();
              }}
            />
            <MenuItem
              icon="mail-open"
              label="Invitations"
              onPress={() => {
                setMenuOpen(false);
                onInvites();
              }}
            />
            {user.canHost && onHost ? (
              <MenuItem
                icon="add-circle"
                label="Host a table"
                onPress={() => {
                  setMenuOpen(false);
                  onHost();
                }}
              />
            ) : null}
            <View style={s.menuDivider} />
            <Pressable
              onPress={() => {
                setMenuOpen(false);
                onLogout();
              }}
              style={s.logout}
            >
              <Ionicons name="log-out-outline" size={16} color={DESTRUCTIVE} />
              <Text style={s.logoutText}>Log out</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={s.menuItem}>
      <Ionicons name={icon} size={14} color={INK} style={{ width: 16, textAlign: 'center' }} />
      <Text style={s.menuItemText}>{label}</Text>
    </Pressable>
  );
}

const s = {
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  wordmark: { width: 40, height: 40 },
  search: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    backgroundColor: CARD,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: BORDER,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: INK,
    fontFamily: 'Poppins_400Regular',
    padding: 0,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  badge: {
    position: 'absolute' as const,
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: PRIMARY,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 9, fontFamily: 'Poppins_700Bold' },
  avatarBtn: { padding: 2 },
  avatar: { width: 32, height: 32, borderRadius: 16 },
  avatarFallback: {
    backgroundColor: PRIMARY,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  avatarInitial: { color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 13 },
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.25)',
    justifyContent: 'flex-start' as const,
    alignItems: 'flex-end' as const,
    paddingTop: 56,
    paddingRight: 12,
  },
  menu: {
    width: 256,
    backgroundColor: CARD,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden' as const,
    shadowColor: PRIMARY,
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },
  menuHead: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    padding: 16,
  },
  menuAvatar: { width: 44, height: 44, borderRadius: 22 },
  menuName: { fontFamily: 'Poppins_700Bold', fontSize: 14, color: INK },
  menuHandle: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: MUTED },
  menuDivider: { height: 1, backgroundColor: BORDER },
  menuItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  menuItemText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: INK },
  logout: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  logoutText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: DESTRUCTIVE },
};
