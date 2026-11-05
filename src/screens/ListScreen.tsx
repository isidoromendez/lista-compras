import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../auth/AuthProvider';
import { colors } from '../theme';

type Item = { id: string; title: string };

export function ListScreen() {
  const { user, signOut } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [draft, setDraft] = useState('');

  const addItem = () => {
    const title = draft.trim();
    if (!title) return;
    setItems((prev) => [{ id: Date.now().toString(), title }, ...prev]);
    setDraft('');
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
          onSubmitEditing={addItem}
          placeholder="¿Qué hay que comprar?"
          placeholderTextColor={colors.muted}
          returnKeyType="done"
        />
        <Pressable
          style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
          onPress={addItem}
          accessibilityRole="button"
          accessibilityLabel="Agregar ítem"
        >
          <Text style={styles.addButtonText}>+</Text>
        </Pressable>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={items.length === 0 && styles.emptyContainer}
        ListEmptyComponent={
          <Text style={styles.empty}>La lista está vacía. ¡Agregá lo que falte!</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.itemText}>{item.title}</Text>
          </View>
        )}
      />
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
  pressed: { opacity: 0.7 },
  addButtonText: { color: '#fff', fontSize: 26, fontWeight: '600', marginTop: -2 },
  item: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#eceef2',
  },
  itemText: { fontSize: 16, color: colors.text },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
  empty: { textAlign: 'center', color: colors.muted, fontSize: 15 },
});
