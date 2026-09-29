import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BookRow, Cover, Stars } from '@/components/book';
import { TopBar } from '@/components/top-bar';
import { Badge, Empty, H1, Icon, PlusBadge, Section, SectionHead, Screen, Tap, styles as ui } from '@/components/ui';
import * as repo from '@/db/repo';
import type { Book } from '@/db/types';
import { storeFor } from '@/lib/affiliate';
import { statusLabel } from '@/lib/format';
import type { SearchFilters } from '@/lib/settings';
import { useApp, useGate, useLive } from '@/state/app';
import { useShelf } from '@/state/hooks';
import { colors, fonts } from '@/theme';

const GENRES: [string, [string, string, string]][] = [
  ['Fantasy', ['#1d1633', '#6b3f7a', '#e7b56b']],
  ['Romance', ['#1a0f14', '#4a1d2e', '#c24a57']],
  ['Literature', ['#1a120c', '#3b2a1f', '#7a5747']],
  ['Thriller', ['#0c0c10', '#2c2c3a', '#5c5270']],
  ['Classic', ['#0e1f18', '#1c3b2f', '#3f6b4b']],
  ['Technology', ['#0a1320', '#12263a', '#28436b']],
  ['Crime', ['#0c0c10', '#1d1d24', '#3a3a44']],
  ['Self-help', ['#2b2118', '#6b5436', '#e0c27a']],
];
const TRENDING = ['sunrise', 'housemaid', 'project', 'coraline', 'circe', 'gone'];
const SCREEN_ADAPTATIONS = ['coraline', 'gone', 'percy', 'hobbit', 'pride', 'sophie', 'charlotte'];
type List = 'top' | 'screen' | 'new';
const LISTS: [List, string][] = [['top', 'Top Rated'], ['screen', 'From Pages to Screen'], ['new', 'Most Anticipated']];

const lengthOk = (b: Book, len: SearchFilters['len']) => {
  const p = b.edition?.pageCount;
  if (!len) return true;
  if (!p) return false;
  return len === 'short' ? p < 300 : len === 'mid' ? p >= 300 && p <= 450 : p > 450;
};

