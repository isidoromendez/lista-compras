import Feather from '@expo/vector-icons/Feather';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PriceCard, type EstadoConsulta } from '../components/PriceCard';
import { ZonaChip } from '../components/ZonaChip';
import { fmtPrecio } from '../precios/preciosClaros';
import { useConsulta } from '../precios/useConsulta';
import { useZona } from '../precios/useZona';
import { CameraScanner } from '../scanner/CameraScanner';
import { fonts, useTheme } from '../theme';

type Escaneado = Extract<EstadoConsulta, { estado: 'ok' | 'sin-precios' | 'no-encontrado' }>;

// Lector suelto: escaneás y ves el precio sugerido de la zona, sin tocar la lista.
export function PriceScannerScreen({ onClose }: { onClose: () => void }) {
  const { colors } = useTheme();
  const { zona, recargar } = useZona();
  const { consulta, setConsulta, consultar } = useConsulta(zona);
  const [historial, setHistorial] = useState<Escaneado[]>([]);

  const onCode = async (ean: string) => {
    const r = await consultar(ean);
    if (r.estado === 'ok' || r.estado === 'sin-precios' || r.estado === 'no-encontrado') {
      setHistorial((h) => [r, ...h.filter((x) => x.ean !== r.ean)].slice(0, 30));
    }
  };

  // El último escaneado ya se ve en la tarjeta: el historial muestra los anteriores.
  const anteriores = historial.filter((h) => h.ean !== (consulta && 'ean' in consulta ? consulta.ean : ''));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Volver a la lista" style={styles.back}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Consultar precio</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <ZonaChip zona={zona} onRetry={recargar} />
        <View style={styles.camera}>
          {/* No lee hasta saber la zona: si no, el primer código se perdería. */}
          <CameraScanner
            onCode={onCode}
            pausado={zona.estado !== 'ok'}
            mensajePausa={zona.estado === 'buscando' ? 'Buscando tu zona…' : 'Sin zona no puedo consultar precios'}
          />
        </View>

        {consulta && <PriceCard consulta={consulta} />}

        {anteriores.length > 0 && (
          <View style={styles.history}>
            <View style={styles.historyHeader}>
              <Text style={[styles.historyTitle, { color: colors.secondary }]}>Escaneados · {anteriores.length}</Text>
              <Pressable
                onPress={() => {
                  setHistorial([]);
                  setConsulta(null);
                }}
                hitSlop={8}
                accessibilityRole="button"
                style={({ pressed }) => [styles.clear, { borderColor: colors.border }, pressed && { backgroundColor: colors.pressed }]}
              >
                <Feather name="trash-2" size={12} color={colors.secondary} />
                <Text style={[styles.clearText, { color: colors.secondary }]}>Borrar</Text>
              </Pressable>
            </View>
            {anteriores.map((h) => (
              <Pressable
                key={h.ean}
                onPress={() => setConsulta(h)}
                style={({ pressed }) => [styles.row, { borderBottomColor: colors.divider }, pressed && { backgroundColor: colors.pressed }]}
              >
                <Text style={[styles.rowName, { color: colors.text }]} numberOfLines={1}>
                  {h.estado === 'no-encontrado' ? `Código ${h.ean}` : h.nombre}
                </Text>
                <Text style={[styles.rowPrice, { color: h.estado === 'ok' ? colors.text : colors.muted }]}>
                  {h.estado === 'ok' ? fmtPrecio(h.tipico) : h.estado === 'sin-precios' ? 'sin precio' : 'no encontrado'}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        <Text style={[styles.fuente, { color: colors.muted }]}>
          Precios: Precios Claros (Secretaría de Comercio). Son precios de lista informados por los súpers; pueden no incluir promociones.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  back: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', marginLeft: -6 },
  title: { fontFamily: fonts.semibold, fontSize: 22, letterSpacing: -0.5 },
  scroll: { paddingHorizontal: 20, paddingBottom: 28, gap: 12 },
  camera: { marginTop: 2 },
  history: { marginTop: 6 },
  historyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 6 },
  historyTitle: { fontFamily: fonts.medium, fontSize: 13 },
  clear: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 28, paddingHorizontal: 10, borderWidth: 1, borderRadius: 8 },
  clearText: { fontFamily: fonts.medium, fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderBottomWidth: 1 },
  rowName: { flex: 1, fontFamily: fonts.regular, fontSize: 14 },
  rowPrice: { fontFamily: fonts.mono, fontSize: 13 },
  fuente: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, marginTop: 8 },
});
