import type { Ubicacion } from './precios';

export const PRECISION_BUSCADA_M = 50;
const ESPERA_MAXIMA_MS = 15_000;

export type Lectura = Ubicacion & { precisionM: number; ms: number; lecturas: number; buenaPrecision: boolean };

// Ubicación del celular (se usa solo en el dispositivo, para buscar los súpers cercanos).
// Escucha las lecturas del GPS hasta tener ±50 m o mejor; si en 15 s no llega,
// se queda con la mejor que consiguió.
export function pedirUbicacion(onLectura?: (l: Lectura) => void): Promise<Lectura> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('sin-geolocalizacion'));
    const inicio = performance.now();
    let mejor: Lectura | null = null;
    let lecturas = 0;
    let terminado = false;

    const terminar = (l: Lectura | null, error?: Error) => {
      if (terminado) return;
      terminado = true;
      navigator.geolocation.clearWatch(id);
      clearTimeout(timer);
      if (l) resolve(l);
      else reject(error ?? new Error('no-disponible'));
    };

    const id = navigator.geolocation.watchPosition(
      (p) => {
        lecturas += 1;
        const l: Lectura = {
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          precisionM: Math.round(p.coords.accuracy),
          ms: Math.round(performance.now() - inicio),
          lecturas,
          buenaPrecision: p.coords.accuracy <= PRECISION_BUSCADA_M,
        };
        onLectura?.(l);
        if (!mejor || l.precisionM < mejor.precisionM) mejor = l;
        if (l.buenaPrecision) terminar(l);
      },
      (e) => {
        if (e.code === e.PERMISSION_DENIED) terminar(null, new Error('permiso'));
        else if (mejor) terminar(mejor);
        // otros errores: se sigue esperando hasta el tiempo máximo
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: ESPERA_MAXIMA_MS },
    );

    const timer = setTimeout(() => terminar(mejor, new Error('no-disponible')), ESPERA_MAXIMA_MS);
  });
}
