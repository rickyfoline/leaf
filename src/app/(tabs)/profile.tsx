import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import { Cover, Stars } from '@/components/book';
import { Locked, PageTracker, StatsBlock } from '@/components/cards';
import { TopBar } from '@/components/top-bar';
import { Avatar, Button, Empty, PlusBadge, Progress, Screen, Section, SectionHead, Tap, styles as ui } from '@/components/ui';
import * as repo from '@/db/repo';
import { fmt, shortDate, statusLabel } from '@/lib/format';
import { FREE_FAVORITES, PLUS_FAVORITES } from '@/lib/plus';
import { pageTotals, readingStats } from '@/lib/stats';
import { useApp, useLive } from '@/state/app';
import { toStatBooks, useShelf } from '@/state/hooks';
import { colors, fonts, profileThemes } from '@/theme';

/** Number that counts up when it changes. */
function CountUp({ value, style }: { value: number; style: object }) {
  const v = useState(() => new Animated.Value(0))[0];
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = v.addListener(({ value: x }) => setShown(Math.round(x)));
    Animated.timing(v, { toValue: value, duration: 900, useNativeDriver: false }).start();
    return () => v.removeListener(id);
  }, [value, v]);
  return <Text style={style} accessibilityLabel={`${fmt(value)} pages`}>{fmt(shown)}</Text>;
}

