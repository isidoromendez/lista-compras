import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth, initializeAuth, type Auth } from 'firebase/auth';
// Los tipos públicos de firebase/auth no exponen esta función, pero el build
// de React Native sí la incluye (Metro resuelve la condición "react-native").
// @ts-expect-error -- ver comentario anterior
import { getReactNativePersistence } from 'firebase/auth';
import { app } from './app';

// En Android/iOS la sesión se guarda en AsyncStorage para no pedir login cada vez.
function createAuth(): Auth {
  try {
    return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch {
    // Ya inicializado (por ejemplo, tras un recarga en caliente).
    return getAuth(app);
  }
}

export const auth = createAuth();
