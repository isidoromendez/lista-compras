import type { Respuesta } from './precios';
import type { Lectura } from './ubicacion';

// Todo lo técnico queda acá, para la hoja de datos técnicos (el bichito).
export const diag = {
  version: '',
  ubicacion: null as Lectura | null,
  zona: null as (Omit<Respuesta, 'json'> & { respondidas: number; dentro40: number; masCercana: string }) | null,
  producto: null as (Omit<Respuesta, 'json'> & { ean: string; resumen: string }) | null,
  crudoZona: null as unknown,
  crudoProducto: null as unknown,
  registro: [] as { hora: string; texto: string }[],
};

const hora = () => new Date().toLocaleTimeString('es-AR', { hour12: false });

export function anotar(texto: string) {
  diag.registro.push({ hora: hora(), texto });
  if (diag.registro.length > 200) diag.registro.shift();
}

export function exportar() {
  return JSON.stringify({ ...diag, navegador: navigator.userAgent, pantalla: `${innerWidth}x${innerHeight}`, ahora: new Date().toISOString() }, null, 1);
}
