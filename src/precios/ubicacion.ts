import type { Ubicacion } from './preciosClaros';

// Ubicación del celular (solo se usa en el dispositivo para elegir la zona; no se guarda).
export function pedirUbicacion(): Promise<Ubicacion> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('sin-geolocalizacion'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) => reject(new Error(e.code === e.PERMISSION_DENIED ? 'permiso' : 'no-disponible')),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 5 * 60_000 },
    );
  });
}
