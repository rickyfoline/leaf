// Page tracker, review, post and club cards, Plus lock and stats blocks.
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import * as repo from '@/db/repo';
import type { Club, Post, Review, ShelfBook } from '@/db/types';
import { fmt, timeAgo } from '@/lib/format';
import type { Gate } from '@/lib/plus';
import { MONTH_INITIALS, MONTH_NAMES, pagesRead, percentRead, type ReadingStats } from '@/lib/stats';
import { useApp, useWrite } from '@/state/app';
import { colors, fonts, palettes } from '@/theme';

import { Cover, Stars } from './book';
import { Avatar, Badge, Button, Icon, Progress, Tap, styles as ui } from './ui';

/* ---------------- page tracker ---------------- */

export function PageTracker({ item, compact }: { item: ShelfBook; compact?: boolean }) {
  const write = useWrite();
  const { toast } = useApp();
  const router = useRouter();
  const pages = item.pages;
  const read = pagesRead(item);
  const pct = percentRead(item);
  const [draft, setDraft] = useState(String(read));
  const [totalDraft, setTotalDraft] = useState('');
  const pop = useState(() => new Animated.Value(1))[0];
  const [shown, setShown] = useState(read);
  if (shown !== read) {
    setShown(read);
    setDraft(String(read));
  }

  const setPage = (p: number) => {
    pop.setValue(1.18);
    Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 12 }).start();
    return write((db) => repo.setCurrentPage(db, item.workId, p, pages));
  };

  return (
    <View style={styles.track}>
      {compact ? (
        <Tap onPress={() => router.push(`/book/${item.workId}`)} style={[ui.row, { marginBottom: 10 }]} scale={0.98}>
          <Cover book={item.book} size="s" />
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={{ fontFamily: fonts.sansSemi, color: colors.ink, fontSize: 13.5 }}>{item.book.displayTitle}</Text>
            <Text style={ui.muted}>{item.book.author}</Text>
          </View>
        </Tap>
      ) : null}
      {pages ? (
        <>
          <View style={[ui.row, { justifyContent: 'space-between' }]}>
            <Text style={{ fontFamily: fonts.sansSemi, color: colors.heading, fontSize: 12 }}>Current page</Text>
            <View style={styles.pager}>
              <Pressable style={styles.step} onPress={() => setPage(read - 1)} accessibilityLabel="One page back" hitSlop={4}>
                <Text style={styles.stepText}>−</Text>
              </Pressable>
              <Animated.View style={{ transform: [{ scale: pop }] }}>
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  onEndEditing={() => setPage(Number(draft) || 0)}
                  keyboardType="number-pad"
                  returnKeyType="done"
                  style={styles.pageInput}
                  accessibilityLabel={`Current page of ${item.book.displayTitle}`}
                />
              </Animated.View>
              <Pressable style={styles.step} onPress={() => setPage(read + 1)} accessibilityLabel="One page forward" hitSlop={4}>
                <Text style={styles.stepText}>+</Text>
              </Pressable>
              <Text style={ui.muted}>/ {pages}</Text>
            </View>
          </View>
          <Progress pct={pct} height={8} style={{ marginTop: 10 }} />
          <View style={[ui.row, { justifyContent: 'space-between', marginTop: 6 }]}>
            <Text style={ui.muted}>{pct}% read</Text>
            <Text style={ui.muted}>{pages - read > 0 ? `${fmt(pages - read)} pages left` : 'Last page!'}</Text>
          </View>
          {read >= pages ? (
            <View style={styles.finish}>
              <Text style={{ fontFamily: fonts.sansMedium, color: colors.sageInk, fontSize: 12.5, flex: 1 }}>You reached the last page.</Text>
              <Button small title="Mark as Read" onPress={async () => {
                await write((db) => repo.finishBook(db, item.workId, pages));
                toast(`Finished ${item.book.displayTitle}!`);
              }} />
            </View>
          ) : null}
        </>
      ) : (
        <View>
          <Text style={[ui.muted, { marginBottom: 8 }]}>This edition has no page count yet. How many pages does your copy have?</Text>
          <View style={ui.row}>
            <TextInput value={totalDraft} onChangeText={setTotalDraft} keyboardType="number-pad" placeholder="e.g. 320" placeholderTextColor={colors.muted}
              style={[ui.input, { flex: 1, paddingVertical: 9 }]} accessibilityLabel="Total pages" />
            <Button small title="Save" onPress={() => write((db) => repo.setTotalPages(db, item.workId, Number(totalDraft)))} disabled={!(Number(totalDraft) > 0)} />
          </View>
        </View>
      )}
    </View>
  );
}

