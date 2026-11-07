import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { fmtDistancia, fmtPrecio, type ResultadoPrecio } from '../precios/preciosClaros';
import { fonts, useTheme } from '../theme';

export type EstadoConsulta =
  | { estado: 'buscando'; ean: string }
  | { estado: 'error'; ean: string; mensaje: string }
  | ResultadoPrecio;

type Props = { consulta: EstadoConsulta; children?: ReactNode };

// Tarjeta con el producto escaneado y su precio sugerido en la zona.
export function PriceCard({ consulta, children }: Props) {
  const { colors } = useTheme();
  const c = consulta;

  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.background }]}>
      {c.estado === 'buscando' ? (
        <View style={styles.fila}>
          <ActivityIndicator color={colors.muted} />
          <Text style={[styles.meta, { color: colors.muted }]}>Buscando {c.ean}…</Text>
        </View>
      ) : c.estado === 'error' ? (
        <>
          <Text style={[styles.nombre, { color: colors.text }]}>No se pudo consultar el precio</Text>
          <Text style={[styles.sub, { color: colors.secondary }]}>{c.mensaje}</Text>
        </>
      ) : c.estado === 'no-encontrado' ? (
        <>
          <Text style={[styles.nombre, { color: colors.text }]}>No está en Precios Claros</Text>
          <Text style={[styles.sub, { color: colors.secondary }]}>
            Este producto no figura en la base de precios.
          </Text>
          <Text style={[styles.meta, { color: colors.muted }]}>código {c.ean}</Text>
        </>
      ) : (
        <>
          <Text style={[styles.nombre, { color: colors.text }]}>
            {c.marca ? `${c.marca} · ` : ''}
            {c.nombre}
          </Text>
          {c.estado === 'ok' ? (
            <>
              <Text style={[styles.label, { color: colors.secondary }]}>Precio sugerido en la zona</Text>
              <Text style={[styles.precio, { color: colors.text }]}>{fmtPrecio(c.tipico)}</Text>
              <Text style={[styles.sub, { color: colors.secondary }]}>
                {c.cantidadSuper === 1
                  ? `solo en ${c.masBarato.sucursal.nombre}`
                  : `más barato: ${fmtPrecio(c.masBarato.precio)} en ${c.masBarato.sucursal.nombre}`}
                {c.masBarato.sucursal.distanciaKm != null ? ` · ${fmtDistancia(c.masBarato.sucursal.distanciaKm)}` : ''}
              </Text>
              <Text style={[styles.meta, { color: colors.muted }]}>
                según {c.cantidadSuper} {c.cantidadSuper === 1 ? 'súper' : 'súpers'} de la zona
              </Text>
            </>
          ) : (
            <Text style={[styles.sub, { color: colors.secondary, marginTop: 10 }]}>
              Está en Precios Claros, pero ningún súper de la zona informa su precio.
            </Text>
          )}
        </>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 12, padding: 16 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nombre: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 21 },
  label: { fontFamily: fonts.regular, fontSize: 12, marginTop: 12 },
  precio: { fontFamily: fonts.semibold, fontSize: 32, letterSpacing: -1, marginTop: 2 },
  sub: { fontFamily: fonts.regular, fontSize: 13, marginTop: 4, lineHeight: 18 },
  meta: { fontFamily: fonts.mono, fontSize: 11, marginTop: 8 },
});
