import Feather from '@expo/vector-icons/Feather';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { fonts, useTheme } from '../theme';
import { parsearDictado, type ItemDictado } from '../voice/parse';
import { useDictado } from '../voice/useDictado';

type Props = {
  onClose: () => void;
  onAdd: (items: ItemDictado[]) => void;
};

type Fila = ItemDictado & { key: string };
let claves = 0;

// Dictado por voz: escucha, separa en ítems y muestra una vista previa editable
// antes de agregar nada a la lista.
export function VoiceSheet({ onClose, onAdd }: Props) {
  const { colors } = useTheme();
  const { estado, segmentos, parcial, error, empezar, terminar, cancelar } = useDictado();
  const [filas, setFilas] = useState<Fila[] | null>(null);

  useEffect(() => {
    empezar();
  }, [empezar]);

  // Al terminar de escuchar, se arma la vista previa.
  useEffect(() => {
    if (estado === 'terminado' && filas === null && !error) {
      setFilas(parsearDictado(segmentos).map((i) => ({ ...i, key: String(claves++) })));
    }
  }, [estado, filas, segmentos, error]);

  const cerrar = () => {
    cancelar();
    onClose();
  };
  const redictar = () => {
    setFilas(null);
    empezar();
  };
  const validas = (filas ?? []).filter((f) => f.nombre.trim());
  // Mientras se dicta, se muestra cómo va quedando separada la lista.
  const enVivo = useMemo(() => parsearDictado(segmentos), [segmentos]);
  const editar = (key: string, cambio: Partial<ItemDictado>) =>
    setFilas((fs) => fs && fs.map((f) => (f.key === key ? { ...f, ...cambio } : f)));

  const inputStyle = [styles.input, { color: colors.text, borderColor: colors.border }];

  return (
    <View style={[styles.sheet, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          {filas === null ? 'Dictar lista' : 'Revisá antes de agregar'}
        </Text>
        <Pressable onPress={cerrar} hitSlop={10} accessibilityRole="button" accessibilityLabel="Cerrar">
          <Feather name="x" size={20} color={colors.secondary} />
        </Pressable>
      </View>

      {filas === null ? (
        <View style={styles.listening}>
          <View
            style={[
              styles.mic,
              { backgroundColor: estado === 'escuchando' ? colors.accentSoft : colors.pressed },
            ]}
          >
            <Feather name="mic" size={30} color={estado === 'escuchando' ? colors.accentText : colors.muted} />
          </View>
          <Text style={[styles.state, { color: colors.text }]}>
            {error ? 'Algo salió mal' : estado === 'escuchando' ? 'Te escucho…' : 'Un momento…'}
          </Text>
          <Text style={[styles.hint, { color: colors.muted }]}>
            {error ?? 'Hacé una pausa entre cosa y cosa (o decí "y"). Cuando termines, tocá Listo.'}
          </Text>
          {(enVivo.length > 0 || parcial) && (
            <View style={styles.vivo}>
              {enVivo.map((i, n) => (
                <View key={n} style={[styles.vivoItem, { borderColor: colors.border }]}>
                  <Text style={[styles.vivoText, { color: colors.text }]}>
                    {i.nombre}
                    {i.cantidad ? <Text style={{ color: colors.muted }}> · {i.cantidad}</Text> : null}
                  </Text>
                </View>
              ))}
              {parcial ? <Text style={[styles.parcial, { color: colors.faint }]}>{parcial}…</Text> : null}
            </View>
          )}
          <View style={styles.buttons}>
            {error ? (
              <Boton texto="Probar de nuevo" onPress={redictar} primario />
            ) : (
              <Boton texto="Listo" onPress={terminar} primario />
            )}
          </View>
        </View>
      ) : (
        <>
          {filas.length === 0 ? (
            <Text style={[styles.hint, { color: colors.muted, marginTop: 24 }]}>
              No entendí ningún ítem. Probá dictar de nuevo.
            </Text>
          ) : (
            <ScrollView style={styles.preview} keyboardShouldPersistTaps="handled">
              {filas.map((f) => (
                <View key={f.key} style={[styles.row, { borderBottomColor: colors.divider }]}>
                  <TextInput
                    style={[inputStyle, styles.nombre]}
                    value={f.nombre}
                    onChangeText={(t) => editar(f.key, { nombre: t })}
                    placeholder="Ítem"
                    placeholderTextColor={colors.faint}
                    maxLength={100}
                  />
                  <TextInput
                    style={[inputStyle, styles.cantidad]}
                    value={f.cantidad ?? ''}
                    onChangeText={(t) => editar(f.key, { cantidad: t || null })}
                    placeholder="cant."
                    placeholderTextColor={colors.faint}
                    maxLength={20}
                  />
                  <Pressable
                    onPress={() => setFilas((fs) => fs && fs.filter((x) => x.key !== f.key))}
                    hitSlop={6}
                    style={styles.quitar}
                    accessibilityRole="button"
                    accessibilityLabel={`Quitar ${f.nombre}`}
                  >
                    <Feather name="x" size={16} color={colors.faint} />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          )}
          <View style={styles.buttons}>
            <Boton texto="Volver a dictar" onPress={redictar} icono="mic" />
            {validas.length > 0 && (
              <Boton
                texto={`Agregar ${validas.length} ${validas.length === 1 ? 'ítem' : 'ítems'}`}
                onPress={() => onAdd(validas.map(({ nombre, cantidad }) => ({ nombre: nombre.trim(), cantidad: cantidad?.trim() || null })))}
                primario
              />
            )}
          </View>
        </>
      )}
    </View>
  );
}

function Boton({ texto, onPress, primario, icono }: { texto: string; onPress: () => void; primario?: boolean; icono?: 'mic' }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.boton,
        primario
          ? { backgroundColor: colors.primary }
          : { borderWidth: 1, borderColor: colors.border, backgroundColor: pressed ? colors.pressed : 'transparent' },
        primario && pressed && { opacity: 0.85 },
      ]}
    >
      {icono && <Feather name={icono} size={15} color={colors.text} />}
      <Text style={[styles.botonTexto, { color: primario ? colors.onPrimary : colors.text }]}>{texto}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sheet: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  title: { fontFamily: fonts.semibold, fontSize: 22, letterSpacing: -0.5 },
  listening: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingBottom: 40 },
  mic: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  state: { fontFamily: fonts.medium, fontSize: 17 },
  hint: { fontFamily: fonts.regular, fontSize: 14, textAlign: 'center', lineHeight: 20, maxWidth: 300 },
  vivo: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 14 },
  vivoItem: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5 },
  vivoText: { fontFamily: fonts.regular, fontSize: 14 },
  parcial: { fontFamily: fonts.regular, fontSize: 14, alignSelf: 'center' },
  preview: { flex: 1, marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1 },
  input: {
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontFamily: fonts.regular,
    fontSize: 15,
    outlineStyle: 'none' as 'solid',
  },
  nombre: { flex: 1 },
  cantidad: { width: 82 },
  quitar: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  buttons: { flexDirection: 'row', gap: 8, marginTop: 16, alignSelf: 'stretch' },
  boton: { flex: 1, height: 46, borderRadius: 8, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  botonTexto: { fontFamily: fonts.medium, fontSize: 15 },
});
