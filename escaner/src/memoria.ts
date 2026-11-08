// Última zona conocida, guardada en el celular. Sirve cuando adentro del súper el GPS no
// llega: se arranca con la zona de la última vez y se actualiza si el GPS después responde.
import type { Zona } from './precios.ts';

const CLAVE = 'ultima-zona';
export const VALIDEZ_MS = 30 * 86_400_000; // la lista de súpers cambia poco
export const MOVIDO_KM = 3; // más lejos que esto, la zona guardada ya no sirve

export type ZonaGuardada = { zona: Zona; en: number };

type Almacen = Pick<Storage, 'getItem' | 'setItem'>;
const almacen = (): Almacen | null => {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
};

export function guardarZona(zona: Zona, ahora = Date.now(), a: Almacen | null = almacen()) {
  try {
    a?.setItem(CLAVE, JSON.stringify({ zona, en: ahora }));
  } catch {
    /* sin espacio o sin almacenamiento: no pasa nada */
  }
}

export function leerZona(ahora = Date.now(), a: Almacen | null = almacen()): ZonaGuardada | null {
  try {
    const g = JSON.parse(a?.getItem(CLAVE) ?? 'null') as ZonaGuardada | null;
    if (!g?.zona?.sucursales?.length || !Number.isFinite(g.en) || ahora - g.en > VALIDEZ_MS) return null;
    return g;
  } catch {
    return null;
  }
}

export function haceCuanto(ms: number): string {
  const min = Math.round(ms / 60_000);
  if (min < 2) return 'recién';
  if (min < 60) return `hace ${min} minutos`;
  const h = Math.round(min / 60);
  if (h < 24) return h === 1 ? 'hace una hora' : `hace ${h} horas`;
  const d = Math.round(h / 24);
  return d === 1 ? 'ayer' : `hace ${d} días`;
}
