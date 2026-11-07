// Instalación como app (PWA). Chrome avisa una sola vez que se puede instalar.
type Aviso = Event & { prompt: () => Promise<void>; userChoice: Promise<unknown> };
let aviso: Aviso | null = null;
const oyentes = new Set<() => void>();

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  aviso = e as Aviso;
  oyentes.forEach((f) => f());
});

export const yaInstalada = () =>
  matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

export const alCambiar = (f: () => void) => oyentes.add(f);

// true si se abrió el diálogo de Chrome; false si hay que mostrar instrucciones.
export async function instalar(): Promise<boolean> {
  if (!aviso) return false;
  const a = aviso;
  aviso = null;
  await a.prompt();
  await a.userChoice.catch(() => null);
  return true;
}
