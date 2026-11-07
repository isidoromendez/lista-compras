// Qué ítem de la lista corresponde a un producto escaneado.
// "Leche" coincide con "La Serenísima Leche Larga Vida 1 L"; "Papel higiénico" con
// "Campanita Papel Higiénico Hoja Simple".

type ItemLista = { id: string; nombre: string; comprado: boolean; ean: string | null };

const VACIAS = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'con', 'sin', 'para', 'por', 'en', 'y', 'un', 'una']);

export const normalizar = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const raiz = (w: string) => (w.length > 4 && w.endsWith('es') ? w.slice(0, -2) : w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w);

function palabras(s: string) {
  return normalizar(s)
    .split(/[^a-z0-9ñ]+/)
    .filter((w) => w.length >= 3 && !VACIAS.has(w))
    .map(raiz);
}

export function puntaje(nombreItem: string, textoProducto: string) {
  const delItem = palabras(nombreItem);
  if (!delItem.length) return 0;
  const delProducto = palabras(textoProducto);
  const coinciden = delItem.filter((w) => delProducto.some((p) => p === w || (w.length >= 4 && p.startsWith(w))));
  return coinciden.length / delItem.length;
}

// Ítems pendientes que podrían ser el producto escaneado, del más probable al menos.
export function candidatos<T extends ItemLista>(items: T[], ean: string, textoProducto: string | null): T[] {
  const pendientes = items.filter((i) => !i.comprado);
  const mismoCodigo = pendientes.filter((i) => i.ean === ean);
  if (!textoProducto) return mismoCodigo;
  const porNombre = pendientes
    .filter((i) => i.ean !== ean)
    .map((i) => ({ i, p: puntaje(i.nombre, textoProducto), n: palabras(i.nombre).length }))
    .filter((x) => x.p >= 0.5)
    // Mayor coincidencia primero; a igual coincidencia, el nombre más específico.
    .sort((a, b) => b.p - a.p || b.n - a.n)
    .map((x) => x.i);
  return [...mismoCodigo, ...porNombre];
}

export function yaTachado<T extends ItemLista>(items: T[], ean: string): T | undefined {
  return items.find((i) => i.comprado && i.ean === ean);
}
