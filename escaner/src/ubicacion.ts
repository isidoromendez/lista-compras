import type { Ubicacion } from './precios';

function pedir(opciones: PositionOptions): Promise<Ubicacion> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('sin-geolocalizacion'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, precisionM: Math.round(p.coords.accuracy) }),
      (e) => reject(new Error(e.code === e.PERMISSION_DENIED ? 'permiso' : 'no-disponible')),
      opciones,
    );
  });
}

// Ubicación del celular: se usa solo en el dispositivo para buscar los súpers cercanos.
// Primero se pide la ubicación precisa (GPS) y actual; si tarda o falla, la aproximada.
export async function pedirUbicacion(): Promise<Ubicacion> {
  try {
    return await pedir({ enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
  } catch (e) {
    if ((e as Error).message === 'permiso') throw e;
    return pedir({ enableHighAccuracy: false, timeout: 15000, maximumAge: 5 * 60_000 });
  }
}
