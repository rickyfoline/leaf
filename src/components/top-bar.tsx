import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useApp } from '@/state/app';
import { colors, fonts } from '@/theme';

import { Icon } from './ui';

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }} accessibilityRole="header" accessibilityLabel="Leaf">
      <Text style={{ fontFamily: fonts.serifItalic, fontSize: size, color: colors.sage }}>Leaf</Text>
      <LeafMark size={size * 0.75} />
    </View>
  );
}

export function LeafMark({ size = 22 }: { size?: number }) {
  // A leaf made of two rotated rounded views, so no SVG dependency is needed.
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * 0.62, height: size * 0.95, backgroundColor: colors.sage, borderTopLeftRadius: size, borderBottomRightRadius: size, transform: [{ rotate: '35deg' }] }} />
      <View style={{ position: 'absolute', width: 1.2, height: size * 0.7, backgroundColor: colors.bg, transform: [{ rotate: '35deg' }] }} />
    </View>
  );
}

type Left = 'menu' | 'back' | 'cancel';
type Right = 'login' | 'gear' | 'bell' | 'save' | 'none';

export function TopBar({ left = 'menu', right = 'bell', onSave }: { left?: Left; right?: Right; onSave?: () => void }) {
  const router = useRouter();
  const { settings, toast } = useApp();
  const [menu, setMenu] = useState(false);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <View style={styles.bar}>
      <View style={styles.side}>
        {left === 'back' ? (
          <Pressable onPress={back} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Back" hitSlop={6}>
            <Icon name="chevron-back" />
          </Pressable>
        ) : left === 'cancel' ? (
          <Pressable onPress={back} accessibilityRole="button" hitSlop={8}>
            <Text style={styles.txt}>Cancel</Text>
          </Pressable>
        ) : (
          <Pressable onPress={() => setMenu(true)} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Menu" hitSlop={6}>
            <Icon name="ellipsis-vertical" />
          </Pressable>
        )}
      </View>
      <Logo />
      <View style={[styles.side, { alignItems: 'flex-end' }]}>
        {right === 'login' ? (
          <Pressable onPress={() => router.navigate('/profile')} accessibilityRole="button" hitSlop={8}>
            <Text style={styles.txt}>{settings.user ? settings.user.name.split(' ')[0] : 'Guest'}</Text>
          </Pressable>
        ) : right === 'gear' ? (
          <Pressable onPress={() => router.push('/settings')} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Settings" hitSlop={6}>
            <Icon name="settings-sharp" />
          </Pressable>
        ) : right === 'save' ? (
          <Pressable onPress={onSave} accessibilityRole="button" hitSlop={8}>
            <Text style={[styles.txt, { color: colors.sageInk }]}>Save</Text>
          </Pressable>
        ) : right === 'bell' ? (
          <Pressable onPress={() => toast('No new notifications')} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Notifications" hitSlop={6}>
            <Icon name="notifications" />
          </Pressable>
        ) : null}
      </View>
      <AppMenu visible={menu} onClose={() => setMenu(false)} />
    </View>
  );
}

function AppMenu({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const router = useRouter();
  const { settings, plus, updateSettings } = useApp();
  const go = (fn: () => void) => () => {
    onClose();
    fn();
  };
  const items: [string, () => void][] = [
    ['My shelf', () => router.navigate('/profile')],
    ['Clubs', () => router.navigate('/community')],
    ['Settings', () => router.push('/settings')],
    [plus ? 'Your Leaf Plus' : 'Get Leaf Plus', () => router.push('/plus')],
    [settings.user ? 'Log out' : 'Log in', () => updateSettings({ user: null, guest: false })],
  ];
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close menu">
        <View style={styles.menu}>
          {items.map(([label, fn]) => (
            <Pressable key={label} onPress={go(fn)} style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: colors.chip }]} accessibilityRole="menuitem">
              <Text style={styles.menuText}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.bg },
  side: { width: 64 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  txt: { fontFamily: fonts.sansSemi, fontSize: 12.5, color: colors.rose },
  backdrop: { flex: 1, backgroundColor: 'rgba(74,58,51,0.18)' },
  menu: { position: 'absolute', top: 96, left: 16, backgroundColor: colors.surface, borderRadius: 14, paddingVertical: 6, minWidth: 190, borderWidth: 1, borderColor: colors.line },
  menuItem: { paddingHorizontal: 16, paddingVertical: 12 },
  menuText: { fontFamily: fonts.sansMedium, color: colors.ink, fontSize: 14 },
});
