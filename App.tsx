import { Geist_400Regular } from '@expo-google-fonts/geist/400Regular';
import { Geist_500Medium } from '@expo-google-fonts/geist/500Medium';
import { Geist_600SemiBold } from '@expo-google-fonts/geist/600SemiBold';
import { GeistMono_400Regular } from '@expo-google-fonts/geist-mono/400Regular';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, SafeAreaView, StyleSheet, View } from 'react-native';
import { AuthProvider, useAuth } from './src/auth/AuthProvider';
import { ListScreen } from './src/screens/ListScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { PriceScannerScreen } from './src/screens/PriceScannerScreen';
import { ThemeProvider, useTheme } from './src/theme';

function Root() {
  const { user, initializing } = useAuth();
  const { colors } = useTheme();

  if (initializing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.muted} />
      </View>
    );
  }

  return user ? <SignedIn /> : <LoginScreen />;
}

function SignedIn() {
  const [pantalla, setPantalla] = useState<'lista' | 'precios'>('lista');
  if (pantalla === 'precios') return <PriceScannerScreen onClose={() => setPantalla('lista')} />;
  return <ListScreen onOpenPrecios={() => setPantalla('precios')} />;
}

function Shell() {
  const { colors, scheme } = useTheme();

  // En web, que el fondo de la página acompañe al tema (evita bordes blancos al hacer scroll).
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.body.style.backgroundColor = colors.background;
      document.documentElement.style.colorScheme = scheme;
      // La barra del sistema (y la de la app instalada) sigue el tema elegido.
      document
        .querySelectorAll('meta[name="theme-color"]')
        .forEach((m) => m.setAttribute('content', colors.background));
    }
  }, [colors.background, scheme]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <Root />
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    </SafeAreaView>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    GeistMono_400Regular,
  });

  // Si las fuentes fallan, seguimos con las del sistema en lugar de quedar en blanco.
  if (!fontsLoaded && !fontError) return null;

  return (
    <ThemeProvider>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
