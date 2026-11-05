import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { auth } from '../firebase/auth';
import { signInWithGoogle } from './google';

type AuthState = {
  user: User | null;
  initializing: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        setUser(u);
        setInitializing(false);
      }),
    [],
  );

  const value: AuthState = {
    user,
    initializing,
    signIn: async (email, password) => {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    },
    signInWithGoogle,
    signOut: () => signOut(auth),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}

// El usuario cerró la ventana de Google: no es un error que haya que mostrar.
export function isAuthCancel(error: unknown): boolean {
  const code = (error as { code?: string })?.code ?? '';
  return code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request';
}

// Traduce los códigos de error de Firebase Auth a mensajes para el usuario.
export function authErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/invalid-email':
      return 'El email no es válido.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Email o contraseña incorrectos.';
    case 'auth/user-disabled':
      return 'Esta cuenta está deshabilitada.';
    case 'auth/too-many-requests':
      return 'Demasiados intentos. Probá de nuevo en unos minutos.';
    case 'auth/admin-restricted-operation':
      return 'Esta cuenta no está autorizada. Pedile acceso a quien administra la app.';
    case 'auth/account-exists-with-different-credential':
      return 'Ese email ya entra con otro método. Probá con email y contraseña.';
    case 'auth/popup-blocked':
      return 'El navegador bloqueó la ventana de Google. Permití las ventanas emergentes y probá de nuevo.';
    case 'auth/unauthorized-domain':
      return 'Este sitio no está autorizado para ingresar con Google.';
    case 'auth/network-request-failed':
      return 'Sin conexión. Revisá internet y probá de nuevo.';
    default:
      return 'No se pudo iniciar sesión. Probá de nuevo.';
  }
}
