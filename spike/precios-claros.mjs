// Prueba técnica: ¿se pueden obtener precios de Precios Claros en vivo?
// Usa el servicio (no oficial) que usa el sitio preciosclaros.gob.ar.
const BASE = 'https://d3e6htiiul5ek9.cloudfront.net/prod';
const OUR_ORIGIN = 'https://lista-compas-3763b.web.app';

const LUGARES = [
  { nombre: 'CABA (Obelisco)', lat: -34.6037, lng: -58.3816 },
  { nombre: 'Mar del Plata', lat: -38.0055, lng: -57.5426 },
  { nombre: 'Córdoba', lat: -31.4201, lng: -64.1888 },
  { nombre: 'Esquel (ciudad chica)', lat: -42.9115, lng: -71.3195 },
];
const BUSQUEDAS = ['leche la serenisima', 'yerba playadito', 'papel higienico', 'shampoo', 'garrafa'];
const EANS_CONOCIDOS = ['7794000960091', '7790040614000', '7790580708405'];

const out = [];
const log = (...a) => { const s = a.join(' '); console.log(s); out.push(s); };

async function get(path, params, headers = {}) {
  const url = `${BASE}/${path}?${new URLSearchParams(params)}`;
  const t0 = Date.now();
  try {
    const res = await fetch(url, { headers });
    const text = await res.text();
    let json = null; try { json = JSON.parse(text); } catch {}
    return { status: res.status, ms: Date.now() - t0, headers: Object.fromEntries(res.headers), json, text: text.slice(0, 400) };
  } catch (e) {
    return { status: 0, ms: Date.now() - t0, error: String(e) };
  }
}

const median = (a) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

// 1) CORS: ¿acepta consultas que vengan desde nuestra app?
log('## 1. CORS (consultas desde nuestro dominio)');
const corsGet = await get('sucursales', { lat: -34.6037, lng: -58.3816, limit: 5 }, { Origin: OUR_ORIGIN });
log(`GET con Origin=${OUR_ORIGIN} → status ${corsGet.status}, access-control-allow-origin: ${corsGet.headers?.['access-control-allow-origin'] ?? '(ausente)'}`);
try {
  const pre = await fetch(`${BASE}/sucursales?lat=-34.6&lng=-58.38&limit=1`, { method: 'OPTIONS', headers: { Origin: OUR_ORIGIN, 'Access-Control-Request-Method': 'GET' } });
  log(`OPTIONS (preflight) → status ${pre.status}, allow-origin: ${pre.headers.get('access-control-allow-origin') ?? '(ausente)'}`);
} catch (e) { log('OPTIONS error', String(e)); }
const noOrigin = await get('sucursales', { lat: -34.6037, lng: -58.3816, limit: 5 });
log(`GET sin headers → status ${noOrigin.status}`);
if (noOrigin.status !== 200) log('cuerpo:', noOrigin.text ?? noOrigin.error);

// 2) Sucursales cercanas, búsqueda y precios por lugar
for (const lugar of LUGARES) {
  log(`\n## 2. ${lugar.nombre}`);
  const suc = await get('sucursales', { lat: lugar.lat, lng: lugar.lng, limit: 30 }, { Origin: OUR_ORIGIN });
  const lista = suc.json?.sucursales ?? [];
  log(`sucursales: status ${suc.status}, ${suc.ms} ms, ${lista.length} encontradas (total informado: ${suc.json?.total ?? '?'})`);
  if (!lista.length) { log('respuesta:', suc.text ?? suc.error); continue; }
  const conDist = lista.map((s) => ({ id: s.id, nombre: `${s.banderaDescripcion ?? s.comercioRazonSocial ?? ''} ${s.direccion ?? ''}`.trim(), dist: Number(s.distanciaNumero ?? NaN), loc: s.localidad }));
  log('más cercanas:', conDist.slice(0, 4).map((s) => `${s.nombre} (${s.dist} km)`).join(' | '));
  log('más lejana de las 30:', `${conDist.at(-1).dist} km`);
  const dentro40 = conDist.filter((s) => !(s.dist > 40));
  const ids = dentro40.map((s) => s.id).join(',');
  log(`dentro de 40 km: ${dentro40.length}`);

  const eans = new Set(EANS_CONOCIDOS);
  for (const q of BUSQUEDAS) {
    const r = await get('productos', { string: q, array_sucursales: ids, offset: 0, limit: 5, sort: '-cant_sucursales_disponible' }, { Origin: OUR_ORIGIN });
    const prods = r.json?.productos ?? [];
    log(`buscar "${q}": status ${r.status}, ${r.ms} ms, ${r.json?.total ?? prods.length} resultados → ${prods.slice(0, 3).map((p) => `${p.id} ${p.nombre} (${p.presentacion}) $${p.precioMin}-${p.precioMax}`).join(' | ') || (r.text ?? r.error)}`);
    if (prods[0]?.id) eans.add(prods[0].id);
  }

  for (const ean of [...eans].slice(0, 6)) {
    const r = await get('producto', { id_producto: ean, array_sucursales: ids, limit: 30 }, { Origin: OUR_ORIGIN });
    const p = r.json?.producto;
    const precios = (r.json?.sucursales ?? [])
      .filter((s) => !s.message && s.preciosProducto?.precioLista)
      .map((s) => ({ precio: Number(s.preciosProducto.precioLista), donde: `${s.banderaDescripcion ?? ''} ${s.direccion ?? ''}`.trim() }));
    if (!p) { log(`EAN ${ean}: status ${r.status}, ${r.ms} ms, sin producto → ${r.text ?? r.error}`); continue; }
    if (!precios.length) { log(`EAN ${ean}: ${p.nombre} (${p.presentacion}) — sin precios en la zona`); continue; }
    const min = precios.reduce((a, b) => (b.precio < a.precio ? b : a));
    log(`EAN ${ean}: ${p.marca} ${p.nombre} (${p.presentacion}) — ${precios.length} súpers, típico $${median(precios.map((x) => x.precio))}, más barato $${min.precio} en ${min.donde} [${r.ms} ms]`);
  }
}

// Muestra cruda de una respuesta de producto para conocer el formato
log('\n## 3. Muestra cruda de /producto');
const raw = await get('producto', { id_producto: '7794000960091', array_sucursales: (await get('sucursales', { lat: -34.6037, lng: -58.3816, limit: 3 })).json?.sucursales?.map((s) => s.id).join(',') ?? '', limit: 3 });
log('```\n' + JSON.stringify(raw.json ?? raw.text, null, 1).slice(0, 2500) + '\n```');

const fs = await import('node:fs');
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, out.join('\n') + '\n');
