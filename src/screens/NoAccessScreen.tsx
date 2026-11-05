import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../auth/AuthProvider';
import { colors } from '../theme';

type Props = { reason: 'not-member' | 'error'; onRetry: () => void };

export function NoAccessScreen({ reason, onRetry }: Props) {
  const { user, signOut } = useAuth();
  const notMember = reason === 'not-member';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{notMember ? 'No tenés acceso' : 'Algo salió mal'}</Text>
      <Text style={styles.body}>
        {notMember
          ? `La cuenta ${user?.email ?? ''} no está habilitada para usar la lista. Pedile acceso a quien administra la app.`
          : 'No pudimos verificar tu acceso. Revisá la conexión y probá de nuevo.'}
      </Text>

      {!notMember && (
        <Pressable
          style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
          onPress={onRetry}
          accessibilityRole="button"
        >
          <Text style={styles.primaryText}>Reintentar</Text>
        </Pressable>
      )}
      <Pressable
        style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
        onPress={signOut}
        accessibilityRole="button"
      >
        <Text style={styles.secondaryText}>Salir y usar otra cuenta</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  title: { fontSize: 28, fontWeight: '700', color: colors.text, marginBottom: 10 },
  body: { fontSize: 16, lineHeight: 22, color: colors.muted, marginBottom: 24 },
  primary: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondary: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  secondaryText: { color: colors.text, fontSize: 16, fontWeight: '600' },
  pressed: { opacity: 0.7 },
});
