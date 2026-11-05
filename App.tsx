import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, SafeAreaView, StyleSheet, View } from 'react-native';
import { AuthProvider, useAuth } from './src/auth/AuthProvider';
import { useMembership } from './src/auth/membership';
import { ListScreen } from './src/screens/ListScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { NoAccessScreen } from './src/screens/NoAccessScreen';
import { colors } from './src/theme';

function Loading() {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

function SignedIn({ email }: { email: string | null }) {
  const { status, retry } = useMembership(email);

  if (status === 'checking') return <Loading />;
  if (status === 'member') return <ListScreen />;
  return <NoAccessScreen reason={status} onRetry={retry} />;
}

function Root() {
  const { user, initializing } = useAuth();

  if (initializing) return <Loading />;
  if (!user) return <LoginScreen />;
  // key: si cambia el usuario, se vuelve a verificar el acceso desde cero.
  return <SignedIn key={user.uid} email={user.email} />;
}

export default function App() {
  return (
    <AuthProvider>
      <SafeAreaView style={styles.safe}>
        <Root />
      </SafeAreaView>
      <StatusBar style="dark" />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
