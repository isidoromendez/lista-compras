import { useCallback, useEffect, useState } from 'react';
import { obtenerZona, type Zona } from './preciosClaros';
import { pedirUbicacion } from './ubicacion';

export type EstadoZona =
  | { estado: 'buscando' }
  | { estado: 'ok'; zona: Zona }
  | { estado: 'error'; mensaje: string };

// Ubicación del celular → súpers a menos de 40 km (Precios Claros).
export function useZona() {
  const [z, setZ] = useState<EstadoZona>({ estado: 'buscando' });

  const cargar = useCallback(async () => {
    setZ({ estado: 'buscando' });
    let ubicacion;
    try {
      ubicacion = await pedirUbicacion();
    } catch (e) {
      setZ({
        estado: 'error',
        mensaje:
          (e as Error).message === 'permiso'
            ? 'Falta el permiso de ubicación: lo necesito para saber los precios de tu zona.'
            : 'No pude obtener tu ubicación.',
      });
      return;
    }
    try {
      const zona = await obtenerZona(ubicacion);
      setZ(
        zona.sucursales.length
          ? { estado: 'ok', zona }
          : { estado: 'error', mensaje: 'No hay súpers con precios informados a menos de 40 km.' },
      );
    } catch {
      setZ({ estado: 'error', mensaje: 'No se pudo consultar Precios Claros. Revisá la conexión.' });
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return { zona: z, recargar: cargar };
}
