import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { Cover, Stars } from '@/components/book';
import { PageTracker, ReviewCard } from '@/components/cards';
import { TopBar } from '@/components/top-bar';
import { Badge, Button, Empty, Icon, Loading, PlusBadge, Screen, Section, SectionHead, Tap, styles as ui } from '@/components/ui';
import * as repo from '@/db/repo';
import type { ShelfStatus } from '@/db/types';
import { buyLink } from '@/lib/affiliate';
import { fmt, statusLabel } from '@/lib/format';
import { histogram } from '@/lib/stats';
import { useApp, useLive, useWrite } from '@/state/app';
import { colors, fonts } from '@/theme';

const ACTIONS: [ShelfStatus, 'checkmark' | 'flag' | 'list', string][] = [
  ['read', 'checkmark', 'Read'],
  ['want', 'flag', 'Want to read'],
  ['reading', 'list', 'Reading'],
];

export default function BookPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const write = useWrite();
  const { settings, plus, toast } = useApp();
  const data = useLive(async (db) => {
    const book = await repo.getBook(db, id, settings.country);
    if (!book) return null;
    const [entry, reviews, friends, editions, local] = await Promise.all([
      repo.getShelfEntry(db, id),
      repo.reviewsFor(db, id),
      repo.friendsRating(db, id),
      db.getAllAsync<{ n: number }>('SELECT COUNT(*) AS n FROM editions WHERE work_id = ?', [id]),
      repo.localRatings(db, id),
    ]);
    return { book, entry, reviews, friends, editionCount: editions[0]?.n ?? 0, local };
  }, [id, settings.country]);

  const enter = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    Animated.spring(enter, { toValue: 1, useNativeDriver: true, speed: 8, bounciness: 6 }).start();
  }, [enter]);

  if (data === undefined) return <Loading />;
  if (data === null) {
    return (
      <Screen header={<TopBar left="back" right="none" />}>
        <Empty>This book is not in the catalog.</Empty>
      </Screen>
    );
  }
  const { book, entry, reviews, friends, editionCount, local } = data;
  const hist = book.seedHistogram ?? histogram(local);
  const maxH = Math.max(1, ...hist);
  const link = buyLink({ country: settings.country, edition: book.edition, title: book.displayTitle, author: book.author });
  const shelfItem = entry ? { ...entry, book, pages: repo.pagesFor(entry, book) } : null;

  const setStatus = async (s: ShelfStatus) => {
    const r = await write((db) => repo.toggleStatus(db, book.id, s));
    toast(r ? `Marked as ${statusLabel(r)}` : 'Removed from your shelf');
  };

  return (
    <Screen header={<TopBar left="back" right="login" />}>
      <View style={styles.hero}>
        <Animated.View style={{ transform: [{ rotate: enter.interpolate({ inputRange: [0, 1], outputRange: ['-6deg', '0deg'] }) }, { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] }}>
          <Cover book={book} size="l" bookmark={entry?.status === 'want'} />
        </Animated.View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{book.displayTitle}</Text>
          <Text style={styles.author}>{[book.author, book.year].filter(Boolean).join(' · ')}</Text>
          {book.originalTitle && book.originalTitle !== book.displayTitle ? <Text style={[ui.muted, { marginTop: 4, fontStyle: 'italic' }]}>{book.originalTitle}</Text> : null}
          {book.tagline ? <Text style={styles.tagline}>“{book.tagline}”</Text> : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            {book.genres.map((g) => <Badge key={g} label={g} />)}
          </View>
        </View>
      </View>

      <View style={styles.rating}>
        <Text style={styles.big}>{book.ratingAvg != null ? book.ratingAvg.toFixed(1) : '—'}</Text>
        <View>
          <Stars value={book.ratingAvg} size={16} />
          <Text style={[ui.muted, { fontSize: 11, marginTop: 2 }]}>
            {book.ratingCount ? `${fmt(book.ratingCount)} ratings` : 'No ratings yet'}{book.edition?.pageCount ? ` · ${book.edition.pageCount} pages` : ''}
          </Text>
        </View>
      </View>

      {plus ? (
        <View style={styles.plusrow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.plusTitle}>Friends&apos; rating</Text>
            <Text style={ui.muted}>{friends.names.length ? friends.names.join(', ') : 'No friends rated it yet'}</Text>
          </View>
          {friends.avg != null ? (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.big, { fontSize: 20 }]}>{friends.avg.toFixed(1)}</Text>
              <Stars value={friends.avg} />
            </View>
          ) : null}
        </View>
      ) : (
        <Tap style={styles.plusrow} onPress={() => router.push({ pathname: '/plus', params: { from: 'friends' } })} scale={0.98}>
          <View style={{ flex: 1 }}>
            <Text style={styles.plusTitle}>See how your friends rated it</Text>
            <Text style={ui.muted}>{friends.names.length} friend{friends.names.length === 1 ? '' : 's'} read this book</Text>
          </View>
          <PlusBadge />
        </Tap>
      )}

      <View style={styles.actions}>
        {ACTIONS.map(([s, icon, label]) => {
          const on = entry?.status === s;
          return (
            <Tap key={s} onPress={() => setStatus(s)} style={[styles.chipbtn, on && styles.chipOn]} accessibilityState={{ selected: on }} accessibilityLabel={label}>
              <Icon name={icon} size={16} color={on ? '#fff' : colors.heading} />
              <Text style={[styles.chipText, on && { color: '#fff' }]}>{label}</Text>
            </Tap>
          );
        })}
      </View>

      {shelfItem?.status === 'reading' ? <View style={{ marginTop: 14 }}><PageTracker item={shelfItem} /></View> : null}

      <View style={styles.buy}>
        <Button icon="cart-outline" variant="brown" title={link.exact ? `Buy on ${link.store.domain}` : `Find on ${link.store.domain}`} onPress={() => Linking.openURL(link.url)} />
        <Text style={[ui.muted, { fontSize: 10.5, marginTop: 8, textAlign: 'center' }]}>
          {book.edition ? `${book.edition.title}${book.edition.publisher ? ` · ${book.edition.publisher}` : ''}${book.edition.isbn13 ? ` · ISBN ${book.edition.isbn13}` : ''}` : ''}
          {editionCount > 1 ? ` · ${editionCount} editions` : ''}
        </Text>
        {link.store.tag ? <Text style={[ui.muted, { fontSize: 10.5, marginTop: 2, textAlign: 'center' }]}>{link.store.disclosure}</Text> : null}
      </View>

      <Section style={{ marginTop: 22 }}>
        <Text style={[styles.h3]}>Synopsis:</Text>
        <View style={styles.syn}>
          <Text style={styles.synText}>{book.synopsis ?? 'No synopsis yet. It will come from the catalog service when Leaf goes online.'}</Text>
        </View>
      </Section>

      <Section>
        <SectionHead title="Ratings" size={17} action="Rate this book" onAction={() => router.push({ pathname: '/add', params: { id: book.id } })} />
        {hist.some((v) => v > 0) ? (
          <View style={[ui.row, { alignItems: 'flex-end' }]}>
            <Text style={{ color: colors.star, fontSize: 11 }}>★</Text>
            <View style={styles.hist} accessibilityLabel="Rating distribution from half a star to five stars">
              {hist.map((v, i) => <View key={i} style={[styles.histBar, { height: `${Math.max(3, (v / maxH) * 100)}%` }, (i === 7 || i === 8) && { backgroundColor: colors.sage }]} />)}
            </View>
            <Text style={{ color: colors.star, fontSize: 11 }}>★★★★★</Text>
          </View>
        ) : <Text style={ui.muted}>Be the first to rate it.</Text>}
        {entry?.rating ? (
          <View style={[ui.row, { marginTop: 8, gap: 6 }]}>
            <Text style={ui.muted}>You rated it</Text>
            <Stars value={entry.rating} />
          </View>
        ) : null}
      </Section>

      <Section>
        <SectionHead title="Popular Reviews" size={17} right={<Text style={ui.muted}>{reviews.length}</Text>} />
        {reviews.length ? reviews.map((r, i) => <ReviewCard key={r.id} review={r} alt={i % 2 === 1} name={settings.user?.name} />)
          : <Empty>No reviews yet. Be the first to share what you thought.</Empty>}
      </Section>
      <Button block title="Write a Review" style={{ marginTop: 18 }} onPress={() => router.push({ pathname: '/add', params: { id: book.id } })} />
      <Pressable onPress={() => router.navigate('/community')} style={{ alignSelf: 'center', marginTop: 14 }} hitSlop={8}>
        <Text style={ui.link}>Discuss it in a club</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', gap: 16, marginTop: 8 },
  title: { fontFamily: fonts.serifBold, color: colors.heading, fontSize: 24 },
  author: { fontFamily: fonts.sansMedium, color: colors.secondary, fontSize: 13, marginTop: 4 },
  tagline: { fontFamily: fonts.sansSemi, color: colors.ink, fontSize: 12, marginTop: 10, lineHeight: 17 },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18 },
  big: { fontFamily: fonts.serifBold, color: colors.heading, fontSize: 34 },
  plusrow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, padding: 14, borderRadius: 14, backgroundColor: colors.greenBg, borderWidth: 1, borderColor: colors.line },
  plusTitle: { fontFamily: fonts.sansSemi, color: colors.ink, fontSize: 13 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  chipbtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 20, backgroundColor: colors.chip },
  chipOn: { backgroundColor: colors.sage },
  chipText: { fontFamily: fonts.sansSemi, color: colors.heading, fontSize: 12 },
  buy: { marginTop: 16, padding: 14, borderRadius: 16, backgroundColor: colors.warm2, borderWidth: 1, borderColor: colors.line },
  h3: { fontFamily: fonts.serif, color: colors.heading, fontSize: 17, marginBottom: 10 },
  syn: { backgroundColor: colors.warm, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.stroke },
  synText: { fontFamily: fonts.sans, color: colors.body, fontSize: 13, lineHeight: 20 },
  hist: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', height: 70, gap: 4, marginHorizontal: 8 },
  histBar: { flex: 1, backgroundColor: colors.rose, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
});
