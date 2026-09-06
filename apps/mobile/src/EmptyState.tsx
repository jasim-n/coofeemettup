import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PRIMARY, styles } from './theme';

export function EmptyState({
  icon = 'sparkles-outline',
  title,
  body,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  body?: string;
}) {
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={26} color={PRIMARY} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {body ? <Text style={styles.emptyBody}>{body}</Text> : null}
    </View>
  );
}
