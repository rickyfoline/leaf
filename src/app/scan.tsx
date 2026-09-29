// Leaf Plus: scan the ISBN barcode on the back of a book.
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Loading } from '@/components/ui';
import { findWorkByIsbn } from '@/db/repo';
import { useApp } from '@/state/app';
import { colors, fonts } from '@/theme';

export default function Scan() {
  const router = useRouter();
  const { db } = useApp();
  const [permission, requestPermission] = useCameraPermissions();
  const [message, setMessage] = useState('Point the camera at the barcode on the back cover.');
  const busy = useRef(false);
  const last = useRef('');

  if (!permission) return <Loading />;
  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.bg }]}>
        <Text style={styles.title}>Scan a book</Text>
        <Text style={styles.text}>Leaf needs the camera to read the ISBN barcode. Nothing is recorded.</Text>
        <Button title="Allow camera" onPress={requestPermission} style={{ marginTop: 18 }} />
        <Button title="Not now" variant="ghost" onPress={() => router.back()} style={{ marginTop: 10 }} />
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['ean13'] }}
        onBarcodeScanned={async ({ data }) => {
          if (busy.current || data === last.current) return;
          busy.current = true;
          last.current = data;
          const workId = await findWorkByIsbn(db, data);
          if (workId) {
            router.dismissTo({ pathname: '/add', params: { id: workId } });
            return;
          }
          setMessage(`ISBN ${data} is not in the catalog yet. Try another book or search by title.`);
          busy.current = false;
        }}
      />
      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <View style={styles.frame} />
        <Text style={[styles.text, { color: '#fff' }]} accessibilityLiveRegion="polite">{message}</Text>
        <Button title="Close" variant="ghost" onPress={() => router.back()} style={{ marginTop: 16 }} />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontFamily: fonts.serif, color: colors.heading, fontSize: 24 },
  text: { fontFamily: fonts.sans, color: colors.body, fontSize: 14, textAlign: 'center', marginTop: 10, lineHeight: 20, paddingHorizontal: 24 },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  frame: { width: 260, height: 140, borderRadius: 16, borderWidth: 3, borderColor: colors.sage },
});
