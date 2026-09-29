// Small building blocks shared by every screen.
import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fonts } from '@/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function Icon({ name, size = 22, color = colors.rose }: { name: IconName; size?: number; color?: string }) {
  return <Ionicons name={name} size={size} color={color} />;
}

/** Screen with the cream background, safe areas and a scrolling body. */
export function Screen({ children, header, scroll = true, padBottom = 120 }: { children: ReactNode; header?: ReactNode; scroll?: boolean; padBottom?: number }) {
  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      {header}
      {scroll ? (
        <ScrollView contentContainerStyle={[styles.body, { paddingBottom: padBottom }]} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.body, { flex: 1 }]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Loading() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
      <ActivityIndicator color={colors.sage} />
    </View>
  );
}

/** Pressable that shrinks a little when touched. */
export function Tap({ style, children, scale = 0.96, ...rest }: PressableProps & { style?: StyleProp<ViewStyle>; scale?: number; children?: ReactNode }) {
  const s = useState(() => new Animated.Value(1))[0];
  const to = (v: number) => Animated.spring(s, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  return (
    <Pressable onPressIn={() => to(scale)} onPressOut={() => to(1)} accessibilityRole="button" {...rest}>
      <Animated.View style={[style, { transform: [{ scale: s }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

type ButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: 'sage' | 'ghost' | 'brown' | 'outline';
  small?: boolean;
  block?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  icon?: IconName;
};

export function Button({ title, onPress, variant = 'sage', small, block, disabled, style, icon }: ButtonProps) {
  const bg = { sage: colors.sage, ghost: colors.chip, brown: colors.heading, outline: colors.surface }[variant];
  const fg = variant === 'ghost' ? colors.heading : variant === 'outline' ? colors.heading : '#fff';
  return (
    <Tap
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      style={[
        styles.btn,
        { backgroundColor: bg, opacity: disabled ? 0.5 : 1 },
        variant === 'outline' && { borderWidth: 1, borderColor: colors.stroke },
        small && styles.btnSmall,
        block && { alignSelf: 'stretch' },
        style,
      ]}>
      {icon ? <Icon name={icon} size={small ? 14 : 17} color={fg} /> : null}
      <Text style={[styles.btnText, { color: fg }, small && { fontSize: 12 }]}>{title}</Text>
    </Tap>
  );
}

export function H1({ children, style, center }: { children: ReactNode; style?: StyleProp<TextStyle>; center?: boolean }) {
  return <Text style={[styles.h1, center && { textAlign: 'center' }, style]} accessibilityRole="header">{children}</Text>;
}

export function SectionHead({ title, action, onAction, right, size = 20 }: { title: string; action?: string; onAction?: () => void; right?: ReactNode; size?: number }) {
  return (
    <View style={styles.secHead}>
      <Text style={[styles.h2, { fontSize: size }]} accessibilityRole="header">{title}</Text>
      {right ?? (action ? (
        <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button">
          <Text style={styles.link}>{action}</Text>
        </Pressable>
      ) : null)}
    </View>
  );
}

export const Section = ({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) => <View style={[{ marginTop: 26 }, style]}>{children}</View>;

export function Muted({ children, style, small }: { children: ReactNode; style?: StyleProp<TextStyle>; small?: boolean }) {
  return <Text style={[styles.muted, small && { fontSize: 11.5 }, style]}>{children}</Text>;
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>{children}</Text>
    </View>
  );
}

export function Badge({ label, tone = 'chip' }: { label: string; tone?: 'chip' | 'rose' | 'sage' }) {
  const bg = { chip: colors.chip, rose: '#F3E4E4', sage: '#EEF2E6' }[tone];
  const fg = { chip: colors.heading, rose: '#9C6F6F', sage: colors.sageInk }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: fg }]}>{label}</Text>
    </View>
  );
}

export function PlusBadge({ patron }: { patron?: boolean }) {
  return (
    <View style={[styles.plusBadge, patron && { backgroundColor: colors.heading }]}>
      <Text style={styles.plusBadgeText}>{patron ? 'Patron' : 'Plus'}</Text>
    </View>
  );
}

/** Progress bar that animates to its new value. */
export function Progress({ pct, height = 6, color = colors.sage, style }: { pct: number; height?: number; color?: string; style?: StyleProp<ViewStyle> }) {
  const w = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    Animated.timing(w, { toValue: Math.max(0, Math.min(100, pct)), duration: 500, useNativeDriver: false }).start();
  }, [pct, w]);
  return (
    <View
      style={[{ height, backgroundColor: colors.starOff, borderRadius: height, overflow: 'hidden' }, style]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}>
      <Animated.View style={{ height, backgroundColor: color, borderRadius: height, width: w.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }} />
    </View>
  );
}

