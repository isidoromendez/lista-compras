import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { authErrorMessage, isAuthCancel, useAuth } from '../auth/AuthProvider';
import { googleSignInAvailable } from '../auth/google';
import { colors } from '../theme';

export function LoginScreen() {
  const { signIn, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !loading;

  const submit = async () => {
    if (!canSubmit) return;
    setError(null);
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (e) {
      setError(authErrorMessage(e));
      setLoading(false);
    }
  };

  const submitGoogle = async () => {
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
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        <Text style={styles.title}>Lista de compras</Text>
        <Text style={styles.subtitle}>Ingresá con la cuenta que te dieron.</Text>

        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="username"
          returnKeyType="next"
        />
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Contraseña"
          placeholderTextColor={colors.muted}
          secureTextEntry
          autoComplete="password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          style={({ pressed }) => [
            styles.button,
            !canSubmit && styles.buttonDisabled,
            pressed && styles.pressed,
          ]}
          onPress={submit}
          disabled={!canSubmit}
          accessibilityRole="button"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Ingresar</Text>
          )}
        </Pressable>

        {googleSignInAvailable && (
          <>
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>o</Text>
              <View style={styles.dividerLine} />
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.googleButton,
                loading && styles.buttonDisabled,
                pressed && styles.pressed,
              ]}
              onPress={submitGoogle}
              disabled={loading}
              accessibilityRole="button"
            >
              <Text style={styles.googleG}>G</Text>
              <Text style={styles.googleText}>Ingresar con Google</Text>
            </Pressable>
          </>
        )}

        <Text style={styles.hint}>
          ¿No tenés cuenta? Pedísela a quien administra la app.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
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
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  error: { color: colors.danger, fontSize: 14, marginBottom: 12 },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.5 },
  pressed: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 18 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { marginHorizontal: 12, color: colors.muted, fontSize: 13 },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: colors.border,
  },
  googleG: { fontSize: 17, fontWeight: '700', color: '#4285F4' },
  googleText: { fontSize: 16, fontWeight: '600', color: colors.text },
  hint: { textAlign: 'center', color: colors.muted, fontSize: 13, marginTop: 20 },
});
