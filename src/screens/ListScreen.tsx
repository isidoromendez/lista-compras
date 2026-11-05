import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../auth/AuthProvider';
import { addItem, deleteItem, subscribeToItems, type Item } from '../items/items';
import { colors } from '../theme';

export function ListScreen() {
  const { user, signOut } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

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

  const onDelete = (item: Item) => {
    deleteItem(item.id).catch((e) => {
      console.warn('Error eliminando ítem', e);
      setError('No se pudo eliminar el ítem.');
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Lista de compras</Text>
        <Pressable onPress={signOut} accessibilityRole="button" hitSlop={8}>
          <Text style={styles.signOut}>Salir</Text>
        </Pressable>
      </View>
      <Text style={styles.userLine} numberOfLines={1}>
        {user?.email}
      </Text>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={onAdd}
          placeholder="¿Qué hay que comprar?"
          placeholderTextColor={colors.muted}
          returnKeyType="done"
          maxLength={100}
        />
        <Pressable
          style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
          onPress={onAdd}
          accessibilityRole="button"
          accessibilityLabel="Agregar ítem"
        >
          <Text style={styles.addButtonText}>+</Text>
        </Pressable>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      {loading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={items.length === 0 && styles.emptyContainer}
          ListEmptyComponent={
            <Text style={styles.empty}>La lista está vacía. ¡Agregá lo que falte!</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.item}>
              <View style={styles.itemBody}>
                <Text style={styles.itemText}>{item.nombre}</Text>
                <Text style={styles.itemMeta} numberOfLines={1}>
                  {item.creadoPor}
                </Text>
              </View>
              <Pressable
                onPress={() => onDelete(item)}
                style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={`Eliminar ${item.nombre}`}
                hitSlop={8}
              >
                <Text style={styles.deleteText}>✕</Text>
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingTop: 32,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 32, fontWeight: '700', color: colors.text },
  signOut: { color: colors.primary, fontSize: 15, fontWeight: '600' },
  userLine: { color: colors.muted, fontSize: 13, marginTop: 4, marginBottom: 20 },
  inputRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addButton: {
    width: 48,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6 },
  addButtonText: { color: '#fff', fontSize: 26, fontWeight: '600', marginTop: -2 },
  error: { color: colors.danger, fontSize: 14, marginBottom: 12 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 12,
    paddingLeft: 14,
    paddingRight: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#eceef2',
  },
  itemBody: { flex: 1 },
  itemText: { fontSize: 16, color: colors.text },
  itemMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: { fontSize: 18, color: colors.muted },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
  empty: { textAlign: 'center', color: colors.muted, fontSize: 15 },
});
