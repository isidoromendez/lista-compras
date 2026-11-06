import Feather from '@expo/vector-icons/Feather';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { authErrorMessage, isAuthCancel, useAuth } from '../auth/AuthProvider';
import { googleSignInAvailable } from '../auth/google';
import { IconButton } from '../components/IconButton';
import { InstallButton } from '../components/InstallButton';
import { fonts, useTheme } from '../theme';

export function LoginScreen() {
  const { signInWithGoogle } = useAuth();
  const { colors, scheme, toggle } = useTheme();
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
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <IconButton
          onPress={toggle}
          label={scheme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
          <Feather name={scheme === 'dark' ? 'sun' : 'moon'} size={15} color={colors.secondary} />
        </IconButton>
      </View>

      <View style={styles.container}>
        <View style={[styles.dot, { backgroundColor: colors.accent }]} />
        <Text style={[styles.title, { color: colors.text }]}>Lista de compras</Text>
        <Text style={[styles.subtitle, { color: colors.secondary }]}>
          La lista de la familia, siempre al día.
        </Text>

        {googleSignInAvailable ? (
          <Pressable
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: colors.primary },
              (pressed || loading) && styles.pressed,
            ]}
            onPress={submit}
            disabled={loading}
            accessibilityRole="button"
          >
            {loading ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <>
                <Text style={[styles.googleG, { color: colors.onPrimary }]}>G</Text>
                <Text style={[styles.buttonText, { color: colors.onPrimary }]}>
                  Continuar con Google
                </Text>
              </>
            )}
          </Pressable>
        ) : (
          <Text style={[styles.notice, { color: colors.text }]}>
            Por ahora el ingreso funciona desde la versión web. Abrí la app en el navegador.
          </Text>
        )}

        {error && <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>}

        <InstallButton variant="block" />

        <Text style={[styles.hint, { color: colors.muted }]}>Solo cuentas autorizadas</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: { flexDirection: 'row', justifyContent: 'flex-end', padding: 20 },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    paddingHorizontal: 24,
    justifyContent: 'center',
    paddingBottom: 72,
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginBottom: 16 },
  title: { fontFamily: fonts.semibold, fontSize: 28, letterSpacing: -0.8, marginBottom: 6 },
  subtitle: { fontFamily: fonts.regular, fontSize: 15, marginBottom: 28 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 46,
    borderRadius: 8,
  },
  pressed: { opacity: 0.85 },
  googleG: { fontFamily: fonts.semibold, fontSize: 16 },
  buttonText: { fontFamily: fonts.medium, fontSize: 15 },
  notice: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21 },
  error: { fontFamily: fonts.regular, fontSize: 13, marginTop: 14 },
  hint: { fontFamily: fonts.mono, fontSize: 11, textAlign: 'center', marginTop: 18 },
});
