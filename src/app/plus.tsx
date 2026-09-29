// Leaf Plus paywall. Simulated: choosing a plan unlocks Plus on this phone and nothing is charged.
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Logo, TopBar } from '@/components/top-bar';
import { Badge, Button, H1, Icon, Muted, PlusBadge, Screen, Tap } from '@/components/ui';
import { GATES, PLANS, PLUS_FEATURES, trialEnd, type Gate } from '@/lib/plus';
import type { Cycle } from '@/lib/settings';
import { useApp } from '@/state/app';
import { colors, fonts } from '@/theme';

function Features() {
  return (
    <View style={{ marginTop: 18, gap: 12 }}>
      {PLUS_FEATURES.map(([t, d]) => (
        <View key={t} style={{ flexDirection: 'row', gap: 10 }}>
          <Icon name="checkmark-circle" size={20} color={colors.sage} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.sansSemi, color: colors.ink, fontSize: 13.5 }}>{t}</Text>
            <Muted>{d}</Muted>
          </View>
        </View>
      ))}
    </View>
  );
}

export default function Plus() {
  const { from } = useLocalSearchParams<{ from?: Gate }>();
  const router = useRouter();
  const { settings, plus, updateSettings, toast } = useApp();
  const [selected, setSelected] = useState<Cycle>('yearly');
  const why = from ? GATES[from] : null;

  if (plus) {
    return (
      <Screen header={<TopBar left="back" right="none" />}>
        <View style={styles.hero}><Logo size={34} /><PlusBadge patron={settings.plan === 'patron'} /></View>
        <H1 center style={{ fontSize: 22, marginTop: 10 }}>Thanks for supporting Leaf!</H1>
        <Muted style={{ textAlign: 'center', marginTop: 6 }}>
          {settings.cycle ? PLANS[settings.cycle].name : 'Leaf Plus'}{settings.trialEnds ? ` · free trial until ${settings.trialEnds}` : ''}
        </Muted>
        <Features />
        <Button block variant="ghost" title="Cancel subscription" style={{ marginTop: 22 }} onPress={async () => {
          await updateSettings({ plan: 'free', cycle: null, trialEnds: null });
          toast('Subscription cancelled');
        }} />
        <Muted small style={{ textAlign: 'center', marginTop: 10 }}>Demo: no payment was taken.</Muted>
      </Screen>
    );
  }

  const plan = PLANS[selected];
  return (
    <Screen header={<TopBar left="back" right="none" />}>
      <View style={styles.hero}><Logo size={34} /><PlusBadge /></View>
      {why ? <View style={{ alignItems: 'center', marginTop: 8 }}><Badge label={why} tone="rose" /></View> : null}
      <H1 center style={{ fontSize: 23, marginTop: 10 }}>Go deeper into your reading</H1>
      <Muted style={{ textAlign: 'center', marginTop: 6, lineHeight: 19, fontSize: 13 }}>
        Reviews, ratings and clubs stay free forever. Plus is for readers who love the numbers.
      </Muted>
      <Features />
      <View style={{ marginTop: 18, gap: 10 }}>
        {(Object.keys(PLANS) as Cycle[]).map((k) => {
          const p = PLANS[k];
          const on = selected === k;
          return (
            <Tap key={k} onPress={() => setSelected(k)} style={[styles.plan, on && styles.planOn]} scale={0.98} accessibilityRole="radio" accessibilityState={{ checked: on }}>
              <View style={[styles.radio, on && { borderColor: colors.sageInk }]}>{on ? <View style={styles.radioDot} /> : null}</View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                  <Text style={{ fontFamily: fonts.sansSemi, color: colors.ink, fontSize: 14 }}>{p.name}</Text>
                  {k === 'yearly' ? <Badge label="Best value" tone="sage" /> : null}
                </View>
                <Muted small style={{ marginTop: 2 }}>{p.note}</Muted>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontFamily: fonts.serifBold, color: colors.heading, fontSize: 16 }}>{p.price}</Text>
                <Muted small>{p.per}</Muted>
              </View>
            </Tap>
          );
        })}
      </View>
      <Button block title={plan.trial ? 'Start 7-day free trial' : 'Become a Patron'} style={{ marginTop: 18 }} onPress={async () => {
        await updateSettings({ plan: selected === 'patron' ? 'patron' : 'plus', cycle: selected, trialEnds: plan.trial ? trialEnd() : null });
        toast(selected === 'patron' ? 'Welcome, Patron!' : 'Your 7-day trial has started');
        router.back();
      }} />
      <Pressable style={{ alignSelf: 'center', marginTop: 12 }} onPress={() => router.back()} hitSlop={8}>
        <Text style={{ color: colors.muted, fontFamily: fonts.sans, fontSize: 12, textDecorationLine: 'underline' }}>Not now</Text>
      </Pressable>
      <Muted small style={{ textAlign: 'center', marginTop: 14, lineHeight: 17 }}>
        Demo only: no payment is taken. In the store version, billing goes through the App Store or Google Play and you can cancel anytime.
      </Muted>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 },
  plan: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.stroke },
  planOn: { borderColor: colors.sage, backgroundColor: colors.greenBg },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.stroke, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.sageInk },
});
