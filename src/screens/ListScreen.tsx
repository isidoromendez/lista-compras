import Feather from '@expo/vector-icons/Feather';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import {
  ActivityIndicator,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../auth/AuthProvider';
import { IconButton } from '../components/IconButton';
import { InstallButton } from '../components/InstallButton';
import { VoiceSheet } from '../components/VoiceSheet';
import { ItemRow } from '../components/ItemRow';
import {
  addItem,
  addItems,
  deleteItem,
  deleteItems,
  setComprado,
  subscribeToItems,
  type Item,
} from '../items/items';
import { fonts, useTheme } from '../theme';
import { initials } from '../utils/format';
import type { ItemDictado } from '../voice/parse';
import { dictadoDisponible } from '../voice/useDictado';

type Props = { onOpenPrecios: () => void; onOpenSuper: () => void };

export function ListScreen({ onOpenPrecios, onOpenSuper }: Props) {
  const { user, signOut } = useAuth();
  const { colors, scheme, toggle } = useTheme();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [focused, setFocused] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [dictando, setDictando] = useState(false);

  useEffect(
    () =>
      subscribeToItems(
        (next) => {
          setItems(next);
          setLoading(false);
          setError(null);
        },
        (e) => {
          console.warn('Error leyendo la lista', e);
          setError('No se pudo cargar la lista. Revisá la conexión.');
          setLoading(false);
        },
      ),
    [],
  );

  // Refresca los "hace X min" cada minuto.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const onAdd = () => {
    const nombre = draft.trim();
    if (!nombre || !user) return;
    setDraft('');
    addItem(nombre, user.email ?? user.uid).catch((e) => {
      console.warn('Error agregando ítem', e);
      setError('No se pudo agregar el ítem.');
      setDraft(nombre);
    });
  };

  const onAddDictado = (nuevos: ItemDictado[]) => {
    setDictando(false);
    if (!user || !nuevos.length) return;
    addItems(nuevos, user.email ?? user.uid).catch((e) => {
      console.warn('Error agregando ítems dictados', e);
      setError('No se pudieron agregar los ítems dictados.');
    });
  };

  const onDelete = (item: Item) => {
    deleteItem(item.id).catch((e) => {
      console.warn('Error eliminando ítem', e);
      setError('No se pudo eliminar el ítem.');
    });
  };

  const onToggle = (item: Item) => {
    if (!user) return;
    setComprado(item.id, !item.comprado, user.email ?? user.uid).catch((e) => {
      console.warn('Error tachando ítem', e);
      setError('No se pudo actualizar el ítem.');
    });
  };

  // "Limpiar comprados" pide un segundo toque para confirmar (la lista es compartida).
  const [confirmClear, setConfirmClear] = useState(false);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (clearTimer.current) clearTimeout(clearTimer.current);
  }, []);

  const pendientes = useMemo(() => items.filter((i) => !i.comprado), [items]);
  const comprados = useMemo(
    () =>
      items
        .filter((i) => i.comprado)
        .sort((a, b) => (b.compradoEn?.toMillis() ?? 0) - (a.compradoEn?.toMillis() ?? 0)),
    [items],
  );

  const onClear = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      clearTimer.current = setTimeout(() => setConfirmClear(false), 3000);
      return;
    }
    if (clearTimer.current) clearTimeout(clearTimer.current);
    setConfirmClear(false);
    deleteItems(comprados.map((i) => i.id)).catch((e) => {
      console.warn('Error limpiando comprados', e);
      setError('No se pudieron limpiar los comprados.');
    });
  };

  const count = pendientes.length;
  const sections = [
    { key: 'pendientes', data: pendientes },
    ...(comprados.length ? [{ key: 'comprados', data: comprados }] : []),
  ];

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.brand}>
          <View style={[styles.dot, { backgroundColor: colors.accent }]} />
          <Text style={[styles.brandText, { color: colors.text }]}>Lista de compras</Text>
        </View>
        <View style={styles.actions}>
          <InstallButton variant="compact" />
          {Platform.OS === 'web' && (
            <IconButton onPress={onOpenPrecios} label="Consultar precio">
              <Feather name="maximize" size={15} color={colors.secondary} />
            </IconButton>
          )}
          <IconButton
            onPress={toggle}
            label={scheme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            <Feather name={scheme === 'dark' ? 'sun' : 'moon'} size={15} color={colors.secondary} />
          </IconButton>
          <IconButton onPress={() => setMenuOpen((o) => !o)} label="Cuenta">
            <Text style={[styles.initials, { color: colors.text }]}>{initials(user?.email)}</Text>
          </IconButton>
        </View>
      </View>

      {menuOpen && (
        <View style={[styles.menu, { borderColor: colors.border, backgroundColor: colors.background }]}>
          <Text style={[styles.menuEmail, { color: colors.muted }]} numberOfLines={1}>
            {user?.email}
          </Text>
          <Pressable
            onPress={signOut}
            accessibilityRole="button"
            style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: colors.pressed }]}
          >
            <Feather name="log-out" size={14} color={colors.text} />
            <Text style={[styles.menuItemText, { color: colors.text }]}>Salir</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: colors.text }]}>¿Qué falta?</Text>
        {count > 0 && (
          <View style={[styles.pill, { backgroundColor: colors.accentSoft }]}>
            <Text style={[styles.pillText, { color: colors.accentText }]}>
              {count} {count === 1 ? 'ítem' : 'ítems'}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.inputRow}>
        <TextInput
          style={[
            styles.input,
            { color: colors.text, borderColor: focused ? colors.accent : colors.border },
            focused && { boxShadow: `0 0 0 3px ${colors.accentRing}` },
          ]}
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={onAdd}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Agregar algo…"
          placeholderTextColor={colors.faint}
          returnKeyType="done"
          submitBehavior="submit"
          maxLength={100}
        />
        {dictadoDisponible && (
          <Pressable
            style={({ pressed }) => [
              styles.addButton,
              styles.micButton,
              { borderColor: colors.border },
              pressed && { backgroundColor: colors.pressed },
            ]}
            onPress={() => setDictando(true)}
            accessibilityRole="button"
            accessibilityLabel="Dictar ítems por voz"
          >
            <Feather name="mic" size={17} color={colors.text} />
          </Pressable>
        )}
        <Pressable
          style={({ pressed }) => [
            styles.addButton,
            { backgroundColor: colors.primary },
            pressed && styles.pressed,
          ]}
          onPress={onAdd}
          accessibilityRole="button"
          accessibilityLabel="Agregar ítem"
        >
          <Feather name="plus" size={18} color={colors.onPrimary} />
        </Pressable>
      </View>

      {Platform.OS === 'web' && (
        <Pressable
          onPress={onOpenSuper}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.superButton,
            { borderColor: colors.border },
            pressed && { backgroundColor: colors.pressed },
          ]}
        >
          <Feather name="shopping-cart" size={15} color={colors.accentText} />
          <Text style={[styles.superText, { color: colors.text }]}>Estoy en el súper: escanear compras</Text>
        </Pressable>
      )}

      {error && <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.muted} />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          style={[styles.list, items.length > 0 && { borderTopColor: colors.divider }]}
          contentContainerStyle={items.length === 0 && styles.center}
          keyboardShouldPersistTaps="handled"
          stickySectionHeadersEnabled={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No falta nada</Text>
              <Text style={[styles.emptyBody, { color: colors.muted }]}>
                Cuando alguien agregue algo, aparece acá.
              </Text>
            </View>
          }
          renderSectionHeader={({ section }) =>
            section.key === 'comprados' ? (
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.secondary }]}>
                  Comprados · {comprados.length}
                </Text>
                <Pressable
                  onPress={onClear}
                  accessibilityRole="button"
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.clearButton,
                    { borderColor: confirmClear ? colors.danger : colors.border },
                    pressed && { backgroundColor: colors.pressed },
                  ]}
                >
                  <Feather
                    name="trash-2"
                    size={12}
                    color={confirmClear ? colors.danger : colors.secondary}
                  />
                  <Text
                    style={[
                      styles.clearText,
                      { color: confirmClear ? colors.danger : colors.secondary },
                    ]}
                  >
                    {confirmClear ? '¿Seguro? Tocá de nuevo' : 'Limpiar comprados'}
                  </Text>
                </Pressable>
              </View>
            ) : pendientes.length === 0 && comprados.length > 0 ? (
              <Text style={[styles.allDone, { color: colors.muted }]}>
                Está todo comprado. 🎉
              </Text>
            ) : null
          }
          renderItem={({ item }) => (
            <ItemRow item={item} now={now} onToggle={onToggle} onDelete={onDelete} />
          )}
        />
      )}

      {dictando && <VoiceSheet onClose={() => setDictando(false)} onAdd={onAddDictado} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  topBar: {
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  brandText: { fontFamily: fonts.medium, fontSize: 14 },
  actions: { flexDirection: 'row', gap: 6 },
  initials: { fontFamily: fonts.medium, fontSize: 11 },
  menu: {
    position: 'absolute',
    top: 58,
    right: 20,
    zIndex: 30,
    minWidth: 200,
    borderWidth: 1,
    borderRadius: 10,
    padding: 6,
  },
  menuEmail: { fontFamily: fonts.mono, fontSize: 11, paddingHorizontal: 8, paddingVertical: 6 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 6,
  },
  menuItemText: { fontFamily: fonts.regular, fontSize: 14 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: { fontFamily: fonts.semibold, fontSize: 28, letterSpacing: -0.8 },
  pill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  pillText: { fontFamily: fonts.mono, fontSize: 12 },
  inputRow: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  input: {
    flex: 1,
    height: 42,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontFamily: fonts.regular,
    fontSize: 15,
    // Sin el contorno del navegador en web: el foco se marca con el borde verde.
    outlineStyle: 'none' as 'solid',
  },
  addButton: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButton: { borderWidth: 1 },
  superButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    marginTop: -6,
    marginBottom: 16,
  },
  superText: { fontFamily: fonts.medium, fontSize: 14 },
  pressed: { opacity: 0.8 },
  error: { fontFamily: fonts.regular, fontSize: 13, marginBottom: 12 },
  list: { flex: 1, borderTopWidth: 1, borderTopColor: 'transparent' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 22,
    paddingBottom: 8,
  },
  sectionTitle: { fontFamily: fonts.medium, fontSize: 13 },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 28,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 8,
  },
  clearText: { fontFamily: fonts.medium, fontSize: 12 },
  allDone: { fontFamily: fonts.regular, fontSize: 14, paddingVertical: 16, textAlign: 'center' },
  center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', gap: 4 },
  emptyTitle: { fontFamily: fonts.medium, fontSize: 15 },
  emptyBody: { fontFamily: fonts.regular, fontSize: 13 },
});
