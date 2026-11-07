import Feather from '@expo/vector-icons/Feather';
import { Pressable, StyleSheet, Text } from 'react-native';
import type { EstadoZona } from '../precios/useZona';
import { fonts, useTheme } from '../theme';

export function ZonaChip({ zona, onRetry }: { zona: EstadoZona; onRetry: () => void }) {
  const { colors } = useTheme();
  const error = zona.estado === 'error';
  return (
    <Pressable
      onPress={error ? onRetry : undefined}
      disabled={!error}
      style={[styles.chip, { backgroundColor: error ? colors.pressed : colors.accentSoft }]}
    >
      <Feather name={error ? 'alert-circle' : 'map-pin'} size={12} color={error ? colors.danger : colors.accentText} />
      <Text style={[styles.text, { color: error ? colors.danger : colors.accentText }]} numberOfLines={2}>
        {zona.estado === 'buscando'
          ? 'Buscando tu zona…'
          : zona.estado === 'error'
            ? `${zona.mensaje} Tocá para reintentar.`
            : `${zona.zona.localidad || 'Tu zona'} · ${zona.zona.sucursales.length} súpers a menos de 40 km`}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, maxWidth: '100%' },
  text: { fontFamily: fonts.medium, fontSize: 12, flexShrink: 1 },
});
