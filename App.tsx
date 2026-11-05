import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type Task = { id: string; title: string };

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [draft, setDraft] = useState('');

  const addTask = () => {
    const title = draft.trim();
    if (!title) return;
    setTasks((prev) => [{ id: Date.now().toString(), title }, ...prev]);
    setDraft('');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Lista de compras</Text>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={addTask}
            placeholder="¿Qué hay que comprar?"
            placeholderTextColor="#8a8f98"
            returnKeyType="done"
          />
          <Pressable
            style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
            onPress={addTask}
            accessibilityRole="button"
            accessibilityLabel="Agregar ítem"
          >
            <Text style={styles.addButtonText}>+</Text>
          </Pressable>
        </View>

        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={tasks.length === 0 && styles.emptyContainer}
          ListEmptyComponent={
            <Text style={styles.empty}>La lista está vacía. ¡Agregá lo que falte!</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.task}>
              <Text style={styles.taskText}>{item.title}</Text>
            </View>
          )}
        />
      </View>
      <StatusBar style="dark" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f6f7f9' },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingTop: 32,
  },
  title: { fontSize: 32, fontWeight: '700', color: '#14171c', marginBottom: 20 },
  inputRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#14171c',
    borderWidth: 1,
    borderColor: '#e2e5ea',
  },
  addButton: {
    width: 48,
    borderRadius: 12,
    backgroundColor: '#2f6fed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
  addButtonText: { color: '#fff', fontSize: 26, fontWeight: '600', marginTop: -2 },
  task: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#eceef2',
  },
  taskText: { fontSize: 16, color: '#14171c' },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
  empty: { textAlign: 'center', color: '#8a8f98', fontSize: 15 },
});
