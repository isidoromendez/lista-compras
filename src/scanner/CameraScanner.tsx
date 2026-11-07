import { StyleSheet, Text, View } from 'react-native';
import { fonts } from '../theme';

// En la app nativa todavía no hay lector: por ahora funciona en la versión web.
export function CameraScanner(_: { onCode: (codigo: string) => void; pausado?: boolean; mensajePausa?: string }) {
  return (
    <View style={styles.box}>
      <Text style={styles.text}>El lector funciona por ahora en la versión web.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: '100%', aspectRatio: 16 / 10, backgroundColor: '#111', borderRadius: 12, alignItems: 'center', justifyContent: 'center', padding: 20 },
  text: { color: '#fff', fontFamily: fonts.regular, fontSize: 14, textAlign: 'center' },
});
