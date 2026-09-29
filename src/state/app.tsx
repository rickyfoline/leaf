import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import * as repo from '@/db/repo';
import type { Db } from '@/db/types';
import type { Gate } from '@/lib/plus';
import { DEFAULT_SETTINGS, isPlus, type Settings } from '@/lib/settings';
import { colors, fonts } from '@/theme';

type AppContext = {
  db: Db;
  /** Bumps after every write so screens reload their queries. */
  version: number;
  refresh: () => void;
  settings: Settings;
  updateSettings: (patch: Partial<Settings> | ((s: Settings) => Partial<Settings>)) => Promise<Settings>;
  plus: boolean;
  toast: (message: string) => void;
};

const Ctx = createContext<AppContext | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext() as unknown as Db;
  const [version, setVersion] = useState(0);
  const [settings, setSettings] = useState<Settings | null>(null);
  // Latest settings, so two quick updates in a row do not overwrite each other.
  const settingsRef = useRef<Settings>(DEFAULT_SETTINGS);
  const [message, setMessage] = useState<string | null>(null);
  const fade = useState(() => new Animated.Value(0))[0];
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    repo.loadSettings(db).then((s) => {
      settingsRef.current = s;
      setSettings(s);
    });
  }, [db]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  const updateSettings = useCallback<AppContext['updateSettings']>(
    async (patch) => {
      const cur = settingsRef.current;
      const next = { ...cur, ...(typeof patch === 'function' ? patch(cur) : patch) };
      settingsRef.current = next;
      setSettings(next);
      await repo.saveSettings(db, next);
      return next;
    },
    [db],
  );

  const toast = useCallback(
    (m: string) => {
      setMessage(m);
      if (timer.current) clearTimeout(timer.current);
      Animated.timing(fade, { toValue: 1, duration: 160, useNativeDriver: true }).start();
      timer.current = setTimeout(() => {
        Animated.timing(fade, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setMessage(null));
      }, 2000);
    },
    [fade],
  );

  const value = useMemo(
    () => ({ db, version, refresh, settings: settings ?? DEFAULT_SETTINGS, updateSettings, plus: isPlus(settings ?? DEFAULT_SETTINGS), toast }),
    [db, version, refresh, settings, updateSettings, toast],
  );
  if (!settings) return null;

  return (
    <Ctx.Provider value={value}>
      {children}
      {message ? (
        <Animated.View
          pointerEvents="none"
          accessibilityLiveRegion="polite"
          style={[styles.toast, { bottom: insets.bottom + 96, opacity: fade, transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }]}>
          <Text style={styles.toastText}>{message}</Text>
        </Animated.View>
      ) : null}
    </Ctx.Provider>
  );
}

export function useApp() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useApp must be used inside AppProvider');
  return c;
}

/** Runs a query now and again after every write. */
export function useLive<T>(query: (db: Db) => Promise<T>, deps: unknown[]): T | undefined {
  const { db, version } = useApp();
  const [value, setValue] = useState<T>();
  useEffect(() => {
    let alive = true;
    query(db).then(
      (v) => alive && setValue(v),
      (e) => console.warn('Query failed', e),
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, version, ...deps]);
  return value;
}

/** Runs a write, then refreshes every screen. */
export function useWrite() {
  const { db, refresh } = useApp();
  return useCallback(
    async <T,>(fn: (db: Db) => Promise<T>) => {
      const r = await fn(db);
      refresh();
      return r;
    },
    [db, refresh],
  );
}

/** Returns true when the reader has Plus; otherwise opens the paywall. */
export function useGate() {
  const { plus } = useApp();
  const router = useRouter();
  return useCallback(
    (gate: Gate) => {
      if (plus) return true;
      router.push({ pathname: '/plus', params: { from: gate } });
      return false;
    },
    [plus, router],
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: colors.ink,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    maxWidth: '86%',
  },
  toastText: { color: '#fff', fontFamily: fonts.sansMedium, fontSize: 13, textAlign: 'center' },
});
