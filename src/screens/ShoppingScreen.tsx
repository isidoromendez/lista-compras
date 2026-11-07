import Feather from '@expo/vector-icons/Feather';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../auth/AuthProvider';
import { PriceCard, type EstadoConsulta } from '../components/PriceCard';
import { ZonaChip } from '../components/ZonaChip';
import { addItemComprado, setComprado, subscribeToItems, type Item } from '../items/items';
import { useConsulta } from '../precios/useConsulta';
import { useZona } from '../precios/useZona';
import { CameraScanner } from '../scanner/CameraScanner';
import { candidatos, yaTachado } from '../scanner/match';
import { fonts, useTheme } from '../theme';

type Pendiente = { ean: string; consulta: EstadoConsulta; opciones: Item[] };
const NUEVO = 'nuevo';

// Modo súper: escaneás lo que ponés en el carrito y se tacha de la lista.
export function ShoppingScreen({ onClose }: { onClose: () => void }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const email = user?.email ?? user?.uid ?? '';
  const { zona, recargar } = useZona();
  const { consultar } = useConsulta(zona);

  const [items, setItems] = useState<Item[]>([]);
  const itemsRef = useRef<Item[]>([]);
  useEffect(
    () =>
      subscribeToItems(
        (next) => {
          itemsRef.current = next;
          setItems(next);
        },
        (e) => console.warn('Error leyendo la lista', e),
      ),
    [],
  );

  const [pendiente, setPendiente] = useState<Pendiente | null>(null);
  const [seleccion, setSeleccion] = useState<string>(NUEVO);
  const [nombreNuevo, setNombreNuevo] = useState('');
  const [verTodos, setVerTodos] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; tipo: 'ok' | 'info' } | null>(null);
  const avisoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mostrarAviso = (texto: string, tipo: 'ok' | 'info' = 'ok') => {
    setAviso({ texto, tipo });
    if (avisoTimer.current) clearTimeout(avisoTimer.current);
    avisoTimer.current = setTimeout(() => setAviso(null), 3500);
  };
  useEffect(() => () => {
    if (avisoTimer.current) clearTimeout(avisoTimer.current);
  }, []);

  const pendientes = useMemo(() => items.filter((i) => !i.comprado), [items]);

  const onCode = async (ean: string) => {
    const tachado = yaTachado(itemsRef.current, ean);
    if (tachado) {
      navigator.vibrate?.([40, 70, 40]);
      mostrarAviso(`Ya estaba tachado: ${tachado.nombre}`, 'info');
      return;
    }
    setError(null);
    setVerTodos(false);
    setNombreNuevo('');
    setPendiente({ ean, consulta: { estado: 'buscando', ean }, opciones: [] });
    const r = await consultar(ean);
    const texto = r.estado === 'ok' || r.estado === 'sin-precios' ? `${r.marca} ${r.nombre}` : null;
    const opciones = candidatos(itemsRef.current, ean, texto);
    setSeleccion(opciones[0]?.id ?? NUEVO);
    setPendiente({ ean, consulta: r, opciones });
  };

  const reintentar = async () => {
    if (!pendiente) return;
    const ean = pendiente.ean;
    setPendiente(null);
    await onCode(ean);
  };

  const c = pendiente?.consulta;
  const conNombre = c && (c.estado === 'ok' || c.estado === 'sin-precios');
  const necesitaNombre = seleccion === NUEVO && !conNombre;
  const puedeConfirmar = !!c && c.estado !== 'buscando' && (!necesitaNombre || nombreNuevo.trim().length > 0);

  const alCarrito = () => {
    if (!pendiente || !puedeConfirmar) return;
    const { ean } = pendiente;
    if (seleccion !== NUEVO) {
      const item = itemsRef.current.find((i) => i.id === seleccion);
      setComprado(seleccion, true, email, ean).catch(() => setError('No se pudo tachar el ítem.'));
      mostrarAviso(`✓ ${item?.nombre ?? 'Ítem'} al carrito`);
    } else {
      const nombre = conNombre ? (c as Extract<EstadoConsulta, { nombre: string }>).nombre : nombreNuevo.trim();
      addItemComprado(nombre, email, ean).catch(() => setError('No se pudo agregar el producto.'));
      mostrarAviso(`✓ ${nombre} agregado como comprado`);
    }
    setPendiente(null);
  };

  const opcionesVisibles = pendiente
    ? verTodos
      ? [...pendiente.opciones, ...pendientes.filter((p) => !pendiente.opciones.some((o) => o.id === p.id))]
      : pendiente.opciones.slice(0, 3)
    : [];
  const hayMas = !!pendiente && !verTodos && pendientes.length > opcionesVisibles.length;

  const Chip = ({ id, texto }: { id: string; texto: string }) => {
    const activo = seleccion === id;
    return (
      <Pressable
        onPress={() => setSeleccion(id)}
        accessibilityRole="radio"
        accessibilityState={{ checked: activo }}
        style={[
          styles.chip,
          { borderColor: activo ? colors.accent : colors.border, backgroundColor: activo ? colors.accentSoft : 'transparent' },
        ]}
      >
        {activo && <Feather name="check" size={12} color={colors.accentText} />}
        <Text style={[styles.chipText, { color: activo ? colors.accentText : colors.text }]} numberOfLines={1}>
          {texto}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Volver a la lista" style={styles.back}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>En el súper</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <ZonaChip zona={zona} onRetry={recargar} />

        <View>
          <CameraScanner
            onCode={onCode}
            pausado={zona.estado === 'buscando' || pendiente !== null}
            mensajePausa={pendiente ? '' : 'Buscando tu zona…'}
          />
          {aviso && (
            <View style={[styles.aviso, { backgroundColor: aviso.tipo === 'ok' ? colors.accent : colors.text }]}>
              <Text style={[styles.avisoText, { color: colors.background }]} numberOfLines={2}>
                {aviso.texto}
              </Text>
            </View>
          )}
        </View>

        {error && <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>}

        {pendiente && c && (
          <PriceCard consulta={c}>
            {c.estado !== 'buscando' && (
              <View style={styles.decision}>
                <Text style={[styles.pregunta, { color: colors.secondary }]}>
                  {pendientes.length ? '¿Cuál de tu lista es?' : 'No hay nada pendiente en la lista.'}
                </Text>
                <View style={styles.chips}>
                  {opcionesVisibles.map((o) => (
                    <Chip key={o.id} id={o.id} texto={o.cantidad ? `${o.nombre} · ${o.cantidad}` : o.nombre} />
                  ))}
                  {hayMas && (
                    <Pressable onPress={() => setVerTodos(true)} style={[styles.chip, { borderColor: colors.border, borderStyle: 'dashed' }]}>
                      <Text style={[styles.chipText, { color: colors.secondary }]}>Otro de la lista…</Text>
                    </Pressable>
                  )}
                  <Chip id={NUEVO} texto="No estaba en la lista" />
                </View>

                {necesitaNombre && (
                  <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                    value={nombreNuevo}
                    onChangeText={setNombreNuevo}
                    placeholder="¿Qué es? (por ejemplo: Pan lactal)"
                    placeholderTextColor={colors.faint}
                    autoFocus
                    maxLength={100}
                    onSubmitEditing={alCarrito}
                  />
                )}

                <View style={styles.botones}>
                  <Pressable
                    onPress={() => setPendiente(null)}
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.boton, { borderWidth: 1, borderColor: colors.border }, pressed && { backgroundColor: colors.pressed }]}
                  >
                    <Text style={[styles.botonText, { color: colors.text }]}>No lo llevo</Text>
                  </Pressable>
                  <Pressable
                    onPress={alCarrito}
                    disabled={!puedeConfirmar}
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.boton, { backgroundColor: colors.primary }, (!puedeConfirmar || pressed) && { opacity: puedeConfirmar ? 0.85 : 0.4 }]}
                  >
                    <Feather name="shopping-cart" size={15} color={colors.onPrimary} />
                    <Text style={[styles.botonText, { color: colors.onPrimary }]}>Al carrito</Text>
                  </Pressable>
                </View>
                {c.estado === 'error' && (
                  <Pressable onPress={reintentar} hitSlop={8}>
                    <Text style={[styles.reintentar, { color: colors.accentText }]}>Reintentar la consulta</Text>
                  </Pressable>
                )}
              </View>
            )}
          </PriceCard>
        )}

        <View style={styles.faltan}>
          <Text style={[styles.faltanTitle, { color: colors.secondary }]}>
            {pendientes.length ? `Falta comprar · ${pendientes.length}` : 'Está todo en el carrito. 🎉'}
          </Text>
          {pendientes.map((i) => (
            <Pressable
              key={i.id}
              onPress={() => setComprado(i.id, true, email).catch(() => setError('No se pudo tachar el ítem.'))}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: false }}
              style={({ pressed }) => [styles.fila, { borderBottomColor: colors.divider }, pressed && { backgroundColor: colors.pressed }]}
            >
              <View style={[styles.check, { borderColor: colors.faint }]} />
              <Text style={[styles.filaText, { color: colors.text }]} numberOfLines={1}>
                {i.nombre}
                {i.cantidad ? <Text style={{ color: colors.muted }}> · {i.cantidad}</Text> : null}
              </Text>
            </Pressable>
          ))}
        </View>

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
  aviso: { position: 'absolute', left: 10, right: 10, top: 10, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  avisoText: { fontFamily: fonts.medium, fontSize: 13 },
  error: { fontFamily: fonts.regular, fontSize: 13 },
  decision: { marginTop: 14, gap: 10 },
  pregunta: { fontFamily: fonts.medium, fontSize: 13 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6, maxWidth: '100%' },
  chipText: { fontFamily: fonts.medium, fontSize: 13 },
  input: { height: 42, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, fontFamily: fonts.regular, fontSize: 15, outlineStyle: 'none' as 'solid' },
  botones: { flexDirection: 'row', gap: 8, marginTop: 2 },
  boton: { flex: 1, height: 46, borderRadius: 8, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  botonText: { fontFamily: fonts.medium, fontSize: 15 },
  reintentar: { fontFamily: fonts.medium, fontSize: 13, textAlign: 'center' },
  faltan: { marginTop: 6 },
  faltanTitle: { fontFamily: fonts.medium, fontSize: 13, paddingBottom: 4 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderBottomWidth: 1 },
  check: { width: 18, height: 18, borderRadius: 5, borderWidth: 1.5 },
  filaText: { flex: 1, fontFamily: fonts.regular, fontSize: 14 },
  fuente: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, marginTop: 8 },
});