export default function Search() {
  const router = useRouter();
  const gate = useGate();
  const { settings, plus, updateSettings } = useApp();
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState<string | null>(null);
  const [list, setList] = useState<List | null>(null);
  const shelf = useShelf();
  const status = new Map(shelf?.map((s) => [s.workId, s.status]));
  const filters: SearchFilters = plus ? settings.filters : {};
  const hasFilters = !!(filters.len || filters.unread);
  const active = !!(query.trim() || genre || list || hasFilters);

  const results = useLive(async (db) => {
    if (!active) return null;
    let r = await repo.searchBooks(db, settings.country, { query, genre });
    r = r.filter((b) => lengthOk(b, filters.len) && (!filters.unread || status.get(b.id) !== 'read'));
    if (list === 'top') r = r.filter((b) => b.ratingAvg != null).sort((a, b) => (b.ratingAvg ?? 0) - (a.ratingAvg ?? 0));
    if (list === 'new') r = r.filter((b) => b.year != null).sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
    if (list === 'screen') r = r.filter((b) => SCREEN_ADAPTATIONS.includes(b.id));
    return r;
  }, [active, query, genre, list, filters.len, filters.unread, settings.country, shelf]);
  const trending = useLive((db) => repo.getBooks(db, TRENDING, settings.country), [settings.country]);
  const chart = useLive((db) => repo.getChart(db, settings.country), [settings.country]);

  const title = list ? LISTS.find(([k]) => k === list)![1] : genre ?? 'Results';
  const toggleFilter = <K extends keyof SearchFilters>(k: K, v: SearchFilters[K]) => {
    if (!gate('filters')) return;
    updateSettings((s) => {
      const next = { ...s.filters };
      if (next[k] === v) delete next[k];
      else next[k] = v;
      return { filters: next };
    });
  };
  const chip = <K extends keyof SearchFilters>(k: K, v: SearchFilters[K], label: string) => {
    const on = filters[k] === v;
    return (
      <Pressable key={label} onPress={() => toggleFilter(k, v)} style={[styles.fchip, on && styles.fchipOn]} accessibilityRole="button" accessibilityState={{ selected: on }}>
        <Text style={[styles.fchipText, on && { color: '#fff' }]}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <Screen header={<TopBar left="menu" right="login" />}>
      <H1 center>Search</H1>
      <View style={styles.searchbar}>
        <Icon name="search" size={18} color={colors.muted} />
        <TextInput value={query} onChangeText={(t) => { setQuery(t); setList(null); }} placeholder="Find Book, Author, Genre, ISBN…" placeholderTextColor={colors.muted}
          style={styles.searchInput} returnKeyType="search" accessibilityLabel="Search books" autoCorrect={false} />
        {query ? <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityLabel="Clear search"><Icon name="close-circle" size={18} color={colors.muted} /></Pressable> : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, alignItems: 'center' }} style={{ marginTop: 12, marginHorizontal: -20 }}>
        <View style={{ width: 12 }} />
        {!plus ? <PlusBadge /> : null}
        {chip('len', 'short', 'Under 300 pages')}
        {chip('len', 'mid', '300–450 pages')}
        {chip('len', 'long', '450+ pages')}
        {chip('unread', true, 'Not read yet')}
        <View style={{ width: 12 }} />
      </ScrollView>

      {active ? (
        <Section>
          <SectionHead title={title} action="Clear" onAction={() => { setQuery(''); setGenre(null); setList(null); }} />
          {results === undefined ? null : results?.length ? results.map((b) => (
            <BookRow key={b.id} book={b} onPress={() => router.push(`/book/${b.id}`)}
              subtitle={[b.author, b.year].filter(Boolean).join(' · ')}
              right={status.get(b.id) ? <Badge label={statusLabel(status.get(b.id)!)} /> : null}>
              {b.ratingAvg != null ? (
                <View style={[ui.row, { gap: 6, marginTop: 4 }]}>
                  <Stars value={b.ratingAvg} />
                  <Text style={ui.muted}>{b.ratingAvg.toFixed(1)}</Text>
                </View>
              ) : null}
            </BookRow>
          )) : <Empty>{query ? `No books match “${query}”. Try an author or a genre like Fantasy.` : 'No books match these filters.'}</Empty>}
        </Section>
      ) : null}

      <Section>
        <SectionHead title="Genres" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 20 }} style={{ marginHorizontal: -20 }}>
          {GENRES.map(([g, c]) => (
            <Tap key={g} onPress={() => { setGenre(genre === g ? null : g); setList(null); }} accessibilityState={{ selected: genre === g }}>
              <LinearGradient colors={c} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={[styles.genre, genre === g && { borderWidth: 3, borderColor: colors.sage }]}>
                <Text style={styles.genreText}>{g}</Text>
              </LinearGradient>
            </Tap>
          ))}
        </ScrollView>
      </Section>

      {chart?.books.length ? (
        <Section>
          <SectionHead title={`Best sellers in ${storeFor(settings.country).name}`} right={<Text style={ui.muted}>{chart.period}</Text>} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 20 }} style={{ marginHorizontal: -20 }}>
            {chart.books.map((b, i) => (
              <Tap key={b.id} onPress={() => router.push(`/book/${b.id}`)} style={{ width: 100 }}>
                <Cover book={b} size="m" />
                <Text numberOfLines={2} style={styles.cap}><Text style={{ color: colors.sageInk }}>{i + 1}. </Text>{b.displayTitle}</Text>
              </Tap>
            ))}
          </ScrollView>
          {chart.source ? <Text style={[ui.muted, { fontSize: 10.5, marginTop: 6 }]}>Source: {chart.source}</Text> : null}
        </Section>
      ) : null}

      <Section>
        <SectionHead title="Trending" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 20 }} style={{ marginHorizontal: -20 }}>
          {trending?.map((b) => (
            <Tap key={b.id} onPress={() => router.push(`/book/${b.id}`)} style={{ width: 100 }}>
              <Cover book={b} size="m" />
              <Text numberOfLines={2} style={styles.cap}>{b.displayTitle}</Text>
            </Tap>
          ))}
        </ScrollView>
      </Section>

      <Section>
        <SectionHead title="Browse by" />
        {LISTS.map(([k, l]) => (
          <Pressable key={k} style={styles.listrow} onPress={() => { setList(k); setGenre(null); setQuery(''); }} accessibilityRole="button">
            <Text style={styles.listText}>{l}</Text>
            <Icon name="chevron-forward" size={18} color={colors.rose} />
          </Pressable>
        ))}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchbar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderRadius: 22, paddingHorizontal: 14, marginTop: 14, borderWidth: 1, borderColor: colors.stroke },
  searchInput: { flex: 1, paddingVertical: 11, fontFamily: fonts.sans, fontSize: 14, color: colors.ink },
  fchip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: colors.chip },
  fchipOn: { backgroundColor: colors.sageInk },
  fchipText: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.heading },
  genre: { width: 104, height: 128, borderRadius: 14, justifyContent: 'flex-end', padding: 10 },
  genreText: { color: '#fff', fontFamily: fonts.serif, fontSize: 16, textAlign: 'center' },
  cap: { fontFamily: fonts.sansSemi, color: colors.ink, fontSize: 11.5, marginTop: 6 },
  listrow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderColor: colors.line },
  listText: { fontFamily: fonts.sansSemi, color: colors.rose, fontSize: 14 },
});
