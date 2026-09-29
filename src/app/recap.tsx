import { LinearGradient } from 'expo-linear-gradient';
import { Share, StyleSheet, Text, View } from 'react-native';

import { Locked } from '@/components/cards';
import { TopBar } from '@/components/top-bar';
import { Button, H1, Screen } from '@/components/ui';
import { fmt } from '@/lib/format';
import { MONTH_NAMES, readingStats, type ReadingStats } from '@/lib/stats';
import { useApp } from '@/state/app';
import { toStatBooks, useShelf } from '@/state/hooks';
import { fonts, profileThemes } from '@/theme';

function Grid({ st }: { st: ReadingStats }) {
  const cells: [string, string][] = [
    ['Pages', fmt(st.pages)],
    ['Top genre', st.genres[0]?.[0] ?? '—'],
    ['Best month', MONTH_NAMES[st.bestMonth]],
    ['Longest book', st.longest?.title ?? '—'],
    ['Highest rated', st.best?.title ?? '—'],
    ['Favorite author', st.authors[0]?.[0] ?? '—'],
  ];
  return (
    <View style={styles.grid}>
      {cells.map(([l, v]) => (
        <View key={l} style={styles.cell}>
          <Text style={styles.cellLabel}>{l}</Text>
          <Text numberOfLines={2} style={styles.cellValue}>{v}</Text>
        </View>
      ))}
    </View>
  );
}

export default function Recap() {
  const { settings, plus } = useApp();
  const shelf = useShelf();
  const st = readingStats(toStatBooks(shelf ?? []));
  const color = profileThemes[plus ? settings.theme : 'brown'] ?? profileThemes.brown;
  const handle = settings.user?.handle ?? 'guest';

  return (
    <Screen header={<TopBar left="back" right="none" />}>
      <H1 center>Your {st.year} in Books</H1>
      <LinearGradient colors={[color, '#2b2118']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.recap}>
        <Text style={styles.big}>{st.finished}</Text>
        <Text style={styles.sub}>books finished this year · goal {settings.goal}</Text>
        {plus ? <Grid st={st} /> : null}
      </LinearGradient>
      {plus ? (
        <Button block title="Share my recap" style={{ marginTop: 16 }} onPress={() => Share.share({
          message: `My ${st.year} on Leaf: ${st.finished} books, ${fmt(st.pages)} pages${st.genres[0] ? `, mostly ${st.genres[0][0]}` : ''}. leaf.app/@${handle}`,
        })} />
      ) : (
        <View style={{ marginTop: 12 }}>
          <Locked gate="recap" label="Pages, top genre, best month and more">
            <LinearGradient colors={[color, '#2b2118']} style={[styles.recap, { marginTop: 0 }]}><Grid st={st} /></LinearGradient>
          </Locked>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  recap: { marginTop: 16, borderRadius: 22, padding: 22, alignItems: 'center' },
  big: { fontFamily: fonts.serifBold, color: '#fff', fontSize: 64 },
  sub: { fontFamily: fonts.sansMedium, color: '#fff', opacity: 0.85, fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 18, alignSelf: 'stretch' },
  cell: { width: '50%', paddingVertical: 10, paddingRight: 8 },
  cellLabel: { fontFamily: fonts.sans, color: '#fff', opacity: 0.75, fontSize: 11 },
  cellValue: { fontFamily: fonts.serif, color: '#fff', fontSize: 16, marginTop: 2 },
});
