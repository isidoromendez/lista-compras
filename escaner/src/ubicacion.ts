import type { Ubicacion } from './precios';

// Ubicación del celular: se usa solo en el dispositivo para buscar los súpers cercanos.
export function pedirUbicacion(): Promise<Ubicacion> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('sin-geolocalizacion'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) => reject(new Error(e.code === e.PERMISSION_DENIED ? 'permiso' : 'no-disponible')),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 5 * 60_000 },
    );
  });
}
