import { type ComponentProps, type ReactNode } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { styles } from './theme';

export function ScreenHeader({
  title,
  onBack,
  right,
}: {
  title: string;
  onBack?: () => void;
  right?: ReactNode;
}) {
  return (
    <View style={styles.headerInPad}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.rowGap}>
        {right}
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={8}>
            <Text style={styles.link}>Back</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function Field({
  label,
  ...props
}: { label: string } & ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.fieldGap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput style={styles.input} {...props} />
    </View>
  );
}

export function OptionRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.fieldGap}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <View style={styles.pillRow}>
        {options.map((o) => (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[styles.pill, value === o.value ? styles.pillActive : null]}
          >
            <Text style={value === o.value ? styles.pillTextActive : styles.pillText}>{o.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function NumberRow({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const nums: number[] = [];
  for (let i = min; i <= max; i++) nums.push(i);
  return (
    <View style={styles.fieldGap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.pillRow}>
        {nums.map((n) => (
          <Pressable
            key={n}
            onPress={() => onChange(n)}
            style={[styles.pill, value === n ? styles.pillActive : null]}
          >
            <Text style={value === n ? styles.pillTextActive : styles.pillText}>{n}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Pressable style={styles.toggleRow} onPress={() => onChange(!value)}>
      <View style={[styles.checkbox, value ? styles.checkboxOn : null]}>
        {value ? <Text style={styles.checkMark}>✓</Text> : null}
      </View>
      <Text style={styles.subtitle}>{label}</Text>
    </Pressable>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.button, disabled ? styles.buttonDisabled : null]}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.buttonOutline}>
      <Text style={styles.buttonOutlineText}>{label}</Text>
    </Pressable>
  );
}
