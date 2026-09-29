import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ClubBubble, ClubCard, PostCard } from '@/components/cards';
import { TopBar } from '@/components/top-bar';
import { Empty, H1, Icon, Screen, Section, SectionHead } from '@/components/ui';
import * as repo from '@/db/repo';
import { FREE_CLUBS } from '@/lib/plus';
import { pagesRead } from '@/lib/stats';
import { useApp, useLive, useWrite } from '@/state/app';
import { useShelf } from '@/state/hooks';
import { colors, fonts } from '@/theme';

const TABS: [repo.PostTab, string][] = [['foryou', 'For you'], ['clubs', 'My clubs'], ['buddy', 'Buddy reads']];

export default function Community() {
  const router = useRouter();
  const write = useWrite();
  const { settings, plus, toast } = useApp();
  const [tab, setTab] = useState<repo.PostTab>('foryou');
  const [search, setSearch] = useState('');
  const clubs = useLive((db) => repo.listClubs(db), []);
  const posts = useLive((db) => repo.listPosts(db, settings.country, tab, search), [tab, search, settings.country]);
  const shelf = useShelf();
  const pageOf = new Map(shelf?.map((s) => [s.workId, pagesRead(s)]));

  const q = search.trim().toLowerCase();
  const mine = clubs?.filter((c) => c.joined && (!q || c.name.toLowerCase().includes(q))) ?? [];
  const suggestions = clubs?.filter((c) => !c.joined && (!q || c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q))).slice(0, 4) ?? [];
  const createdCount = clubs?.filter((c) => c.isMine).length ?? 0;

  const clubOptions = (id: string) => {
    const c = clubs?.find((x) => x.id === id);
    if (!c) return;
    Alert.alert(c.name, c.description || undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: c.isMine ? 'Delete club' : 'Leave club',
        style: 'destructive',
        onPress: async () => {
          const r = await write((db) => repo.leaveClub(db, id));
          toast(`${r === 'deleted' ? 'Deleted' : 'Left'} ${c.name}`);
        },
      },
    ]);
  };

  const newClub = () => {
    if (!plus && createdCount >= FREE_CLUBS) router.push({ pathname: '/plus', params: { from: 'clubs' } });
    else router.push('/new-club');
  };

  return (
    <Screen header={<TopBar left="menu" right="bell" />}>
      <H1 center style={{ fontSize: 25 }}>Community</H1>
      <View style={styles.searchbar}>
        <Icon name="search" size={18} color={colors.muted} />
        <TextInput value={search} onChangeText={setSearch} placeholder="Find clubs, readers, discussions…" placeholderTextColor={colors.muted} style={styles.searchInput} accessibilityLabel="Search community" />
      </View>
      <View style={styles.tabs} accessibilityRole="tablist">
        {TABS.map(([k, l]) => (
          <Pressable key={k} onPress={() => setTab(k)} style={[styles.tab, tab === k && styles.tabOn]} accessibilityRole="tab" accessibilityState={{ selected: tab === k }}>
            <Text style={[styles.tabText, tab === k && { color: '#fff' }]}>{l}</Text>
          </Pressable>
        ))}
      </View>

      <Section>
        <SectionHead title="Your Clubs" size={18} action="+ Create a club" onAction={newClub} />
        {mine.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }} style={{ marginHorizontal: -20 }}>
            {mine.map((c) => <ClubBubble key={c.id} club={c} onPress={() => clubOptions(c.id)} />)}
          </ScrollView>
        ) : <Empty>You have not joined any club yet.</Empty>}
      </Section>

      {suggestions.length ? (
        <Section>
          <SectionHead title="You might be interested" size={18} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 20 }} style={{ marginHorizontal: -20 }}>
            {suggestions.map((c) => (
              <ClubCard key={c.id} club={c} onToggle={async () => {
                const joined = await write((db) => repo.toggleJoin(db, c.id));
                toast(joined ? `Joined ${c.name}` : 'Left club');
              }} />
            ))}
          </ScrollView>
        </Section>
      ) : null}

      <Section>
        <SectionHead title="Discussions" size={18} right={<Text style={styles.muted}>Newest</Text>} />
        {posts?.length ? posts.map((p) => <PostCard key={p.id} post={p} pageOfBook={p.book ? pageOf.get(p.book.id) : undefined} />)
          : <Empty>No discussions here yet. Join a club to see its conversations.</Empty>}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchbar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderRadius: 22, paddingHorizontal: 14, marginTop: 14, borderWidth: 1, borderColor: colors.stroke },
  searchInput: { flex: 1, paddingVertical: 11, fontFamily: fonts.sans, fontSize: 14, color: colors.ink },
  tabs: { flexDirection: 'row', gap: 8, marginTop: 14 },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: colors.chip },
  tabOn: { backgroundColor: colors.heading },
  tabText: { fontFamily: fonts.sansSemi, fontSize: 12.5, color: colors.heading },
  muted: { color: colors.muted, fontFamily: fonts.sans, fontSize: 12.5 },
});
