import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const isWeb = Platform.OS === 'web' && typeof window !== 'undefined';

// El navegador avisa una sola vez que la app se puede instalar, a veces antes
// de que se muestre cualquier pantalla. Se escucha desde que carga el módulo y
// se comparte con todas las pantallas.
let deferred: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

if (isWeb) {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    installed = true;
    notify();
  });
}

function isStandalone() {
  if (!isWeb) return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export type InstallResult = 'prompted' | 'manual';

export function useInstallPrompt() {
  const [, force] = useState(0);

  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  return {
    // Se muestra en web mientras no se esté usando ya la app instalada.
    showInstall: isWeb && !installed && !isStandalone(),
    // Intenta el diálogo nativo de instalación; si el navegador no lo ofrece,
    // devuelve 'manual' para mostrar las instrucciones.
    install: async (): Promise<InstallResult> => {
      if (!deferred) return 'manual';
      const e = deferred;
      deferred = null;
      await e.prompt();
      await e.userChoice.catch(() => null);
      notify();
      return 'prompted';
    },
  };
}
