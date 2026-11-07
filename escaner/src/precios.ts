// Consulta de precios en Precios Claros (Secretaría de Comercio, Gobierno Nacional).
// Usa el servicio que usa el sitio preciosclaros.gob.ar: no es oficial ni documentado,
// solo responde desde Argentina y puede cambiar sin aviso.
const BASE = 'https://d3e6htiiul5ek9.cloudfront.net/prod';
export const RADIO_KM = 40;

export type Ubicacion = { lat: number; lng: number };

export type Sucursal = {
  clave: string; // "comercio-bandera-sucursal", por ejemplo "21-1-28"
  cadena: string; // nombre corto: "La Coope", "Día"
  direccion: string;
  localidad: string;
  distanciaKm: number | null;
};

export type Zona = { ubicacion: Ubicacion; sucursales: Sucursal[]; localidad: string };

export type PrecioEn = { precio: number; sucursal: Sucursal };
export type Promo = PrecioEn & { descripcion: string };

export type Resultado =
  | {
      estado: 'ok';
      ean: string;
      nombre: string;
      marca: string;
      presentacion: string;
      tipico: number; // mediana de los precios de lista actualizados hoy
      masBarato: PrecioEn;
      promo: Promo | null; // la promo más barata de la zona, si hay
      cantidadSuper: number; // súpers con precio actualizado hoy
      desactualizados: number; // súpers que tienen el producto pero no actualizaron hoy
      soloDesactualizados: boolean; // ningún súper actualizó hoy: el precio puede estar viejo
    }
  | { estado: 'sin-precios'; ean: string; nombre: string; marca: string; presentacion: string }
  | { estado: 'no-encontrado'; ean: string };

// ---- Formato real de las respuestas (verificado el 7/11/2026) ----

type SucursalZonaApi = {
  id: string; // "21-1-28"
  comercioId?: number | string;
  banderaId?: number | string;
  sucursalId?: string;
  banderaDescripcion?: string;
  comercioRazonSocial?: string;
  direccion?: string;
  localidad?: string;
  lat?: string;
  lng?: string;
  distanciaNumero?: number | string;
};

type PromoApi = { precio?: string | number; descripcion?: string };

type SucursalProductoApi = {
  id: string; // solo el número de sucursal: "28"
  comercioId?: number | string;
  banderaId?: number | string;
  message?: string; // "La sucursal no contiene el producto."
  banderaDescripcion?: string;
  direccion?: string;
  localidad?: string;
  lat?: string;
  lng?: string;
  actualizadoHoy?: boolean;
  preciosProducto?: { precioLista?: number | string; promo1?: PromoApi; promo2?: PromoApi };
};

type ProductoApi = { producto?: { nombre?: string; marca?: string; presentacion?: string }; sucursales?: SucursalProductoApi[] };

// ---- Utilidades ----

const titulo = (s: string) =>
  s === s.toUpperCase() ? s.toLowerCase().replace(/(^|[\s/.-])\S/g, (c) => c.toUpperCase()) : s;

// "Cooperativa Obrera Limitada de Consumo y Vivienda" → "La Coope"
export function nombreCorto(bandera: string): string {
  const b = (bandera || '').trim();
  if (!b) return 'Súper';
  if (/cooperativa obrera/i.test(b)) return 'La Coope';
  if (/^supermercados?\s+dia\b/i.test(b) || /^dia\b/i.test(b)) return 'Día';
  if (/carrefour/i.test(b)) return 'Carrefour';
  if (/changomas|chango\s*m[aá]s/i.test(b)) return 'ChangoMás';
  const limpio = titulo(b.replace(/^(supermercados?|hipermercados?|autoservicio)\s+/i, ''));
  return limpio.length > 22 ? limpio.slice(0, 21) + '…' : limpio;
}

// La zona identifica la sucursal como "21-1-28"; el producto, como id "28" + comercio + bandera.
export function claveSucursal(s: { id: string; comercioId?: number | string; banderaId?: number | string }): string {
  if (String(s.id).includes('-')) return String(s.id);
  return `${s.comercioId}-${s.banderaId}-${s.id}`;
}

export function distanciaKm(a: Ubicacion, b: Ubicacion) {
  const r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r;
  const dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

// Precios y distancias: positivos. Devuelve null si viene vacío ("") o inválido.
const numero = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
};

const mediana = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

// Datos sucios que vienen de la API: "Sin marca", "None none", "500.0 gr".
export function limpiarMarca(m?: string) {
  const t = (m ?? '').trim();
  return !t || /^sin marca$/i.test(t) || /^none$/i.test(t) ? '' : titulo(t);
}
export function limpiarPresentacion(p?: string) {
  const t = (p ?? '').trim();
  if (!t || /none/i.test(t)) return '';
  const m = t.match(/^([\d.]+)\s*(.+)$/);
  if (!m) return t;
  const n = Number(m[1]);
  const u = m[2].toLowerCase().replace(/^gr$/, 'g').replace(/^lt$/, 'l').replace(/^un$/, 'u.');
  return `${Number.isInteger(n) ? n : String(n).replace('.', ',')} ${u}`;
}

