// Convierte lo dictado ("hay que comprar dos leches, un kilo de papa…") en ítems.
// Reglas simples, pensadas para frases de lista de compras en español rioplatense.

export type ItemDictado = { nombre: string; cantidad: string | null };

const NUMEROS: Record<string, number> = {
  un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7,
  ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, quince: 15, veinte: 20,
  medio: 0.5, media: 0.5,
};

// Unidades: [variantes habladas, etiqueta singular, etiqueta plural]
const UNIDADES: [string[], string, string][] = [
  [['kilo', 'kilos', 'kg', 'kgs', 'kilogramo', 'kilogramos'], 'kg', 'kg'],
  [['gramo', 'gramos', 'gr', 'grs', 'g'], 'g', 'g'],
  [['litro', 'litros', 'lt', 'lts', 'l'], 'l', 'l'],
  [['docena', 'docenas'], 'docena', 'docenas'],
  [['paquete', 'paquetes'], 'paquete', 'paquetes'],
  [['caja', 'cajas'], 'caja', 'cajas'],
  [['botella', 'botellas'], 'botella', 'botellas'],
  [['lata', 'latas'], 'lata', 'latas'],
  [['bolsa', 'bolsas'], 'bolsa', 'bolsas'],
  [['sobre', 'sobres'], 'sobre', 'sobres'],
  [['frasco', 'frascos'], 'frasco', 'frascos'],
  [['rollo', 'rollos'], 'rollo', 'rollos'],
  [['pack', 'packs'], 'pack', 'packs'],
  [['atado', 'atados'], 'atado', 'atados'],
  [['maple', 'maples'], 'maple', 'maples'],
  [['bandeja', 'bandejas'], 'bandeja', 'bandejas'],
  [['sachet', 'sachets'], 'sachet', 'sachets'],
  [['pote', 'potes'], 'pote', 'potes'],
  [['barra', 'barras'], 'barra', 'barras'],
];

// Frases de relleno que además separan ítems ("hay que comprar X hay que comprar Y").
const RELLENO =
  /\b(?:hay que (?:comprar|traer)|tenemos que (?:comprar|traer)|tengo que (?:comprar|traer)|necesitamos|necesito|nos falta|nos faltan|faltan?|comprar|traer|agrega|agregá|agregar|anota|anotá|anotar|por favor|tambi[eé]n|adem[aá]s|despu[eé]s|y despu[eé]s|coma|otra cosa|y tambi[eé]n)\b/g;

const PREPOSICIONES = new Set(['de', 'con', 'sin', 'para', 'en', 'a', 'del']);
const ARTICULOS = new Set(['el', 'la', 'los', 'las', 'unos', 'unas', 'algo', 'alguna', 'algunas', 'algunos']);

const esNumero = (w: string) => w in NUMEROS || /^\d+(_\d+)?$/.test(w);
const aNumero = (w: string) => (w in NUMEROS ? NUMEROS[w] : Number(w.replace('_', '.')));
const unidadDe = (w: string) => UNIDADES.find(([vs]) => vs.includes(w));

function fmtNumero(n: number) {
  if (n === 0.5) return '½';
  if (n === 0.25) return '¼';
  return Number.isInteger(n) ? String(n) : String(n).replace('.', ',');
}

function singular(palabra: string) {
  if (palabra.length < 4) return palabra;
  if (palabra.endsWith('ces')) return palabra.slice(0, -3) + 'z';
  if (palabra.endsWith('ones')) return palabra.slice(0, -4) + 'ón';
  if (/[lnrdj]es$/.test(palabra)) return palabra.slice(0, -2);
  if (palabra.endsWith('s')) return palabra.slice(0, -1);
  return palabra;
}

// "leches descremadas de campo" → "leche descremada de campo" (solo antes de la preposición)
function singularizar(palabras: string[]) {
  const out: string[] = [];
  let corte = false;
  for (const p of palabras) {
    if (PREPOSICIONES.has(p)) corte = true;
    out.push(corte ? p : singular(p));
  }
  return out;
}

const capitalizar = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function parsearFragmento(fragmento: string): ItemDictado | null {
  let palabras = fragmento.split(/\s+/).filter(Boolean);
  while (palabras.length && ARTICULOS.has(palabras[0])) palabras = palabras.slice(1);
  if (!palabras.length) return null;

  let cantidad: string | null = null;
  if (esNumero(palabras[0])) {
    let n = aNumero(palabras[0]);
    let i = 1;
    // "un cuarto de/kilo", "medio kilo"
    if (n === 1 && palabras[1] === 'cuarto') { n = 0.25; i = 2; }
    const unidad = palabras[i] ? unidadDe(palabras[i]) : undefined;
    if (unidad) {
      i += 1;
      cantidad = `${fmtNumero(n)} ${n > 1 ? unidad[2] : unidad[1]}`;
    } else if (n === 0.25 || n === 0.5) {
      cantidad = `${fmtNumero(n)} kg`; // "medio de queso", "un cuarto de jamón"
    } else if (n > 1) {
      cantidad = fmtNumero(n);
    }
    palabras = palabras.slice(i);
    if (palabras[0] === 'de') palabras = palabras.slice(1);
    if (cantidad && !unidad && n > 1) palabras = singularizar(palabras);
  }
  if (!palabras.length) return null;
  return { nombre: capitalizar(palabras.join(' ')), cantidad };
}

// `segmentos`: lo que el reconocimiento de voz devolvió entre pausas.
// Cada pausa también cuenta como separador entre ítems.
export function parsearDictado(segmentos: string | string[]): ItemDictado[] {
  const texto = (Array.isArray(segmentos) ? segmentos.join(', ') : segmentos)
    .toLowerCase()
    .replace(/[¿?¡!"]/g, ' ')
    .replace(/(\d)[.,](\d)/g, '$1_$2') // "1,5 litros": el decimal no separa ítems
    .replace(RELLENO, ',')
    .replace(/\s+/g, ' ');

  const fragmentos = texto
    .split(/[,.;:]|\s+y\s+|\s+e\s+(?=[ií])/)
    // Un número también arranca un ítem nuevo: "dos leches un kilo de papa".
    .flatMap((f) => f.trim().split(/\s+(?=(?:un|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|quince|veinte|medio|media|\d+(?:_\d+)?)\s)/))
    .map((f) => f.trim())
    .filter(Boolean);

  const items: ItemDictado[] = [];
  for (const f of fragmentos) {
    const item = parsearFragmento(f);
    if (item) items.push(item);
  }
  return items;
}
