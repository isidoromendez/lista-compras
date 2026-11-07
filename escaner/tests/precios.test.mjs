// Pruebas con respuestas REALES de Precios Claros (Mar del Plata, 7/11/2026).
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  _limpiarCache, claveSucursal, consultarPrecio, fmtDistancia, fmtPrecio, interpretarProducto,
  limpiarMarca, limpiarPresentacion, nombreCorto, obtenerZona,
} from '../src/precios.ts';
import { crearFiltroCodigos } from '../src/dedupe.ts';

const fx = (n) => JSON.parse(readFileSync(new URL(`./fixtures/${n}.json`, import.meta.url)));
const SUCURSALES = fx('sucursales');
const PLAYADITO = fx('producto-playadito');
const SIN_PRECIO = fx('producto-sin-precio');
const UBIC = { lat: -38.03, lng: -57.54 };

// Variante de la respuesta real: una sucursal sin actualizar hoy y otra con promo.
function variante() {
  const r = structuredClone(PLAYADITO);
  const [a, b] = r.sucursales;
  a.actualizadoHoy = false;
  a.preciosProducto.precioLista = 2500; // más barato pero viejo: no debe contar
  b.preciosProducto.promo1 = { descripcion: '2x1', precio: '1400.00', precio_unitario_con_iva: '', precio_unitario_sin_iva: '' };
  r.sucursales.push({ ...structuredClone(b), id: '99', comercioId: 9, banderaId: 2, banderaDescripcion: 'Supermercados DIA', lat: '-38.0', lng: '-57.55', preciosProducto: { ...b.preciosProducto, precioLista: '2790.00', promo1: { descripcion: '', precio: '' } } });
  return r;
}

globalThis.fetch = async (url) => {
  const u = new URL(url);
  const body = u.pathname.endsWith('/sucursales') ? SUCURSALES : u.searchParams.get('id_producto') === '7793704000911' ? PLAYADITO : SIN_PRECIO;
  return { ok: true, status: 200, json: async () => body };
};

beforeEach(() => _limpiarCache());

test('clave de sucursal: la zona y el producto usan formatos distintos', () => {
  assert.equal(claveSucursal(SUCURSALES.sucursales[0]), '21-1-28');
  assert.equal(claveSucursal(PLAYADITO.sucursales[0]), '21-1-28');
});

test('respuesta real: precio, más barato con distancia (antes no aparecía)', async () => {
  const z = await obtenerZona(UBIC);
  const r = await consultarPrecio('7793704000911', z);
  assert.equal(r.estado, 'ok');
  assert.equal(r.marca, 'Playadito');
  assert.equal(r.presentacion, '500 g');
  assert.equal(r.tipico, 2800);
  assert.equal(r.cantidadSuper, 2);
  assert.equal(r.masBarato.sucursal.cadena, 'Toledo');
  assert.equal(r.masBarato.sucursal.distanciaKm, 0.71); // de la zona
  assert.equal(r.promo, null); // las promos vinieron vacías
  assert.equal(r.desactualizados, 0);
});

test('sucursal que no está en la zona: la distancia se calcula con sus coordenadas', async () => {
  const z = await obtenerZona(UBIC);
  const r = interpretarProducto('7793704000911', PLAYADITO, z);
  const juanBJusto = r.estado === 'ok' && r.masBarato.sucursal; // las dos valen 2800: gana la primera
  assert.ok(juanBJusto.distanciaKm != null);
  const r2 = interpretarProducto('7793704000911', { ...PLAYADITO, sucursales: [PLAYADITO.sucursales[1]] }, z);
  assert.equal(r2.masBarato.sucursal.direccion, 'Juan B. Justo 750');
  assert.ok(r2.masBarato.sucursal.distanciaKm > 0.5 && r2.masBarato.sucursal.distanciaKm < 2);
});

test('solo cuentan los precios actualizados hoy; promo más barata', async () => {
  const z = await obtenerZona(UBIC);
  const r = interpretarProducto('7793704000911', variante(), z);
  assert.equal(r.desactualizados, 1);
  assert.equal(r.cantidadSuper, 2);
  assert.equal(r.masBarato.precio, 2790); // el de 2500 no actualizó hoy
  assert.equal(r.masBarato.sucursal.cadena, 'Día');
  assert.equal(r.promo.precio, 1400);
  assert.equal(r.promo.descripcion, '2x1');
});

test('si nadie actualizó hoy, se usa lo que hay y se avisa', async () => {
  const z = await obtenerZona(UBIC);
  const r0 = structuredClone(PLAYADITO);
  r0.sucursales.forEach((s) => s.preciosProducto && (s.actualizadoHoy = false));
  const r = interpretarProducto('7793704000911', r0, z);
  assert.equal(r.soloDesactualizados, true);
  assert.equal(r.tipico, 2800);
});

test('respuesta real sin precios: datos sucios limpiados', async () => {
  const z = await obtenerZona(UBIC);
  const r = await consultarPrecio('7790040152793', z);
  assert.equal(r.estado, 'sin-precios');
  assert.equal(r.marca, '');
  assert.equal(r.presentacion, '');
});

test('no encontrado', async () => {
  const z = await obtenerZona(UBIC);
  assert.equal(interpretarProducto('1', { producto: {}, sucursales: [] }, z).estado, 'no-encontrado');
});

test('formatos y limpieza', () => {
  assert.equal(fmtPrecio(2799.5), '$2.800');
  assert.equal(fmtDistancia(0.71), '710 m');
  assert.equal(fmtDistancia(3.24), '3,2 km');
  assert.equal(nombreCorto('Cooperativa Obrera Limitada de Consumo y Vivienda'), 'La Coope');
  assert.equal(nombreCorto('Supermercados DIA'), 'Día');
  assert.equal(limpiarMarca('Sin marca'), '');
  assert.equal(limpiarPresentacion('None none'), '');
  assert.equal(limpiarPresentacion('1.5 lt'), '1,5 l');
});

test('lector: no repite el mismo código mientras sigue en cuadro', () => {
  const f = crearFiltroCodigos(2500);
  assert.equal(f('779', 0), true);
  assert.equal(f('779', 2000), false);
  assert.equal(f('123', 2100), true);
  assert.equal(f('779', 6000), true);
});