export const fmtPrecio = (n: number) => '$' + Math.round(n).toLocaleString('es-AR');
export function fmtDistancia(km: number | null) {
  if (km == null || Number.isNaN(km)) return '';
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1).replace('.', ',')} km`;
}

// ---- Consultas ----

async function get<T>(path: string, params: Record<string, string | number>): Promise<T> {
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
  const res = await fetch(`${BASE}/${path}?${qs}`);
  if (!res.ok) throw new Error(`Precios Claros respondió ${res.status}`);
  return res.json() as Promise<T>;
}

// La zona se reutiliza mientras no te muevas más de 3 km ni pasen 30 minutos.
let cache: { zona: Zona; en: number } | null = null;

export async function obtenerZona(ubicacion: Ubicacion): Promise<Zona> {
  if (cache && Date.now() - cache.en < 30 * 60_000 && distanciaKm(cache.zona.ubicacion, ubicacion) < 3) return cache.zona;
  const r = await get<{ sucursales?: SucursalZonaApi[] }>('sucursales', { lat: ubicacion.lat, lng: ubicacion.lng, limit: 30 });
  const sucursales = (r.sucursales ?? [])
    .map<Sucursal>((s) => ({
      clave: claveSucursal(s),
      cadena: nombreCorto(s.banderaDescripcion || s.comercioRazonSocial || ''),
      direccion: titulo(s.direccion ?? ''),
      localidad: titulo(s.localidad ?? ''),
      distanciaKm: numero(s.distanciaNumero),
    }))
    .filter((s) => s.distanciaKm == null || s.distanciaKm <= RADIO_KM);
  const zona = { ubicacion, sucursales, localidad: sucursales[0]?.localidad ?? '' };
  cache = { zona, en: Date.now() };
  return zona;
}

export function _limpiarCache() {
  cache = null;
}

export function interpretarProducto(ean: string, r: ProductoApi, zona: Zona): Resultado {
  const p = r.producto;
  if (!p?.nombre) return { estado: 'no-encontrado', ean };

  const porClave = new Map(zona.sucursales.map((s) => [s.clave, s]));
  const conPrecio = (r.sucursales ?? [])
    .filter((s) => !s.message && numero(s.preciosProducto?.precioLista) != null)
    .map((s) => {
      const clave = claveSucursal(s);
      // Coordenadas: en Argentina son negativas (no usar numero(), que descarta <= 0).
      const lat = Number(s.lat);
      const lng = Number(s.lng);
      const conCoordenadas = s.lat != null && s.lng != null && Number.isFinite(lat) && Number.isFinite(lng);
      const sucursal: Sucursal = porClave.get(clave) ?? {
        clave,
        cadena: nombreCorto(s.banderaDescripcion ?? ''),
        direccion: titulo(s.direccion ?? ''),
        localidad: titulo(s.localidad ?? ''),
        distanciaKm: conCoordenadas ? distanciaKm(zona.ubicacion, { lat, lng }) : null,
      };
      const promos = [s.preciosProducto?.promo1, s.preciosProducto?.promo2]
        .map((x) => ({ precio: numero(x?.precio), descripcion: (x?.descripcion ?? '').trim() }))
        .filter((x): x is { precio: number; descripcion: string } => x.precio != null);
      return { precio: numero(s.preciosProducto!.precioLista)!, sucursal, hoy: s.actualizadoHoy !== false, promos };
    });

  const base = { ean, nombre: p.nombre.trim(), marca: limpiarMarca(p.marca), presentacion: limpiarPresentacion(p.presentacion) };
  if (!conPrecio.length) return { estado: 'sin-precios', ...base };

  // El precio sugerido usa solo lo actualizado hoy; si nadie actualizó, se usa lo que hay y se avisa.
  const deHoy = conPrecio.filter((x) => x.hoy);
  const usados = deHoy.length ? deHoy : conPrecio;
  const masBarato = usados.reduce((a, b) => (b.precio < a.precio ? b : a));
  const promos = usados.flatMap((x) => x.promos.map((pr) => ({ ...pr, sucursal: x.sucursal })));
  const promo = promos.length ? promos.reduce((a, b) => (b.precio < a.precio ? b : a)) : null;

  return {
    estado: 'ok',
    ...base,
    tipico: mediana(usados.map((x) => x.precio)),
    masBarato: { precio: masBarato.precio, sucursal: masBarato.sucursal },
    // La promo solo interesa si deja el producto más barato que el mejor precio de lista.
    promo: promo && promo.precio < masBarato.precio ? promo : null,
    cantidadSuper: usados.length,
    desactualizados: conPrecio.length - deHoy.length,
    soloDesactualizados: deHoy.length === 0,
  };
}

export async function consultarPrecio(ean: string, zona: Zona): Promise<Resultado> {
  const r = await get<ProductoApi>('producto', {
    id_producto: ean,
    array_sucursales: zona.sucursales.map((s) => s.clave).join(','),
    limit: 30,
  });
  return interpretarProducto(ean, r, zona);
}
