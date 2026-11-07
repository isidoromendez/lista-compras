// Textos "para Doña Rosa": distancias en cuadras, precios escritos a mano y el semáforo.

// 1 cuadra ≈ 100 m. Hasta 30 cuadras se dice en cuadras; más lejos, en kilómetros.
export function enCuadras(km: number | null | undefined): string {
  if (km == null || !Number.isFinite(km)) return '';
  const cuadras = Math.round(km * 10);
  if (cuadras < 1) return 'a menos de una cuadra';
  if (cuadras === 1) return 'a 1 cuadra';
  if (cuadras <= 30) return `a ${cuadras} cuadras`;
  return `a ${km < 10 ? km.toFixed(1).replace('.', ',') : Math.round(km)} km`;
}

// Precio escrito como lo escribe cualquiera: "3450", "3.450", "$ 3.450", "3450,50", "3.450,5".
export function leerPrecio(texto: string): number | null {
  let t = texto.replace(/[^\d.,]/g, '');
  if (!t) return null;
  const coma = t.lastIndexOf(',');
  if (coma >= 0) {
    // Coma decimal (formato argentino): los puntos son de miles.
    t = t.slice(0, coma).replace(/[.,]/g, '') + '.' + t.slice(coma + 1).replace(/[.,]/g, '');
  } else {
    const partes = t.split('.');
    // "3.450" o "1.234.567": puntos de miles. "2.5" o "2.50": decimal.
    const sonMiles = partes.length > 2 || (partes.length === 2 && partes[1].length === 3);
    t = sonMiles ? partes.join('') : t;
  }
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export type Veredicto = { tipo: 'barato' | 'normal' | 'caro'; diferencia: number };

// Comparado con lo que "suele costar": ±10% es normal.
export const MARGEN_NORMAL = 0.1;
export function semaforo(precioAca: number, suele: number): Veredicto {
  const diferencia = Math.round(precioAca - suele);
  const relativa = (precioAca - suele) / suele;
  if (relativa > MARGEN_NORMAL) return { tipo: 'caro', diferencia };
  if (relativa < -MARGEN_NORMAL) return { tipo: 'barato', diferencia };
  return { tipo: 'normal', diferencia };
}
