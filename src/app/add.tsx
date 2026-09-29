import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { BookRow, Cover, StarInput, Stars } from '@/components/book';
import { TopBar } from '@/components/top-bar';
import { Badge, Button, Empty, H1, Icon, Input, Label, Muted, Screen, Segmented, Toggle, styles as ui } from '@/components/ui';
import * as repo from '@/db/repo';
import type { ShelfStatus } from '@/db/types';
import { isIsoDate, rateWord, today } from '@/lib/format';
import { OFFER_AFTER } from '@/lib/plus';
import { isPlus } from '@/lib/settings';
import { useApp, useGate, useLive } from '@/state/app';
import { colors, fonts } from '@/theme';

type Draft = {
  status: ShelfStatus;
  rating: number;
  favorite: boolean;
  startedAt: string;
  finishedAt: string;
  page: string;
  body: string;
  spoiler: boolean;
  share: boolean;
  tags: string[];
};

const EMPTY: Draft = { status: 'read', rating: 0, favorite: false, startedAt: '', finishedAt: today(), page: '', body: '', spoiler: false, share: true, tags: [] };

export default function AddBook() {
  const params = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const gate = useGate();
  const { db, settings, updateSettings, refresh, toast } = useApp();
  const [workId, setWorkId] = useState<string | null>(params.id ?? null);
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [tag, setTag] = useState('');
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  // A barcode scan comes back with a new id.
  const [lastParam, setLastParam] = useState(params.id);
  if (params.id !== lastParam) {
    setLastParam(params.id);
    if (params.id) setWorkId(params.id);
  }

  const book = useLive((d) => (workId ? repo.getBook(d, workId, settings.country) : Promise.resolve(null)), [workId, settings.country]);
  const matches = useLive(async (d) => {
    if (workId) return [];
    if (query.trim()) return (await repo.searchBooks(d, settings.country, { query })).slice(0, 6);
    const chart = await repo.getChart(d, settings.country);
    return chart?.books.slice(0, 4) ?? repo.getBooks(d, ['circe', 'project', 'gone', 'thursday'], settings.country);
  }, [workId, query, settings.country]);

  // Prefill from the shelf and the reader's review when the book is already there.
  useEffect(() => {
    if (!workId) return;
    let alive = true;
    (async () => {
      const [entry, reviews] = await Promise.all([repo.getShelfEntry(db, workId), repo.reviewsFor(db, workId)]);
      const mine = reviews.find((r) => r.user.isMe);
      if (!alive) return;
      setDraft({
        ...EMPTY,
        status: entry?.status ?? 'read',
        rating: entry?.rating ?? mine?.rating ?? 0,
        favorite: entry?.favorite ?? false,
        startedAt: entry?.startedAt ?? '',
        finishedAt: entry?.finishedAt ?? today(),
        page: entry?.currentPage != null ? String(entry.currentPage) : '',
        body: mine?.body ?? '',
        spoiler: mine?.spoiler ?? false,
        tags: entry?.tags.length ? entry.tags : mine?.tags ?? [],
      });
    })();
    return () => {
      alive = false;
    };
  }, [db, workId]);

  const addTag = () => {
    const t = tag.trim().toLowerCase();
    if (t && !draft.tags.includes(t)) set({ tags: [...draft.tags, t] });
    setTag('');
  };

  const save = async () => {
    if (!book) return setError('Pick a book first.');
    if (draft.startedAt && !isIsoDate(draft.startedAt)) return setError('Use the date format YYYY-MM-DD.');
    if (draft.status === 'read' && draft.finishedAt && !isIsoDate(draft.finishedAt)) return setError('Use the date format YYYY-MM-DD.');
    const tags = tag.trim() ? [...draft.tags, tag.trim().toLowerCase()] : draft.tags;
    const entry = await repo.getShelfEntry(db, book.id);
    const pages = repo.pagesFor(entry, book);
    await db.withTransactionAsync(async () => {
      await repo.upsertShelf(db, book.id, {
        status: draft.status,
        editionId: book.edition?.id ?? null,
        rating: draft.status !== 'want' && draft.rating ? draft.rating : null,
        favorite: draft.favorite,
        startedAt: draft.startedAt || null,
        finishedAt: draft.status === 'read' ? draft.finishedAt || today() : null,
        currentPage: draft.status === 'reading' ? Math.max(0, Math.min(pages ?? Infinity, Number(draft.page) || 0)) : draft.status === 'read' ? pages : null,
        tags,
      });
      if (draft.status !== 'want' && draft.body.trim()) {
        await repo.saveMyReview(db, {
          workId: book.id, editionId: book.edition?.id ?? null, rating: draft.rating || null, body: draft.body.trim(), spoiler: draft.spoiler, tags,
          date: draft.status === 'read' ? draft.finishedAt : undefined,
        });
        if (draft.share) await repo.createPost(db, { kind: 'Review', body: draft.body.trim(), workId: book.id, spoiler: draft.spoiler });
      }
    });
    const s = await updateSettings((cur) => ({ logged: cur.logged + 1 }));
    const offer = !isPlus(s) && !s.offerShown && s.logged >= OFFER_AFTER;
    if (offer) await updateSettings({ offerShown: true });
    refresh();
    toast('Saved to your shelf');
    router.back();
    if (offer) setTimeout(() => router.push({ pathname: '/plus', params: { from: 'third' } }), 600);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.bg }}>
      <Screen header={<TopBar left="cancel" right="save" onSave={save} />} padBottom={60}>
        <H1 center style={{ fontSize: 22 }}>{params.id ? 'Rate & Review' : 'Add a Book'}</H1>

        {book ? (
          <View style={styles.sel}>
            <Cover book={book} size="m" />
            <View style={{ flex: 1 }}>
              <Text style={styles.selTitle}>{book.displayTitle}</Text>
              <Text style={{ fontFamily: fonts.sans, color: colors.secondary, fontSize: 12, marginTop: 3 }}>{[book.author, book.year].filter(Boolean).join(' · ')}</Text>
              <Muted style={{ marginTop: 8 }}>{[book.edition?.pageCount ? `${book.edition.pageCount} pages` : null, book.genres.join(', ')].filter(Boolean).join(' · ')}</Muted>
              {book.ratingAvg != null ? (
                <View style={[ui.row, { gap: 6, marginTop: 6 }]}><Stars value={book.ratingAvg} /><Muted>{book.ratingAvg.toFixed(1)} avg</Muted></View>
              ) : null}
              {!params.id ? (
                <Pressable onPress={() => { setWorkId(null); setQuery(''); setDraft(EMPTY); }} hitSlop={8} style={{ marginTop: 10 }}>
                  <Text style={{ color: colors.rose, fontFamily: fonts.sansSemi, fontSize: 12 }}>Change book</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : (
          <>
            <View style={[ui.row, { marginTop: 12 }]}>
              <View style={styles.searchbar}>
                <Icon name="search" size={18} color={colors.muted} />
                <TextInput value={query} onChangeText={setQuery} placeholder="Search by title, author or ISBN" placeholderTextColor={colors.muted}
                  style={styles.searchInput} accessibilityLabel="Find a book to add" autoCorrect={false} />
              </View>
              <Pressable style={styles.scan} onPress={() => gate('barcode') && router.push('/scan')} accessibilityRole="button" accessibilityLabel="Scan barcode">
                <Icon name="barcode-outline" size={22} color="#fff" />
              </Pressable>
            </View>
            {!query.trim() ? <Muted style={{ marginTop: 14, marginBottom: 4 }}>Popular picks</Muted> : null}
            {matches?.length ? matches.map((b) => (
              <BookRow key={b.id} book={b} subtitle={[b.author, b.year].filter(Boolean).join(' · ')} onPress={() => setWorkId(b.id)} />
            )) : query.trim() ? <View style={{ marginTop: 12 }}><Empty>No match for “{query}”.</Empty></View> : null}
          </>
        )}

        <Label>Status</Label>
        <Segmented<ShelfStatus> options={[['want', 'Want to read'], ['reading', 'Reading'], ['read', 'Read']]} value={draft.status} onChange={(s) => set({ status: s })} />

        {draft.status !== 'want' ? (
          <>
            <Label>Your rating</Label>
            <View style={styles.rate}>
              <View style={[ui.row, { gap: 10 }]}>
                <StarInput value={draft.rating} onChange={(r) => set({ rating: r })} />
                <Text style={styles.rateWord}>{draft.rating ? rateWord(draft.rating) : ''}</Text>
              </View>
              <Pressable onPress={() => set({ favorite: !draft.favorite })} accessibilityRole="button" accessibilityState={{ selected: draft.favorite }} accessibilityLabel="Add to favorites" hitSlop={8}>
                <Icon name={draft.favorite ? 'heart' : 'heart-outline'} size={26} color={colors.rose} />
              </Pressable>
            </View>

            {draft.status === 'reading' && book ? (
              <View style={[ui.row, { alignItems: 'flex-end' }]}>
                <View style={{ width: 120 }}>
                  <Input label="Current page" value={draft.page} onChangeText={(t) => set({ page: t.replace(/\D/g, '') })} keyboardType="number-pad" />
                </View>
                {book.edition?.pageCount ? <Muted style={{ marginBottom: 14 }}>of {book.edition.pageCount} pages</Muted> : null}
              </View>
            ) : null}

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}><Input label="Started" value={draft.startedAt} onChangeText={(t) => set({ startedAt: t })} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" /></View>
              {draft.status === 'read' ? (
                <View style={{ flex: 1 }}><Input label="Finished" value={draft.finishedAt} onChangeText={(t) => set({ finishedAt: t })} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" /></View>
              ) : null}
            </View>

            <Input label="Review" value={draft.body} onChangeText={(t) => set({ body: t.slice(0, 2000) })} placeholder="What did you think?" multiline
              style={{ minHeight: 110, textAlignVertical: 'top' }} />
            <Muted small style={{ textAlign: 'right', marginTop: 4 }}>{draft.body.length} / 2000</Muted>
            <Toggle label="Contains spoilers" value={draft.spoiler} onPress={() => set({ spoiler: !draft.spoiler })} />
            <Toggle label="Share to my clubs" value={draft.share} onPress={() => set({ share: !draft.share })} />

            <Label>Tags</Label>
            <View style={styles.tags}>
              {draft.tags.map((t) => (
                <Pressable key={t} onPress={() => set({ tags: draft.tags.filter((x) => x !== t) })} accessibilityLabel={`Remove tag ${t}`}>
                  <Badge label={`${t} ×`} tone="sage" />
                </Pressable>
              ))}
              <TextInput value={tag} onChangeText={setTag} onSubmitEditing={addTag} placeholder="+ Add tag" placeholderTextColor={colors.muted} style={styles.tagInput}
                returnKeyType="done" blurOnSubmit={false} accessibilityLabel="Add a tag" autoCapitalize="none" />
            </View>
          </>
        ) : null}

        {error ? <Text style={{ color: colors.danger, fontFamily: fonts.sansMedium, marginTop: 14 }}>{error}</Text> : null}
        <Button block title="Save to My Shelf" disabled={!book} onPress={save} style={{ marginTop: 24 }} />
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  sel: { flexDirection: 'row', gap: 14, marginTop: 16, padding: 14, borderRadius: 16, backgroundColor: colors.warm2, borderWidth: 1, borderColor: colors.line },
  selTitle: { fontFamily: fonts.serif, color: colors.heading, fontSize: 18 },
  searchbar: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderRadius: 22, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.stroke },
  searchInput: { flex: 1, paddingVertical: 11, fontFamily: fonts.sans, fontSize: 14, color: colors.ink },
  scan: { width: 46, height: 44, borderRadius: 12, backgroundColor: colors.heading, alignItems: 'center', justifyContent: 'center' },
  rate: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rateWord: { fontFamily: fonts.serifItalic, color: colors.sageInk, fontSize: 14 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  tagInput: { minWidth: 110, fontFamily: fonts.sans, fontSize: 12.5, color: colors.ink, paddingVertical: 4 },
});