/* ---------------- reviews ---------------- */

export function ReviewCard({ review, alt, name }: { review: Review; alt?: boolean; name?: string }) {
  const write = useWrite();
  const [show, setShow] = useState(false);
  const who = review.user.isMe ? name ?? 'You' : review.user.name;
  return (
    <View style={[styles.rcard, alt && { backgroundColor: colors.greenBg }]}>
      <View style={ui.row}>
        <Avatar name={who} color={review.user.isMe ? colors.heading : review.user.color} />
        <View style={{ flex: 1 }}>
          <View style={[ui.row, { gap: 6 }]}>
            <Text style={styles.name}>{who}</Text>
            {review.user.isMe ? <Badge label="You" /> : null}
          </View>
          <View style={[ui.row, { gap: 6, marginTop: 2 }]}>
            {review.rating ? <Stars value={review.rating} size={11} /> : null}
            <Text style={[ui.muted, { fontSize: 10.5 }]}>{timeAgo(review.createdAt)}</Text>
          </View>
        </View>
      </View>
      {review.spoiler && !show ? (
        <Pressable style={styles.spoiler} onPress={() => setShow(true)} accessibilityRole="button">
          <Text style={styles.spoilerText}>This review contains spoilers. Tap to read it.</Text>
        </Pressable>
      ) : (
        <Text style={styles.body}>{review.body}</Text>
      )}
      {review.tags.length ? (
        <View style={styles.tags}>{review.tags.map((t) => <Badge key={t} label={t} tone="sage" />)}</View>
      ) : null}
      <View style={[ui.row, { marginTop: 10 }]}>
        <LikeButton liked={review.liked} count={review.likes} onPress={() => write((db) => repo.toggleLike(db, review.id))} />
      </View>
    </View>
  );
}

export function LikeButton({ liked, count, onPress }: { liked: boolean; count: number; onPress: () => void }) {
  const s = useState(() => new Animated.Value(1))[0];
  return (
    <Pressable
      onPress={() => {
        s.setValue(liked ? 0.8 : 1.4);
        Animated.spring(s, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 14 }).start();
        onPress();
      }}
      style={[ui.row, { gap: 4 }]}
      accessibilityRole="button"
      accessibilityState={{ selected: liked }}
      accessibilityLabel={`Like, ${count} likes`}
      hitSlop={8}>
      <Animated.View style={{ transform: [{ scale: s }] }}>
        <Icon name={liked ? 'heart' : 'heart-outline'} size={17} color={liked ? colors.rose : colors.muted} />
      </Animated.View>
      <Text style={[ui.muted, liked && { color: colors.rose }]}>{fmt(count)}</Text>
    </Pressable>
  );
}

/* ---------------- posts ---------------- */

