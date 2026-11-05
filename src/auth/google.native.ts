// En la app nativa (Android) el login con Google necesita un build propio con
// el SDK nativo de Google; se agrega cuando armemos la distribución para Android.
export const googleSignInAvailable = false;

export async function signInWithGoogle(): Promise<void> {
  throw Object.assign(new Error('Google sign-in no disponible en esta plataforma'), {
    code: 'auth/operation-not-supported-in-this-environment',
  });
}
