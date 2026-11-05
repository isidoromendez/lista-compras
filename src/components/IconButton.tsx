import type { ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../theme';

type Props = { onPress: () => void; label: string; children: ReactNode };

// Botón cuadrado chico con borde fino (tema, cuenta).
export function IconButton({ onPress, label, children }: Props) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => [
        styles.button,
        { borderColor: colors.border },
        pressed && { backgroundColor: colors.pressed },
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 32,
    height: 32,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
