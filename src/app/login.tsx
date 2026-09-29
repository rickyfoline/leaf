// Accounts are local for now: the profile is saved on this device and no
// password leaves it. Real sign-in (email, Google, Apple) comes with the backend.
import { useEffect, useState } from 'react';
import { Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Logo } from '@/components/top-bar';
import { Button, H1, Input, Muted } from '@/components/ui';
import { setMyName } from '@/db/repo';
import { handleFromName } from '@/lib/settings';
import { useApp } from '@/state/app';
import { colors, fonts } from '@/theme';

const SPINES: [string, number, number][] = [
  ['#7A5747', 22, 92], ['#A3B18A', 30, 120], ['#C39E9E', 18, 80], ['#310A0A', 26, 110], ['#D9B98C', 34, 128], ['#AD9B9B', 20, 96],
  ['#5C6B4A', 28, 118], ['#E8DCD9', 22, 86], ['#9C3D2E', 30, 104], ['#A1897C', 18, 90], ['#28436B', 26, 122],
];

function Shelf() {
  const rise = useState(() => SPINES.map(() => new Animated.Value(0)))[0];
  useEffect(() => {
    Animated.stagger(50, rise.map((v) => Animated.spring(v, { toValue: 1, useNativeDriver: true, speed: 10, bounciness: 8 }))).start();
  }, [rise]);
  return (
    <View style={styles.shelf} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {SPINES.map(([c, w, h], i) => (
        <Animated.View key={i} style={{ width: w, height: h, backgroundColor: c, borderRadius: 3, opacity: rise[i],
          transform: [{ translateY: rise[i].interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }] }} />
      ))}
    </View>
  );
}

export default function Login() {
  const { db, updateSettings, toast } = useApp();
  const [signup, setSignup] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const e = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(e)) return setError('Enter a valid email.');
    if (password.length < 6) return setError('Your password needs at least 6 characters.');
    if (signup && !name.trim()) return setError('Tell us your name.');
    const display = signup ? name.trim() : e.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
    await setMyName(db, display);
    await updateSettings({ user: { name: display, handle: handleFromName(display), email: e }, guest: false });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <Logo size={40} />
            <Text style={{ color: colors.secondary, fontFamily: fonts.sans, fontSize: 12.5, marginTop: 2 }}>Track, rate and share every book you read.</Text>
            <Shelf />
          </View>
          <View style={{ paddingHorizontal: 20 }}>
            <H1 style={{ fontSize: 26, marginTop: 10 }}>{signup ? 'Create your account' : 'Welcome back'}</H1>
            <Muted style={{ marginTop: 4, fontSize: 13 }}>{signup ? 'Start your shelf in less than a minute.' : 'Log in to continue your reading journey.'}</Muted>
            {signup ? <Input label="Name" value={name} onChangeText={setName} autoComplete="name" placeholder="Your name" /> : null}
            <Input label="Email" value={email} onChangeText={setEmail} autoComplete="email" keyboardType="email-address" autoCapitalize="none" placeholder="you@email.com" />
            <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete={signup ? 'new-password' : 'current-password'} placeholder="At least 6 characters" />
            {error ? <Text style={styles.err} accessibilityLiveRegion="polite">{error}</Text> : null}
            {!signup ? (
              <Pressable style={{ alignSelf: 'flex-end', marginTop: 8 }} onPress={() => toast('Password reset arrives with online accounts')} hitSlop={8}>
                <Text style={{ color: colors.rose, fontFamily: fonts.sansMedium, fontSize: 12 }}>Forgot password?</Text>
              </Pressable>
            ) : null}
            <Button block title={signup ? 'Create Account' : 'Log In'} onPress={submit} style={{ marginTop: 20 }} />
            <View style={styles.or}>
              <View style={styles.line} />
              <Muted small>or continue with</Muted>
              <View style={styles.line} />
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button variant="outline" title="Google" icon="logo-google" style={{ flex: 1 }} onPress={() => toast('Google sign-in arrives with online accounts')} />
              <Button variant="outline" title="Apple" icon="logo-apple" style={{ flex: 1 }} onPress={() => toast('Sign in with Apple arrives with online accounts')} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 22, gap: 4 }}>
              <Muted style={{ fontSize: 13 }}>{signup ? 'Already have an account?' : 'New to Leaf?'}</Muted>
              <Pressable onPress={() => { setSignup(!signup); setError(null); }} hitSlop={8}>
                <Text style={{ color: colors.heading, fontFamily: fonts.sansBold, fontSize: 13 }}>{signup ? 'Log in' : 'Create an account'}</Text>
              </Pressable>
            </View>
            <Pressable style={{ alignSelf: 'center', marginTop: 14 }} onPress={() => updateSettings({ guest: true })} hitSlop={8}>
              <Text style={{ color: colors.muted, fontFamily: fonts.sans, fontSize: 12, textDecorationLine: 'underline' }}>Browse as guest</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingTop: 24, backgroundColor: colors.warm2 },
  shelf: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, marginTop: 22, paddingHorizontal: 20, borderBottomWidth: 6, borderColor: colors.heading, overflow: 'hidden' },
  err: { color: colors.danger, fontFamily: fonts.sansMedium, fontSize: 12.5, marginTop: 10 },
  or: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 18 },
  line: { flex: 1, height: 1, backgroundColor: colors.line },
});