export function PostCard({ post, pageOfBook }: { post: Post; pageOfBook?: number }) {
  const write = useWrite();
  const router = useRouter();
  const { plus } = useApp();
  const [show, setShow] = useState(false);
  const total = post.poll ? post.poll.reduce((s, o) => s + o.votes, 0) : 0;
  const shieldOpen = plus && post.unlockPage != null && (pageOfBook ?? 0) >= post.unlockPage;
  const hidden = post.spoiler && !show && !shieldOpen;

  return (
    <View style={styles.post}>
      <View style={ui.row}>
        <Avatar name={post.user.name} color={post.user.color} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{post.user.name}</Text>
          <Text style={[ui.muted, { fontSize: 10.5 }]}>{post.club ? `in ${post.club.name}` : post.kind} · {timeAgo(post.createdAt)}</Text>
        </View>
        <Badge label={post.chapterRange ?? post.kind} tone={post.chapterRange ? 'rose' : 'chip'} />
      </View>
      {post.title ? <Text style={styles.postTitle}>{post.title}</Text> : null}
      {post.book ? (
        <Tap onPress={() => router.push(`/book/${post.book!.id}`)} style={styles.bookref} scale={0.98}>
          <Cover book={post.book} size="s" />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.sansSemi, color: colors.ink, fontSize: 12.5 }}>{post.book.displayTitle}</Text>
            <Text style={[ui.muted, { fontSize: 10.5 }]}>{post.book.author} · buddy read</Text>
          </View>
        </Tap>
      ) : null}
      {shieldOpen && post.spoiler ? (
        <Text style={{ color: colors.sageInk, fontSize: 12, marginTop: 8, fontFamily: fonts.sansMedium }}>
          Spoiler shield: shown because you are past page {post.unlockPage}.
        </Text>
      ) : null}
      {hidden ? (
        <Pressable style={styles.spoiler} onPress={() => setShow(true)} accessibilityRole="button">
          <Text style={styles.spoilerText}>
            {plus && post.unlockPage ? `Spoiler shield is on until you reach page ${post.unlockPage}. Tap to read anyway.` : `Spoilers${post.chapterRange ? ` for ${post.chapterRange.toLowerCase()}` : ''}. Tap to read.`}
          </Text>
        </Pressable>
      ) : (
        <Text style={styles.body}>{post.body}</Text>
      )}
      {post.poll ? (
        <View style={{ marginTop: 8, gap: 6 }}>
          {post.poll.map((o) => {
            const pc = total ? Math.round((o.votes / total) * 100) : 0;
            const mine = post.myVote === o.idx;
            return (
              <Pressable key={o.idx} onPress={() => write((db) => repo.vote(db, post.id, o.idx))} style={[styles.opt, mine && { borderColor: colors.sage }]}
                accessibilityRole="button" accessibilityState={{ selected: mine }}>
                {post.myVote != null ? <View style={[styles.optFill, { width: `${pc}%` }]} /> : null}
                <Text style={[styles.optText, mine && { fontFamily: fonts.sansSemi }]}>{o.label}</Text>
                {post.myVote != null ? <Text style={styles.optText}>{pc}%</Text> : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
      <View style={[ui.row, { marginTop: 10, gap: 16 }]}>
        <LikeButton liked={post.liked} count={post.likes} onPress={() => write((db) => repo.toggleLike(db, post.id))} />
        <View style={[ui.row, { gap: 4 }]}>
          <Icon name="chatbubble-outline" size={15} color={colors.muted} />
          <Text style={ui.muted}>{post.replies} replies</Text>
        </View>
        {post.poll ? <Text style={[ui.muted, { marginLeft: 'auto' }]}>{fmt(total)} votes</Text> : null}
      </View>
    </View>
  );
}

/* ---------------- clubs ---------------- */

export function ClubCard({ club, onToggle }: { club: Club; onToggle: () => void }) {
  return (
    <View style={styles.club}>
      <LinearGradient colors={palettes[club.palette] ?? palettes.a} style={styles.clubAv} />
      <Text numberOfLines={1} style={[styles.name, { textAlign: 'center' }]}>{club.name}</Text>
      <Text style={[ui.muted, { fontSize: 10.5 }]}>♥ {club.likes} · {club.members}</Text>
      <Text numberOfLines={3} style={[ui.muted, { fontSize: 11, textAlign: 'center', marginVertical: 6, minHeight: 42 }]}>{club.description}</Text>
      <Button small title={club.joined ? 'Joined' : 'Join'} variant={club.joined ? 'ghost' : 'sage'} onPress={onToggle} />
    </View>
  );
}

export function ClubBubble({ club, onPress }: { club: Club; onPress: () => void }) {
  return (
    <Tap onPress={onPress} style={{ width: 76, alignItems: 'center' }} accessibilityLabel={`${club.name}, tap for options`}>
      <View style={styles.ring}>
        <LinearGradient colors={palettes[club.palette] ?? palettes.a} style={{ flex: 1, borderRadius: 30 }} />
      </View>
      <Text numberOfLines={2} style={{ fontFamily: fonts.sansMedium, fontSize: 11, color: colors.ink, textAlign: 'center', marginTop: 6 }}>
        {club.isPrivate ? '🔒 ' : ''}{club.name}
      </Text>
    </Tap>
  );
}

/* ---------------- Plus lock ---------------- */

/** Shows a faded preview of a Plus feature with an unlock button on top. */
export function Locked({ gate, label, children }: { gate: Gate; label: string; children: ReactNode }) {
  const router = useRouter();
  return (
    <View style={{ borderRadius: 16, overflow: 'hidden' }}>
      <View style={{ opacity: 0.22 }} pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {children}
      </View>
      <View style={styles.unlock}>
        <View style={styles.unlockCard}>
        <Text style={{ fontFamily: fonts.serif, color: colors.heading, fontSize: 16, textAlign: 'center', marginBottom: 10 }}>{label}</Text>
        <Button small title="Unlock with Leaf Plus" onPress={() => router.push({ pathname: '/plus', params: { from: gate } })} />
        </View>
      </View>
    </View>
  );
}

/* ---------------- stats ---------------- */

export function StatsBlock({ st, pageGoal, showGoal }: { st: ReadingStats; pageGoal: number; showGoal: boolean }) {
  const max = Math.max(1, ...st.months);
  const now = new Date().getMonth();
  const gmax = Math.max(1, ...st.genres.map((g) => g[1]));
  return (
    <View style={{ gap: 12 }}>
      <View style={styles.stat}>
        <View style={[ui.row, { justifyContent: 'space-between' }]}>
          <Text style={styles.statTitle}>Pages per month</Text>
          <Text style={ui.muted}>{st.year}</Text>
        </View>
        <View style={styles.bars} accessibilityLabel={`Pages read per month in ${st.year}`}>
          {st.months.map((v, i) => (
            <View key={i} style={{ flex: 1, alignItems: 'center' }}>
              <View style={{ flex: 1, justifyContent: 'flex-end', width: '70%' }}>
                <GrowBar pct={(v / max) * 100} delay={i * 40} color={i === st.bestMonth ? colors.sageInk : colors.sage} />
              </View>
              <Text style={[ui.muted, { fontSize: 9.5, marginTop: 4 }]}>{MONTH_INITIALS[i]}</Text>
            </View>
          ))}
        </View>
        <Text style={[ui.muted, { marginTop: 8 }]}>
          Best month: <Text style={{ color: colors.sageInk, fontFamily: fonts.sansSemi }}>{MONTH_NAMES[st.bestMonth]}</Text> with {fmt(st.months[st.bestMonth])} pages
        </Text>
        {showGoal ? (
          <View style={{ marginTop: 12 }}>
            <View style={[ui.row, { justifyContent: 'space-between' }]}>
              <Text style={{ fontFamily: fonts.sansSemi, color: colors.heading, fontSize: 12 }}>This month&apos;s page goal</Text>
              <Text style={{ fontFamily: fonts.sansSemi, color: colors.sageInk, fontSize: 12 }}>{fmt(st.months[now])} / {fmt(pageGoal)}</Text>
            </View>
            <Progress pct={(st.months[now] / pageGoal) * 100} height={8} style={{ marginTop: 6 }} />
          </View>
        ) : null}
      </View>
      <View style={styles.stat}>
        <Text style={styles.statTitle}>Top genres</Text>
        {st.genres.length ? st.genres.slice(0, 4).map(([g, c]) => (
          <View key={g} style={[ui.row, { marginTop: 8 }]}>
            <Text style={{ width: 86, fontFamily: fonts.sans, fontSize: 12, color: colors.ink }}>{g}</Text>
            <Progress pct={(c / gmax) * 100} style={{ flex: 1 }} />
            <Text style={[ui.muted, { width: 18, textAlign: 'right' }]}>{c}</Text>
          </View>
        )) : <Text style={[ui.muted, { marginTop: 6 }]}>Finish a book to see your genres.</Text>}
      </View>
      <View style={[styles.stat, { flexDirection: 'row', flexWrap: 'wrap' }]}>
        <Kpi n={st.averageLength ? fmt(st.averageLength) : '—'} l="Average book length (pages)" />
        <Kpi n={st.authors[0] ? st.authors[0][0].split(' ').slice(-1)[0] : '—'} l="Most read author" />
        <Kpi n={st.longest?.pages ? fmt(st.longest.pages) : '—'} l={`Longest book${st.longest ? `: ${st.longest.title}` : ''}`} />
        <Kpi n={String(st.finished)} l={`Books finished in ${st.year}`} />
      </View>
    </View>
  );
}

function GrowBar({ pct, delay, color }: { pct: number; delay: number; color: string }) {
  const h = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    Animated.timing(h, { toValue: pct, duration: 600, delay, useNativeDriver: false }).start();
  }, [pct, delay, h]);
  return <Animated.View style={{ backgroundColor: color, borderRadius: 4, minHeight: 3, height: h.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }} />;
}

const Kpi = ({ n, l }: { n: string; l: string }) => (
  <View style={{ width: '50%', paddingVertical: 8, paddingRight: 8 }}>
    <Text numberOfLines={1} style={{ fontFamily: fonts.serif, color: colors.heading, fontSize: 20 }}>{n}</Text>
    <Text style={[ui.muted, { fontSize: 11 }]}>{l}</Text>
  </View>
);

const styles = StyleSheet.create({
  track: { backgroundColor: colors.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.line, marginBottom: 10 },
  pager: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  step: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.chip, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontFamily: fonts.sansBold, color: colors.heading, fontSize: 16 },
  pageInput: { width: 58, textAlign: 'center', fontFamily: fonts.sansSemi, fontSize: 15, color: colors.ink, borderWidth: 1, borderColor: colors.stroke, borderRadius: 10, paddingVertical: 5, backgroundColor: colors.warm2 },
  finish: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, padding: 10, borderRadius: 12, backgroundColor: colors.greenBg },
  rcard: { backgroundColor: colors.warm, borderRadius: 16, padding: 14, marginBottom: 10 },
  name: { fontFamily: fonts.sansSemi, color: colors.ink, fontSize: 13 },
  body: { fontFamily: fonts.sans, color: colors.body, fontSize: 13, lineHeight: 19, marginTop: 10 },
  spoiler: { marginTop: 10, padding: 12, borderRadius: 12, backgroundColor: colors.chip },
  spoilerText: { fontFamily: fonts.sansMedium, color: colors.heading, fontSize: 12.5, textAlign: 'center' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  post: { backgroundColor: colors.surface, borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: colors.line },
  postTitle: { fontFamily: fonts.serif, color: colors.heading, fontSize: 16, marginTop: 10 },
  bookref: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, padding: 8, borderRadius: 12, backgroundColor: colors.warm2 },
  opt: { flexDirection: 'row', justifyContent: 'space-between', padding: 11, borderRadius: 12, borderWidth: 1, borderColor: colors.stroke, overflow: 'hidden' },
  optFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#EEF2E6' },
  optText: { fontFamily: fonts.sans, color: colors.ink, fontSize: 13 },
  club: { width: 150, backgroundColor: colors.surface, borderRadius: 16, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.line },
  clubAv: { width: 56, height: 56, borderRadius: 28, marginBottom: 8 },
  ring: { width: 66, height: 66, borderRadius: 33, padding: 3, borderWidth: 2, borderColor: colors.sage },
  unlock: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', padding: 16 },
  unlockCard: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 18, borderWidth: 1, borderColor: colors.line, ...{ shadowColor: colors.heading, shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 3 } },
  stat: { backgroundColor: colors.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.line },
  statTitle: { fontFamily: fonts.serif, color: colors.heading, fontSize: 15 },
  bars: { flexDirection: 'row', height: 110, marginTop: 12, alignItems: 'stretch' },
});
