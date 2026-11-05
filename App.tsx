import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, SafeAreaView, StyleSheet, View } from 'react-native';
import { AuthProvider, useAuth } from './src/auth/AuthProvider';
import { ListScreen } from './src/screens/ListScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { colors } from './src/theme';

function Root() {
  const { user, initializing } = useAuth();

  if (initializing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return user ? <ListScreen /> : <LoginScreen />;
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
