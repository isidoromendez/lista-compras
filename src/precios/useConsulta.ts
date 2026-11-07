import { useCallback, useRef, useState } from 'react';
import type { EstadoConsulta } from '../components/PriceCard';
import { consultarPrecio } from './preciosClaros';
import type { EstadoZona } from './useZona';

// Consulta el precio de un código en la zona actual. Si llega un código nuevo
// mientras se consultaba otro, gana el último.
export function useConsulta(zona: EstadoZona) {
  const [consulta, setConsulta] = useState<EstadoConsulta | null>(null);
  const ultima = useRef(0);

  const consultar = useCallback(
    async (ean: string): Promise<EstadoConsulta> => {
      const id = ++ultima.current;
      setConsulta({ estado: 'buscando', ean });
      let r: EstadoConsulta;
      if (zona.estado !== 'ok') {
        r = { estado: 'error', ean, mensaje: zona.estado === 'error' ? zona.mensaje : 'Todavía estoy buscando tu zona.' };
      } else {
        try {
          r = await consultarPrecio(ean, zona.zona);
        } catch {
          r = { estado: 'error', ean, mensaje: 'Revisá la conexión y volvé a escanear.' };
        }
      }
      if (id === ultima.current) setConsulta(r);
      return r;
    },
    [zona],
  );

  return { consulta, setConsulta, consultar };
}
