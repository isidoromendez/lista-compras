import Feather from '@expo/vector-icons/Feather';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Item } from '../items/items';
import { fonts, useTheme } from '../theme';
import { shortName, timeAgo } from '../utils/format';

type Props = {
  item: Item;
  now: number;
  onToggle: (item: Item) => void;
  onDelete: (item: Item) => void;
};

// Un renglón de la lista: casilla para tachar, nombre (con cantidad) y botón de borrar.
export function ItemRow({ item, now, onToggle, onDelete }: Props) {
  const { colors } = useTheme();
  const hecho = item.comprado;

  return (
    <View style={[styles.row, { borderBottomColor: colors.divider }]}>
      <Pressable
        onPress={() => onToggle(item)}
        style={styles.main}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: hecho }}
        accessibilityLabel={item.nombre}
      >
        {({ pressed }) => (
          <>
            <View
              style={[
                styles.check,
                { borderColor: hecho ? colors.accent : pressed ? colors.secondary : colors.faint },
                hecho && { backgroundColor: colors.accent },
              ]}
            >
              {hecho && <Feather name="check" size={13} color={colors.background} />}
            </View>
            <View style={styles.body}>
              <Text
                style={[
                  styles.name,
                  { color: hecho ? colors.muted : colors.text },
                  hecho && styles.tachado,
                ]}
              >
                {item.nombre}
                {item.cantidad ? (
                  <Text style={[styles.qty, { color: colors.muted }]}> · {item.cantidad}</Text>
                ) : null}
              </Text>
              <Text style={[styles.meta, { color: colors.muted }]} numberOfLines={1}>
                {hecho
                  ? `${shortName(item.compradoPor)} lo compró · ${timeAgo(item.compradoEn, now)}`
                  : `${shortName(item.creadoPor)} · ${timeAgo(item.creadoEn, now)}`}
              </Text>
            </View>
          </>
        )}
      </Pressable>
      <Pressable
        onPress={() => onDelete(item)}
        style={({ pressed }) => [styles.delete, pressed && { backgroundColor: colors.pressed }]}
        accessibilityRole="button"
        accessibilityLabel={`Eliminar ${item.nombre}`}
        hitSlop={6}
      >
        {({ pressed }) => <Feather name="x" size={16} color={pressed ? colors.text : colors.faint} />}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1 },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingLeft: 2 },
  check: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1 },
  name: { fontFamily: fonts.regular, fontSize: 15 },
  tachado: { textDecorationLine: 'line-through' },
  qty: { fontFamily: fonts.regular, fontSize: 14 },
  meta: { fontFamily: fonts.mono, fontSize: 11, marginTop: 3 },
  delete: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});
