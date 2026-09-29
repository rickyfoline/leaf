import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import { TopBar } from '@/components/top-bar';
import { Button, H1, Input, Label, Muted, PlusBadge, Screen, Tap, styles as ui } from '@/components/ui';
import { resetMyData } from '@/db/migrate';
import * as repo from '@/db/repo';
import { AMAZON_STORES } from '@/lib/affiliate';
import { parseGoodreads } from '@/lib/csv';
import { PLANS } from '@/lib/plus';
import { handleFromName } from '@/lib/settings';
import { useApp, useGate, useWrite } from '@/state/app';
import { colors, fonts, profileThemes } from '@/theme';

export default function Settings() {
  const router = useRouter();
  const gate = useGate();
  const write = useWrite();
  const { db, settings, plus, updateSettings, toast } = useApp();
  const [name, setName] = useState(settings.user?.name ?? '');
  const [goal, setGoal] = useState(String(settings.goal));
  const [pageGoal, setPageGoal] = useState(String(settings.pageGoal));

  const saveProfile = async () => {
    const n = name.trim();
    if (!settings.user || !n) return;
    await write((d) => repo.setMyName(d, n));
    await updateSettings({ user: { ...settings.user, name: n, handle: handleFromName(n) } });
    toast('Profile updated');
  };

  const saveGoals = async () => {
    const g = parseInt(goal, 10);
    const p = parseInt(pageGoal, 10);
    if (!(g > 0)) return toast('Enter a number above 0');
    await updateSettings({ goal: g, ...(plus && p > 0 ? { pageGoal: p } : {}) });
    toast('Goals updated');
  };

  const importCsv = async () => {
    if (!gate('import')) return;
    const res = await DocumentPicker.getDocumentAsync({ type: ['text/csv', 'text/comma-separated-values', 'text/plain'], copyToCacheDirectory: true });
    if (res.canceled || !res.assets[0]) return;
    try {
      const text = await new File(res.assets[0].uri).text();
      const r = await write((d) => repo.importGoodreads(d, parseGoodreads(text)));
      toast(`Imported ${r.matched} of ${r.total} books`);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not read that file');
    }
  };

  const exportCsv = async () => {
    if (!gate('export')) return;
    const csv = await repo.exportLibraryCsv(db, settings.country);
    await Share.share({ title: 'leaf-library.csv', message: csv });
  };

  const reset = () =>
    Alert.alert('Reset your library?', 'Your shelf, reviews and clubs go back to the example library. Your account and plan stay.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: async () => { await write((d) => resetMyData(d)); toast('Example library restored'); } },
    ]);

  return (
    <Screen header={<TopBar left="back" right="none" />}>
      <H1>Settings</H1>

      <Tap style={styles.plusrow} onPress={() => router.push('/plus')} scale={0.98}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fonts.sansSemi, color: colors.ink, fontSize: 14 }}>{plus ? `You are on ${settings.plan === 'patron' ? 'Patron' : 'Leaf Plus'}` : 'Leaf Plus'}</Text>
          <Muted>{plus ? (settings.trialEnds ? `Free trial until ${settings.trialEnds}` : settings.cycle ? PLANS[settings.cycle].name : '') : 'Stats, custom goals, private clubs and more'}</Muted>
        </View>
        {plus ? <PlusBadge patron={settings.plan === 'patron'} /> : <View style={styles.pill}><Text style={styles.pillText}>See plans</Text></View>}
      </Tap>

      {settings.user ? (
        <>
          <Input label="Name" value={name} onChangeText={setName} autoComplete="name" />
          <Muted small style={{ marginTop: 6 }}>{settings.user.email}</Muted>
          <Button small variant="ghost" title="Save profile" style={{ alignSelf: 'flex-start', marginTop: 10 }} onPress={saveProfile} />
        </>
      ) : null}

      <Label>Store country</Label>
      <Muted small style={{ marginBottom: 8 }}>Picks the edition you see and where the buy button takes you.</Muted>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }} style={{ marginHorizontal: -20 }}>
        {Object.values(AMAZON_STORES).map((s) => {
          const on = settings.country === s.country;
          return (
            <Pressable key={s.country} onPress={() => updateSettings({ country: s.country })} style={[styles.chip, on && styles.chipOn]} accessibilityRole="radio" accessibilityState={{ checked: on }}>
              <Text style={[styles.chipText, on && { color: '#fff' }]}>{s.country} · {s.name}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Input label="Yearly reading goal (books)" value={goal} onChangeText={setGoal} keyboardType="number-pad" />
      <View style={[ui.row, { gap: 6 }]}>
        <Label>Monthly page goal</Label>
        {!plus ? <View style={{ marginTop: 12 }}><PlusBadge /></View> : null}
      </View>
      {plus ? (
        <Input value={pageGoal} onChangeText={setPageGoal} keyboardType="number-pad" accessibilityLabel="Monthly page goal" />
      ) : (
        <Tap style={[styles.plusrow, { marginTop: 0 }]} onPress={() => gate('goals')} scale={0.98}>
          <Text style={{ flex: 1, fontFamily: fonts.sans, color: colors.ink }}>Set a page goal for every month</Text>
          <Text style={ui.link}>Unlock</Text>
        </Tap>
      )}
      <Button block title="Save goals" style={{ marginTop: 16 }} onPress={saveGoals} />

      <View style={[ui.row, { gap: 6 }]}>
        <Label>Profile theme</Label>
        {!plus ? <View style={{ marginTop: 12 }}><PlusBadge /></View> : null}
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {Object.entries(profileThemes).map(([k, c]) => {
          const on = plus && settings.theme === k;
          return (
            <Tap key={k} onPress={() => { if (gate('theme')) { updateSettings({ theme: k }); toast('Theme updated'); } }}
              style={[styles.swatch, { backgroundColor: c }, on && { borderWidth: 3, borderColor: colors.sage }]} accessibilityLabel={`${k} theme`} accessibilityState={{ selected: on }} />
          );
        })}
      </View>

      <View style={[ui.row, { gap: 6 }]}>
        <Label>Your data</Label>
        {!plus ? <View style={{ marginTop: 12 }}><PlusBadge /></View> : null}
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button variant="ghost" title="Import Goodreads" style={{ flex: 1 }} onPress={importCsv} />
        <Button variant="ghost" title="Export CSV" style={{ flex: 1 }} onPress={exportCsv} />
      </View>
      <Muted small style={{ marginTop: 6, lineHeight: 17 }}>Goodreads: My Books › Import and export › Export library, then pick that CSV here.</Muted>

      <Button block variant="outline" title="Reset example library" style={{ marginTop: 28 }} onPress={reset} />
      <Muted small style={{ marginTop: 10, lineHeight: 17 }}>
        Leaf keeps your shelf, reviews and clubs on this phone only, in a local database. Online accounts and sync come with the backend.
      </Muted>
    </Screen>
  );
}

const styles = StyleSheet.create({
  plusrow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16, padding: 14, borderRadius: 14, backgroundColor: colors.greenBg, borderWidth: 1, borderColor: colors.line },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: colors.chip },
  chipOn: { backgroundColor: colors.heading },
  chipText: { fontFamily: fonts.sansMedium, fontSize: 12.5, color: colors.heading },
  pill: { backgroundColor: colors.sage, borderRadius: 16, paddingHorizontal: 13, paddingVertical: 7 },
  pillText: { color: '#fff', fontFamily: fonts.sansSemi, fontSize: 12 },
  swatch: { width: 40, height: 40, borderRadius: 20 },
});