export default function Profile() {
  const router = useRouter();
  const { settings, plus, updateSettings } = useApp();
  const shelf = useShelf();
  const reviews = useLive((db) => repo.myReviews(db), []);
  if (!shelf) return <Screen header={<TopBar left="menu" right="gear" />}>{null}</Screen>;

  const user = settings.user ?? { name: 'Guest reader', handle: 'guest', email: '' };
  const stats = toStatBooks(shelf);
  const totals = pageTotals(stats);
  const st = readingStats(stats);
  const read = shelf.filter((s) => s.status === 'read');
  const reading = shelf.filter((s) => s.status === 'reading');
  const favorites = shelf.filter((s) => s.favorite);
  const favLimit = plus ? PLUS_FAVORITES : FREE_FAVORITES;
  const goalPct = Math.min(100, Math.round((st.finished / Math.max(1, settings.goal)) * 100));
  const theme = profileThemes[plus ? settings.theme : 'brown'] ?? profileThemes.brown;

  return (
    <Screen header={<TopBar left="menu" right="gear" />}>
      <View style={[ui.row, { gap: 14, alignItems: 'flex-start' }]}>
        <Avatar name={user.name} color={theme} size={68} />
        <View style={{ flex: 1 }}>
          <View style={[ui.row, { gap: 8, flexWrap: 'wrap' }]}>
            <Text style={styles.name}>{user.name}</Text>
            {plus ? <PlusBadge patron={settings.plan === 'patron'} /> : null}
          </View>
          <Text style={{ color: colors.secondary, fontFamily: fonts.sans, fontSize: 12, marginTop: 2 }}>@{user.handle}</Text>
          <Text style={[ui.muted, { marginTop: 6, lineHeight: 17 }]}>{read.length} books read · {reviews?.length ?? 0} reviews</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
        <Button variant="ghost" title="Edit Profile" style={{ flex: 1 }} onPress={() => router.push('/settings')} />
        <Button title="Share" style={{ flex: 1 }} onPress={() => Share.share({ message: `Follow my reading on Leaf: leaf.app/@${user.handle}` })} />
      </View>

      <View style={[styles.pagesHero, { backgroundColor: theme }]} accessibilityLabel="Total pages read">
        <View>
          <CountUp value={totals.total} style={styles.pagesNum} />
          <Text style={styles.pagesLab}>pages read in total</Text>
        </View>
        <Text style={styles.pagesSplit}>{fmt(totals.finished)} from finished books{'\n'}{fmt(totals.current)} from books in progress</Text>
      </View>

      <View style={styles.stats}>
        {[[read.length, 'Books read'], [reading.length, 'Reading now'], [reviews?.length ?? 0, 'Reviews']].map(([n, l]) => (
          <View key={l} style={styles.stat}>
            <Text style={styles.statN}>{n}</Text>
            <Text style={[ui.muted, { fontSize: 11 }]}>{l}</Text>
          </View>
        ))}
      </View>

      <Section>
        <SectionHead title="Reading Now" right={<Text style={ui.muted}>Update your page</Text>} />
        {reading.length ? reading.map((s) => <PageTracker key={s.workId} item={s} compact />) : <Empty>No books in progress. Mark a book as Reading to track your pages.</Empty>}
      </Section>

      <Section>
        <SectionHead title="Reading Stats" right={plus ? <Text style={ui.link} onPress={() => router.push('/recap')}>{st.year} recap</Text> : <PlusBadge />} />
        {plus ? <StatsBlock st={st} pageGoal={settings.pageGoal} showGoal /> : (
          <Locked gate="stats" label="Pages per month, top genres and more">
            <StatsBlock st={st} pageGoal={settings.pageGoal} showGoal={false} />
          </Locked>
        )}
      </Section>

      <Section>
        <SectionHead title="Favorites" right={
          plus ? <Text style={ui.muted}>{Math.min(favorites.length, PLUS_FAVORITES)} of {PLUS_FAVORITES}</Text>
            : favorites.length > FREE_FAVORITES ? <Text style={ui.link} onPress={() => router.push({ pathname: '/plus', params: { from: 'favs' } })}>Show all {favorites.length}</Text>
              : <Text style={ui.muted}>Tap ♥ when adding a book</Text>
        } />
        {favorites.length ? (
          <View style={styles.grid}>
            {favorites.slice(0, favLimit).map((s) => (
              <Tap key={s.workId} onPress={() => router.push(`/book/${s.workId}`)}>
                <Cover book={s.book} width={100} height={150} />
              </Tap>
            ))}
          </View>
        ) : <Empty>No favorites yet.</Empty>}
      </Section>

      <Section>
        <View style={styles.goal}>
          <View style={[ui.row, { justifyContent: 'space-between' }]}>
            <Text style={{ fontFamily: fonts.serif, color: colors.heading, fontSize: 15 }}>{st.year} Reading Goal</Text>
            <Text style={{ fontFamily: fonts.sansSemi, color: colors.sageInk, fontSize: 12.5 }}>{st.finished} / {settings.goal}</Text>
          </View>
          <Progress pct={goalPct} height={8} style={{ marginTop: 10 }} />
          <Text style={[ui.muted, { marginTop: 6, fontSize: 11 }]}>{goalPct}% of your goal. Keep going!</Text>
          <Button small variant="ghost" title={`See your ${st.year} in books`} onPress={() => router.push('/recap')} style={{ marginTop: 12, alignSelf: 'flex-start' }} />
        </View>
      </Section>

      <Section>
        <SectionHead title="Recent Reviews" right={<Text style={ui.muted}>{reviews?.length ?? 0}</Text>} />
        {reviews?.length ? reviews.map((r) => {
          const s = shelf.find((x) => x.workId === r.workId);
          return (
            <Tap key={r.id} onPress={() => router.push(`/book/${r.workId}`)} style={styles.review} scale={0.98}>
              {s ? <Cover book={s.book} size="s" /> : null}
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.sansSemi, color: colors.ink, fontSize: 13.5 }}>{s?.book.displayTitle ?? ''}</Text>
                <View style={[ui.row, { gap: 6, marginTop: 2 }]}>
                  {r.rating ? <Stars value={r.rating} /> : null}
                  <Text style={ui.muted}>{shortDate(r.createdAt)}</Text>
                </View>
                <Text numberOfLines={3} style={{ fontFamily: fonts.sans, color: colors.body, fontSize: 12.5, marginTop: 4, lineHeight: 18 }}>{r.body}</Text>
              </View>
            </Tap>
          );
        }) : <Empty>Your reviews appear here.</Empty>}
      </Section>

      <Section>
        <SectionHead title="Shelf" />
        {(['reading', 'want', 'read'] as const).map((status) => {
          const list = shelf.filter((s) => s.status === status);
          return (
            <View key={status}>
              <Text style={styles.shelfLabel}>{statusLabel(status)} · {list.length}</Text>
              {list.length ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 20 }} style={{ marginHorizontal: -20 }}>
                  {list.map((s) => (
                    <Tap key={s.workId} onPress={() => router.push(`/book/${s.workId}`)}>
                      <Cover book={s.book} size="m" />
                    </Tap>
                  ))}
                </ScrollView>
              ) : <Text style={ui.muted}>Empty</Text>}
            </View>
          );
        })}
      </Section>

      <Button block variant="ghost" title={settings.user ? 'Log out' : 'Log in'} style={{ marginTop: 24 }} onPress={() => updateSettings({ user: null, guest: false })} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  name: { fontFamily: fonts.serif, color: colors.heading, fontSize: 23 },
  pagesHero: { marginTop: 18, borderRadius: 18, padding: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  pagesNum: { fontFamily: fonts.serifBold, color: '#fff', fontSize: 34 },
  pagesLab: { fontFamily: fonts.sansMedium, color: '#fff', opacity: 0.85, fontSize: 12 },
  pagesSplit: { fontFamily: fonts.sans, color: '#fff', opacity: 0.85, fontSize: 11, textAlign: 'right', lineHeight: 16 },
  stats: { flexDirection: 'row', gap: 10, marginTop: 14 },
  stat: { flex: 1, backgroundColor: colors.surface, borderRadius: 14, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.line },
  statN: { fontFamily: fonts.serifBold, color: colors.heading, fontSize: 22 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  goal: { backgroundColor: colors.greenBg, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.line },
  review: { flexDirection: 'row', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.line, alignItems: 'flex-start' },
  shelfLabel: { fontFamily: fonts.sansSemi, color: colors.heading, fontSize: 12.5, marginTop: 12, marginBottom: 8 },
});
