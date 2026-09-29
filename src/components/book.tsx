// Covers, stars and book rows.
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import type { Book } from '@/db/types';
import { colors, fonts, palettes } from '@/theme';

import { Tap } from './ui';

const SIZES = {
  s: { w: 44, h: 64, t: 7 },
  m: { w: 100, h: 148, t: 14 },
  l: { w: 130, h: 192, t: 20 },
} as const;

type CoverProps = {
  book: Pick<Book, 'displayTitle' | 'author' | 'palette' | 'edition'>;
  size?: keyof typeof SIZES;
  width?: number;
  height?: number;
  bookmark?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** The edition's cover image, drawn over a gradient cover with the title (shown if the image fails). */
export function Cover({ book, size = 'm', width, height, bookmark, style }: CoverProps) {
  const d = SIZES[size];
  const w = width ?? d.w;
  const h = height ?? d.h;
  const [failed, setFailed] = useState(false);
  const uri = book.edition?.coverUrl;
  const small = w < 60;
  return (
    <View style={[styles.cover, { width: w, height: h, borderRadius: small ? 5 : 8 }, style]} accessibilityLabel={`Cover of ${book.displayTitle}`}>
      <LinearGradient colors={palettes[book.palette] ?? palettes.e} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={[StyleSheet.absoluteFill, { padding: small ? 4 : 9, justifyContent: 'space-between' }]}>
        {!small ? <Text numberOfLines={1} style={styles.ca}>{book.author.toUpperCase()}</Text> : <View />}
        <Text numberOfLines={small ? 3 : 4} style={[styles.ct, { fontSize: width ? Math.max(8, w / 7.5) : d.t }]}>{book.displayTitle}</Text>
      </LinearGradient>
      {uri && !failed ? (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} onError={() => setFailed(true)} />
      ) : null}
      {bookmark ? <View style={styles.bm} /> : null}
    </View>
  );
}

/** Read-only stars (rounded to half stars). */
export function Stars({ value, size = 12 }: { value: number | null; size?: number }) {
  const v = Math.round((value ?? 0) * 2) / 2;
  return (
    <View style={{ flexDirection: 'row' }} accessibilityLabel={`${v} of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <View key={n} style={{ width: size * 1.05, height: size * 1.2 }}>
          <Text style={{ position: 'absolute', fontSize: size, color: colors.starOff }}>★</Text>
          {v >= n - 0.5 ? (
            <View style={{ position: 'absolute', overflow: 'hidden', width: v >= n ? '100%' : '50%' }}>
              <Text style={{ fontSize: size, color: colors.star }}>★</Text>
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
}

/** Tap the left half of a star for half a star. Tapping the current value clears it. */
export function StarInput({ value, onChange, size = 34 }: { value: number; onChange: (v: number) => void; size?: number }) {
  const pops = useState(() => [1, 2, 3, 4, 5].map(() => new Animated.Value(1)))[0];
  const pick = (n: number) => {
    const next = value === n ? 0 : n;
    onChange(next);
    pops.forEach((p, i) => {
      if (i < Math.ceil(next)) {
        p.setValue(0.6);
        Animated.spring(p, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 14, delay: i * 40 } as Animated.SpringAnimationConfig).start();
      }
    });
  };
  return (
    <View style={{ flexDirection: 'row' }} accessibilityRole="adjustable" accessibilityLabel="Your rating" accessibilityValue={{ text: `${value} of 5 stars` }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => onChange(Math.max(0, Math.min(5, value + (e.nativeEvent.actionName === 'increment' ? 0.5 : -0.5))))}>
      {[1, 2, 3, 4, 5].map((n, i) => (
        <Animated.View key={n} style={{ width: size, height: size * 1.15, transform: [{ scale: pops[i] }] }}>
          <Text style={{ position: 'absolute', fontSize: size * 0.9, color: colors.starOff }}>★</Text>
          {value >= n - 0.5 ? (
            <View style={{ position: 'absolute', overflow: 'hidden', width: value >= n ? '100%' : '50%' }}>
              <Text style={{ fontSize: size * 0.9, color: colors.star }}>★</Text>
            </View>
          ) : null}
          <View style={StyleSheet.absoluteFill}>
            <View style={{ flexDirection: 'row', flex: 1 }}>
              <Pressable style={{ flex: 1 }} onPress={() => pick(n - 0.5)} accessibilityLabel={`${n - 0.5} stars`} />
              <Pressable style={{ flex: 1 }} onPress={() => pick(n)} accessibilityLabel={`${n} stars`} />
            </View>
          </View>
        </Animated.View>
      ))}
    </View>
  );
}

/** A row with a small cover, title and author. */
export function BookRow({ book, onPress, right, subtitle, children }: { book: Book; onPress?: () => void; right?: React.ReactNode; subtitle?: string; children?: React.ReactNode }) {
  return (
    <Tap onPress={onPress} scale={0.98} style={styles.row} accessibilityLabel={`${book.displayTitle} by ${book.author}`}>
      <Cover book={book} size="s" />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={2} style={styles.rowTitle}>{book.displayTitle}</Text>
        <Text numberOfLines={1} style={styles.rowSub}>{subtitle ?? book.author}</Text>
        {children}
      </View>
      {right}
    </Tap>
  );
}

const styles = StyleSheet.create({
  cover: {
    overflow: 'hidden', backgroundColor: colors.chip,
    shadowColor: '#5a3c28', shadowOpacity: 0.22, shadowRadius: 6, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  ca: { color: '#fff', opacity: 0.85, fontSize: 7.5, letterSpacing: 1, fontFamily: fonts.sansMedium },
  ct: { color: '#fff', fontFamily: fonts.serifBold, lineHeight: undefined },
  bm: { position: 'absolute', top: 0, right: 8, width: 14, height: 22, backgroundColor: colors.rose, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderColor: colors.line },
  rowTitle: { fontFamily: fonts.sansSemi, color: colors.ink, fontSize: 13.5 },
  rowSub: { fontFamily: fonts.sans, color: colors.muted, fontSize: 12, marginTop: 2 },
});
