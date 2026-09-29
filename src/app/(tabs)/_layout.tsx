import { useRouter } from 'expo-router';
import { Tabs, type BottomTabBarProps } from 'expo-router/tabs';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, Tap, type IconName } from '@/components/ui';
import { colors } from '@/theme';

const TABS: Record<string, { icon: IconName; label: string }> = {
  index: { icon: 'home', label: 'Home' },
  search: { icon: 'search', label: 'Search' },
  community: { icon: 'book', label: 'Community' },
  profile: { icon: 'person', label: 'Profile' },
};

/** Four tabs with the round "+" (add a book) in the middle, like the Figma. */
function TabBar({ state, navigation }: BottomTabBarProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const buttons = state.routes.map((route, i) => {
    const t = TABS[route.name];
    if (!t) return null;
    const focused = state.index === i;
    return (
      <Pressable
        key={route.key}
        style={styles.tab}
        accessibilityRole="tab"
        accessibilityLabel={t.label}
        accessibilityState={{ selected: focused }}
        onPress={() => {
          const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !e.defaultPrevented) navigation.navigate(route.name);
        }}>
        <Icon name={t.icon} size={24} color={focused ? colors.heading : colors.roseMuted} />
      </Pressable>
    );
  });
  buttons.splice(2, 0, (
    <View key="add" style={styles.tab}>
      <Tap onPress={() => router.push('/add')} style={styles.plus} accessibilityLabel="Add a book">
        <Icon name="add" size={30} color={colors.heading} />
      </Tap>
    </View>
  ));
  return <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>{buttons}</View>;
}

export default function TabLayout() {
  return (
    <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="community" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: '#F2EEE7', paddingTop: 10, borderTopWidth: 1, borderColor: colors.line },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  plus: {
    width: 54, height: 54, borderRadius: 27, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginTop: -8,
    shadowColor: colors.heading, shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4,
  },
});
