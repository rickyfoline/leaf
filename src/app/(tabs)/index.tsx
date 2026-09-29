import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Cover, Stars } from '@/components/book';
import { ClubCard } from '@/components/cards';
import { TopBar } from '@/components/top-bar';
import { Button, Empty, Progress, Screen, Section, SectionHead, Tap, styles as ui } from '@/components/ui';
import * as repo from '@/db/repo';
import { percentRead, pagesRead } from '@/lib/stats';
import { useApp, useLive, useWrite } from '@/state/app';
import { useShelf } from '@/state/hooks';
import { colors, fonts } from '@/theme';

const FEATURED = ['sunrise', 'housemaid', 'coraline', 'project', 'circe'];
const CARD_W = 128;
const GAP = 14;

/** Cover carousel: the centered cover is larger, the neighbours shrink and fade. */
function Featured() {
  const router = useRouter();
  const { settings } = useApp();
  const { width } = useWindowDimensions();
  const books = useLive((db) => repo.getBooks(db, FEATURED, settings.country), [settings.country]);
  const x = useState(() => new Animated.Value(0))[0];
  const [index, setIndex] = useState(1);
  // Start with the second cover centered, like the Figma.
  const list = useRef<ScrollView>(null);
  const side = (width - 40 - CARD_W) / 2;
  const step = CARD_W + GAP;
  if (!books) return <View style={{ height: 250 }} />;

  return (
    <View>
      <Animated.ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={step}
        decelerationRate="fast"
        ref={list}
        onLayout={() => list.current?.scrollTo({ x: step, animated: false })}
        contentContainerStyle={{ paddingHorizontal: side, paddingVertical: 12 }}
        style={{ marginHorizontal: -20 }}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x } } }], {
          useNativeDriver: true,
          listener: (e: { nativeEvent: { contentOffset: { x: number } } }) => setIndex(Math.round(e.nativeEvent.contentOffset.x / step)),
        })}
        scrollEventThrottle={16}
        accessibilityLabel="Featured books">
        {books.map((b, i) => {
          const range = [(i - 1) * step, i * step, (i + 1) * step];
          const scale = x.interpolate({ inputRange: range, outputRange: [0.74, 1, 0.74], extrapolate: 'clamp' });
          const opacity = x.interpolate({ inputRange: range, outputRange: [0.75, 1, 0.75], extrapolate: 'clamp' });
          return (
            <Animated.View key={b.id} style={{ width: CARD_W, marginRight: i < books.length - 1 ? GAP : 0, transform: [{ scale }], opacity }}>
              <Tap onPress={() => router.push(`/book/${b.id}`)} accessibilityLabel={b.displayTitle}>
                <Cover book={b} width={CARD_W} height={190} />
              </Tap>
            </Animated.View>
          );
        })}
      </Animated.ScrollView>
      {books[index] ? (
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.flowTitle} numberOfLines={1}>{books[index].displayTitle}</Text>
          <Stars value={books[index].ratingAvg} />
        </View>
      ) : null}
      <View style={styles.dots}>
        {books.map((b, i) => <View key={b.id} style={[styles.dot, i === index && styles.dotOn]} />)}
      </View>
    </View>
  );
}

export default function Home() {
  const router = useRouter();
  const write = useWrite();
  const { toast } = useApp();
  const shelf = useShelf();
  const clubs = useLive((db) => repo.listClubs(db), []);
  const reading = shelf?.filter((s) => s.status === 'reading') ?? [];
  const want = shelf?.filter((s) => s.status === 'want') ?? [];
  const suggestions = clubs?.filter((c) => !c.joined && !c.isMine).slice(0, 3) ?? [];

  return (
    <Screen header={<TopBar left="menu" right="login" />}>
      <Featured />
      <Text style={styles.keepUp}>Keep up with your{'\n'}reading</Text>

      <Section>
        <SectionHead title="Reading Now" action="My shelf" onAction={() => router.navigate('/profile')} />
        {reading.length ? reading.map((s) => (
          <Tap key={s.workId} onPress={() => router.push(`/book/${s.workId}`)} style={styles.readcard} scale={0.98}>
            <Cover book={s.book} size="s" />
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={styles.readTitle}>{s.book.displayTitle}</Text>
              <Text style={ui.muted}>{s.book.author}</Text>
              <Progress pct={percentRead(s)} style={{ marginTop: 8 }} />
              <Text style={[ui.muted, { fontSize: 10.5, marginTop: 4 }]}>
                {s.pages ? `Page ${pagesRead(s)} of ${s.pages} · ${percentRead(s)}%` : `Page ${pagesRead(s)}`}
              </Text>
            </View>
            <View style={styles.bmark} />
          </Tap>
        )) : <Empty>Nothing in progress. Tap the + button to start a book.</Empty>}
        <View style={{ alignItems: 'center', marginTop: 12 }}>
          <Button small variant="ghost" title="Know More" onPress={() => router.navigate('/search')} />
        </View>
      </Section>

      <Section>
        <SectionHead title="Wishreads" right={<Text style={ui.muted}>{want.length} books</Text>} />
        {want.length ? (
          <View style={styles.grid}>
            {want.slice(0, 6).map((s) => (
              <Tap key={s.workId} onPress={() => router.push(`/book/${s.workId}`)} style={styles.gridItem}>
                <Cover book={s.book} width={GRID_W} height={GRID_W * 1.5} />
                <Text numberOfLines={2} style={styles.cap}>{s.book.displayTitle}</Text>
                <Text numberOfLines={1} style={[ui.muted, { fontSize: 10.5 }]}>{s.book.author}</Text>
              </Tap>
            ))}
          </View>
        ) : <Empty>Save books with Want to read and they show up here.</Empty>}
      </Section>

      <Section>
        <SectionHead title="Community" action="See all" onAction={() => router.navigate('/community')} />
        {suggestions.length ? (
          <View style={styles.suggestBox}>
            <Text style={styles.suggestTitle}>You might be interested</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 12 }}>
              {suggestions.map((c) => (
                <ClubCard key={c.id} club={c} onToggle={async () => {
                  const joined = await write((db) => repo.toggleJoin(db, c.id));
                  toast(joined ? `Joined ${c.name}` : 'Left club');
                }} />
              ))}
            </ScrollView>
          </View>
        ) : <Empty>You joined every club. Nice!</Empty>}
      </Section>
    </Screen>
  );
}

const GRID_W = 100;

const styles = StyleSheet.create({
  flowTitle: { fontFamily: fonts.serif, color: colors.heading, fontSize: 15, marginBottom: 4, maxWidth: 260 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.stroke },
  dotOn: { width: 18, backgroundColor: colors.sage },
  keepUp: { fontFamily: fonts.serif, color: colors.sage, fontSize: 17, textAlign: 'center', marginTop: 12 },
  readcard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, backgroundColor: colors.greenBg, marginBottom: 10, borderWidth: 1, borderColor: colors.line },
  readTitle: { fontFamily: fonts.sansSemi, color: colors.ink, fontSize: 13.5 },
  bmark: { width: 12, height: 18, backgroundColor: colors.rose, borderRadius: 2, alignSelf: 'flex-start' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 16 },
  gridItem: { width: GRID_W },
  cap: { fontFamily: fonts.sansSemi, color: colors.ink, fontSize: 11.5, marginTop: 6 },
  suggestBox: { backgroundColor: colors.warm, borderRadius: 18, paddingVertical: 14, borderWidth: 1, borderColor: colors.line },
  suggestTitle: { fontFamily: fonts.serif, color: colors.sage, fontSize: 16, textAlign: 'center', marginBottom: 12 },
});
