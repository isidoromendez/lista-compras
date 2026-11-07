// Consulta de precios en Precios Claros (Secretaría de Comercio).
// Usa el servicio que usa el sitio preciosclaros.gob.ar: no es oficial ni documentado,
// solo responde desde Argentina y puede cambiar sin aviso.
const BASE = 'https://d3e6htiiul5ek9.cloudfront.net/prod';
const RADIO_KM = 40;

export type Ubicacion = { lat: number; lng: number };

export type Sucursal = {
  id: string;
  nombre: string; // nombre corto de la cadena ("La Coope", "Día")
  direccion: string;
  localidad: string;
  distanciaKm: number | null;
};

export type Zona = { ubicacion: Ubicacion; sucursales: Sucursal[]; localidad: string };

export type PrecioEnSucursal = { precio: number; sucursal: Sucursal };

export type ResultadoPrecio =
  | { estado: 'ok'; ean: string; nombre: string; marca: string; presentacion: string; tipico: number; masBarato: PrecioEnSucursal; cantidadSuper: number }
  | { estado: 'sin-precios'; ean: string; nombre: string; marca: string; presentacion: string }
  | { estado: 'no-encontrado'; ean: string };

type SucursalApi = {
  id: string;
  banderaDescripcion?: string;
  comercioRazonSocial?: string;
  direccion?: string;
  localidad?: string;
  distanciaNumero?: number | string;
  message?: string;
  preciosProducto?: { precioLista?: number | string };
};

async function get<T>(path: string, params: Record<string, string | number>): Promise<T> {
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
  const res = await fetch(`${BASE}/${path}?${qs}`);
  if (!res.ok) throw new Error(`Precios Claros respondió ${res.status}`);
  return res.json() as Promise<T>;
}

const titulo = (s: string) =>
  s === s.toUpperCase() ? s.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase()) : s;

// Nombres cortos para las cadenas: "Cooperativa Obrera Limitada de Consumo y Vivienda" → "La Coope".
export function nombreCorto(bandera: string): string {
  const b = bandera.trim();
  if (/cooperativa obrera/i.test(b)) return 'La Coope';
  if (/^supermercados?\s+dia\b/i.test(b) || /^dia\b/i.test(b)) return 'Día';
  if (/carrefour/i.test(b)) return 'Carrefour';
  if (/changomas|chango\s*m[aá]s/i.test(b)) return 'ChangoMás';
  const limpio = titulo(b.replace(/^(supermercados?|hipermercados?|autoservicio)\s+/i, ''));
  return limpio.length > 22 ? limpio.slice(0, 21) + '…' : limpio;
}

export function fmtDistancia(km: number | null) {
  if (km == null || Number.isNaN(km)) return '';
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1).replace('.', ',')} km`;
}

export const fmtPrecio = (n: number) => '$' + Math.round(n).toLocaleString('es-AR');

const mediana = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

function distanciaKm(a: Ubicacion, b: Ubicacion) {
  const r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r;
  const dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

// La zona se pide una vez y se reutiliza mientras no te muevas más de 3 km
// ni pasen 30 minutos.
let zonaCache: { zona: Zona; en: number } | null = null;

export async function obtenerZona(ubicacion: Ubicacion): Promise<Zona> {
  if (zonaCache && Date.now() - zonaCache.en < 30 * 60_000 && distanciaKm(zonaCache.zona.ubicacion, ubicacion) < 3) {
    return zonaCache.zona;
  }
  const r = await get<{ sucursales?: SucursalApi[] }>('sucursales', { lat: ubicacion.lat, lng: ubicacion.lng, limit: 30 });
  const sucursales = (r.sucursales ?? [])
    .map<Sucursal>((s) => ({
      id: s.id,
      nombre: nombreCorto(s.banderaDescripcion || s.comercioRazonSocial || 'Súper'),
      direccion: titulo(s.direccion ?? ''),
      localidad: titulo(s.localidad ?? ''),
      distanciaKm: s.distanciaNumero != null ? Number(s.distanciaNumero) : null,
    }))
    .filter((s) => s.distanciaKm == null || s.distanciaKm <= RADIO_KM);
  const zona = { ubicacion, sucursales, localidad: sucursales[0]?.localidad ?? '' };
  zonaCache = { zona, en: Date.now() };
  return zona;
}

export async function consultarPrecio(ean: string, zona: Zona): Promise<ResultadoPrecio> {
  const r = await get<{ producto?: { nombre?: string; marca?: string; presentacion?: string }; sucursales?: SucursalApi[] }>(
    'producto',
    { id_producto: ean, array_sucursales: zona.sucursales.map((s) => s.id).join(','), limit: 30 },
  );
  const p = r.producto;
  if (!p?.nombre) return { estado: 'no-encontrado', ean };

  const porId = new Map(zona.sucursales.map((s) => [s.id, s]));
  const precios: PrecioEnSucursal[] = (r.sucursales ?? [])
    .filter((s) => !s.message && s.preciosProducto?.precioLista != null)
    .map((s) => ({
      precio: Number(s.preciosProducto!.precioLista),
      sucursal: porId.get(s.id) ?? {
        id: s.id,
        nombre: nombreCorto(s.banderaDescripcion || 'Súper'),
        direccion: titulo(s.direccion ?? ''),
        localidad: '',
        distanciaKm: null,
      },
    }))
    .filter((x) => x.precio > 0);

  const base = { ean, nombre: p.nombre, marca: titulo(p.marca ?? ''), presentacion: p.presentacion ?? '' };
  if (!precios.length) return { estado: 'sin-precios', ...base };
  const masBarato = precios.reduce((a, b) => (b.precio < a.precio ? b : a));
  return {
    estado: 'ok',
    ...base,
    tipico: mediana(precios.map((x) => x.precio)),
    masBarato,
    cantidadSuper: precios.length,
  };
}
