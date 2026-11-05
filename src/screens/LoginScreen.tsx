import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { authErrorMessage, isAuthCancel, useAuth } from '../auth/AuthProvider';
import { googleSignInAvailable } from '../auth/google';
import { colors } from '../theme';

export function LoginScreen() {
  const { signInWithGoogle } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      if (!isAuthCancel(e)) setError(authErrorMessage(e));
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Lista de compras</Text>
      <Text style={styles.subtitle}>Ingresá con tu cuenta de Google.</Text>

      {googleSignInAvailable ? (
        <Pressable
          style={({ pressed }) => [
            styles.googleButton,
            loading && styles.disabled,
            pressed && styles.pressed,
          ]}
          onPress={submit}
          disabled={loading}
          accessibilityRole="button"
        >
          {loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <>
              <Text style={styles.googleG}>G</Text>
              <Text style={styles.googleText}>Ingresar con Google</Text>
            </>
          )}
        </Pressable>
      ) : (
        <Text style={styles.notice}>
          Por ahora el ingreso funciona desde la versión web. Abrí la app en el navegador.
        </Text>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      <Text style={styles.hint}>Solo pueden ingresar las cuentas autorizadas.</Text>
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
  title: { fontSize: 32, fontWeight: '700', color: colors.text, marginBottom: 6 },
  subtitle: { fontSize: 15, color: colors.muted, marginBottom: 24 },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 50,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  googleG: { fontSize: 17, fontWeight: '700', color: '#4285F4' },
  googleText: { fontSize: 16, fontWeight: '600', color: colors.text },
  disabled: { opacity: 0.6 },
  pressed: { opacity: 0.7 },
  notice: { fontSize: 15, color: colors.text, lineHeight: 21 },
  error: { color: colors.danger, fontSize: 14, marginTop: 14 },
  hint: { textAlign: 'center', color: colors.muted, fontSize: 13, marginTop: 20 },
});
