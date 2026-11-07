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

// Qué se puede hacer en este celular:
// - dialogo: el navegador ofrece instalarla con un toque.
// - iphone: hay que hacerlo a mano desde el botón Compartir.
// - otra-app: está abierta dentro de otra app (Facebook, Instagram…): hay que pasar a Chrome.
// - no-se-puede: el celular o el navegador no lo permite; se ofrece guardarla de otra forma.
export type Caso = 'dialogo' | 'iphone' | 'otra-app' | 'no-se-puede';
export function comoInstalar(ua = navigator.userAgent, hayDialogo = !!aviso): Caso {
  if (hayDialogo) return 'dialogo';
  if (/iPhone|iPad|iPod/.test(ua)) return 'iphone';
  if (/; wv\)|FBAN|FBAV|Instagram|Line\/|TikTok|musical_ly/.test(ua)) return 'otra-app';
  return 'no-se-puede';
}

// true si se abrió el diálogo de Chrome; false si hay que mostrar instrucciones.
export async function instalar(): Promise<boolean> {
  if (!aviso) return false;
  const a = aviso;
  aviso = null;
  await a.prompt();
  await a.userChoice.catch(() => null);
  return true;
}