export function Input(props: TextInputProps & { label?: string }) {
  const { label, style, ...rest } = props;
  return (
    <View>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput placeholderTextColor={colors.muted} style={[styles.input, style]} accessibilityLabel={label} {...rest} />
    </View>
  );
}

export const Label = ({ children }: { children: ReactNode }) => <Text style={styles.label}>{children}</Text>;

export function Toggle({ label, value, onPress, right }: { label: string; value: boolean; onPress: () => void; right?: ReactNode }) {
  const x = useState(() => new Animated.Value(value ? 1 : 0))[0];
  useEffect(() => {
    Animated.spring(x, { toValue: value ? 1 : 0, useNativeDriver: false, speed: 30, bounciness: 6 }).start();
  }, [value, x]);
  return (
    <Pressable style={styles.toggle} onPress={onPress} accessibilityRole="switch" accessibilityState={{ checked: value }} accessibilityLabel={label}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
        <Text style={{ fontFamily: fonts.sansMedium, color: colors.ink, fontSize: 13.5 }}>{label}</Text>
        {right}
      </View>
      <Animated.View style={[styles.sw, { backgroundColor: x.interpolate({ inputRange: [0, 1], outputRange: [colors.stroke, colors.sage] }) }]}>
        <Animated.View style={[styles.knob, { transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [2, 20] }) }] }]} />
      </Animated.View>
    </Pressable>
  );
}

/** Segmented control. */
export function Segmented<T extends string>({ options, value, onChange }: { options: [T, string][]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={styles.seg} accessibilityRole="tablist">
      {options.map(([k, l]) => (
        <Pressable key={k} onPress={() => onChange(k)} style={[styles.segBtn, value === k && styles.segOn]} accessibilityRole="tab" accessibilityState={{ selected: value === k }}>
          <Text style={[styles.segText, value === k && { color: '#fff' }]}>{l}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function Avatar({ name, color, size = 30 }: { name: string; color: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontFamily: fonts.sansBold, fontSize: size * 0.42 }}>{name.slice(0, 1).toUpperCase()}</Text>
    </View>
  );
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { paddingHorizontal: 20, paddingTop: 8 },
  h1: { fontFamily: fonts.serif, color: colors.heading, fontSize: 24 },
  h2: { fontFamily: fonts.serif, color: colors.heading, fontSize: 20 },
  secHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 },
  link: { color: colors.sageInk, fontFamily: fonts.sansSemi, fontSize: 12.5 },
  muted: { color: colors.muted, fontFamily: fonts.sans, fontSize: 12.5 },
  empty: { padding: 18, borderRadius: 14, backgroundColor: colors.warm2, borderWidth: 1, borderColor: colors.line, borderStyle: 'dashed' },
  emptyText: { color: colors.muted, fontFamily: fonts.sans, fontSize: 13, textAlign: 'center', lineHeight: 19 },
  btn: { flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 13, paddingHorizontal: 18, borderRadius: 24 },
  btnSmall: { paddingVertical: 7, paddingHorizontal: 13 },
  btnText: { fontFamily: fonts.sansSemi, fontSize: 14 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, alignSelf: 'flex-start' },
  badgeText: { fontFamily: fonts.sansSemi, fontSize: 10.5 },
  plusBadge: { backgroundColor: colors.sageInk, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, alignSelf: 'center' },
  plusBadgeText: { color: '#fff', fontFamily: fonts.sansBold, fontSize: 10, letterSpacing: 0.4 },
  label: { fontFamily: fonts.sansSemi, color: colors.heading, fontSize: 12.5, marginTop: 18, marginBottom: 6 },
  input: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.stroke, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontFamily: fonts.sans, fontSize: 14, color: colors.ink,
  },
  toggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderColor: colors.line },
  sw: { width: 44, height: 26, borderRadius: 13, justifyContent: 'center' },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' },
  seg: { flexDirection: 'row', backgroundColor: colors.chip, borderRadius: 14, padding: 3 },
  segBtn: { flex: 1, paddingVertical: 9, borderRadius: 11, alignItems: 'center' },
  segOn: { backgroundColor: colors.heading },
  segText: { fontFamily: fonts.sansSemi, fontSize: 12.5, color: colors.heading },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.line },
});
