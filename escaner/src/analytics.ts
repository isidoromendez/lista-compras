import { GA_MEASUREMENT_ID } from './config';

// Medición de uso con Google Analytics 4. No se manda la ubicación exacta:
// solo la localidad de la zona (que ya es pública: es la de los súpers cercanos).
type Gtag = (...args: unknown[]) => void;
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
  }
}

export const medicionActiva = /^G-[A-Z0-9]+$/.test(GA_MEASUREMENT_ID);

export function iniciarMedicion() {
  if (!medicionActiva) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID, {
    // La app instalada se distingue de la web abierta en el navegador.
    modo_app: matchMedia('(display-mode: standalone)').matches ? 'instalada' : 'navegador',
  });
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(s);
}

export type Evento =
  | { nombre: 'zona_lista'; localidad: string; supers: number }
  | { nombre: 'zona_error'; motivo: string; detalle?: string }
  | { nombre: 'escaneo'; resultado: 'ok' | 'sin_precios' | 'no_encontrado' | 'error'; ean: string; producto?: string; localidad?: string; supers?: number; con_promo?: boolean }
  | { nombre: 'borrar_historial'; cantidad: number }
  | { nombre: 'instalar_toque'; con_dialogo: boolean }
  | { nombre: 'app_instalada' }
  | { nombre: 'semaforo'; veredicto: 'barato' | 'normal' | 'caro' }
  | { nombre: 'debug_abierto' };

export function medir(e: Evento) {
  if (!medicionActiva || !window.gtag) return;
  const { nombre, ...params } = e;
  window.gtag('event', nombre, params);
}
