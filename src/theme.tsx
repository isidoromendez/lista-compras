import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

// Estilo minimalista: blanco y negro con un único acento verde menta.
const light = {
  background: '#ffffff',
  text: '#0a0a0a',
  secondary: '#666666',
  muted: '#8f8f8f',
  faint: '#a1a1a1',
  border: '#e5e5e5',
  divider: '#ebebeb',
  primary: '#0a0a0a',
  onPrimary: '#ffffff',
  accent: '#10a37f',
  accentText: '#0d8a6a',
  accentSoft: '#e8f7f1',
  accentRing: 'rgba(16, 163, 127, 0.14)',
  danger: '#d93036',
  pressed: '#f5f5f5',
};

const dark: typeof light = {
  background: '#0a0a0a',
  text: '#ededed',
  secondary: '#a1a1a1',
  muted: '#7a7a7a',
  faint: '#6f6f6f',
  border: '#2a2a2a',
  divider: '#1f1f1f',
  primary: '#ededed',
  onPrimary: '#0a0a0a',
  accent: '#2fd19b',
  accentText: '#2fd19b',
  accentSoft: '#0f2a22',
  accentRing: 'rgba(47, 209, 155, 0.18)',
  danger: '#ff6166',
  pressed: '#1a1a1a',
};

export type Colors = typeof light;
export type Scheme = 'light' | 'dark';
type Preference = 'system' | Scheme;

export const fonts = {
  regular: 'Geist_400Regular',
  medium: 'Geist_500Medium',
  semibold: 'Geist_600SemiBold',
  mono: 'GeistMono_400Regular',
};

const STORAGE_KEY = 'tema';

type ThemeState = { colors: Colors; scheme: Scheme; toggle: () => void };
const ThemeContext = createContext<ThemeState | null>(null);

// Arranca según el sistema; si el usuario toca el botón sol/luna, se recuerda su elección.
export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [preference, setPreference] = useState<Preference>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v === 'light' || v === 'dark') setPreference(v);
      })
      .catch(() => {});
  }, []);

  const scheme: Scheme = preference === 'system' ? system : preference;

  const value = useMemo<ThemeState>(
    () => ({
      scheme,
      colors: scheme === 'dark' ? dark : light,
      toggle: () => {
        const next: Scheme = scheme === 'dark' ? 'light' : 'dark';
        setPreference(next);
        AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
      },
    }),
    [scheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de <ThemeProvider>');
  return ctx;
}
