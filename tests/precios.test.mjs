import { test } from 'node:test';
import assert from 'node:assert/strict';
import { consultarPrecio, fmtDistancia, fmtPrecio, nombreCorto, obtenerZona } from '../src/precios/preciosClaros.ts';
import { crearFiltroCodigos } from '../src/scanner/dedupe.ts';

// Respuestas con el formato que devolvió Precios Claros en la prueba desde el celular.
const SUCURSALES = {
  sucursales: [
    { id: '15-1-100', banderaDescripcion: 'Toledo', direccion: 'Av.Constitucion 4386', localidad: 'Mar Del Plata', distanciaNumero: 0.84 },
    { id: '9-1-200', banderaDescripcion: 'Supermercados DIA', direccion: 'AV COLON 3755', localidad: 'Mar Del Plata', distanciaNumero: 1.66 },
    { id: '20-1-300', banderaDescripcion: 'Cooperativa Obrera Limitada de Consumo y Vivienda', direccion: 'Jara 1234', localidad: 'Mar Del Plata', distanciaNumero: 3.2 },
    { id: '1-1-999', banderaDescripcion: 'Carrefour Market', direccion: 'Lejos 1', localidad: 'Otra', distanciaNumero: 55 },
  ],
};
const PRODUCTO = {
  producto: { id: '7793704000805', nombre: 'Yerba Mate con Palo Liebig Original 500 Gr', marca: 'LIEBIG', presentacion: '500.0 gr' },
  sucursales: [
    { id: '15-1-100', banderaDescripcion: 'Toledo', preciosProducto: { precioLista: 3700 } },
    { id: '9-1-200', banderaDescripcion: 'Supermercados DIA', message: 'Producto no disponible' },
    { id: '20-1-300', banderaDescripcion: 'Cooperativa Obrera Limitada de Consumo y Vivienda', preciosProducto: { precioLista: '3490.00' } },
  ],
};

const llamadas = [];
globalThis.fetch = async (url) => {
  llamadas.push(String(url));
  const u = new URL(url);
  const json = u.pathname.endsWith('/sucursales')
    ? SUCURSALES
    : u.searchParams.get('id_producto') === '7793704000805'
      ? PRODUCTO
      : u.searchParams.get('id_producto') === '111'
        ? { producto: { nombre: 'Sin precio', marca: 'X' }, sucursales: [{ id: '15-1-100', message: 'no' }] }
        : { producto: {}, sucursales: [] };
  return { ok: true, status: 200, json: async () => json };
};

test('zona: filtra súpers a más de 40 km y acorta nombres', async () => {
  const z = await obtenerZona({ lat: -37.97, lng: -57.54 });
  assert.equal(z.localidad, 'Mar Del Plata');
  assert.deepEqual(z.sucursales.map((s) => s.nombre), ['Toledo', 'Día', 'La Coope']);
  assert.equal(z.sucursales[1].direccion, 'Av Colon 3755');
});

test('zona: no se vuelve a pedir si no te moviste', async () => {
  const antes = llamadas.length;
  await obtenerZona({ lat: -37.971, lng: -57.541 });
  assert.equal(llamadas.length, antes);
});

test('precio: típico, más barato, cantidad de súpers', async () => {
  const z = await obtenerZona({ lat: -37.97, lng: -57.54 });
  const r = await consultarPrecio('7793704000805', z);
  assert.equal(r.estado, 'ok');
  assert.equal(r.tipico, 3595);
  assert.equal(r.masBarato.precio, 3490);
  assert.equal(r.masBarato.sucursal.nombre, 'La Coope');
  assert.equal(r.masBarato.sucursal.distanciaKm, 3.2);
  assert.equal(r.cantidadSuper, 2);
  assert.equal(r.marca, 'Liebig');
});

test('precio: sin precios en la zona y no encontrado', async () => {
  const z = await obtenerZona({ lat: -37.97, lng: -57.54 });
  assert.equal((await consultarPrecio('111', z)).estado, 'sin-precios');
  assert.equal((await consultarPrecio('222', z)).estado, 'no-encontrado');
});

test('formatos', () => {
  assert.equal(fmtPrecio(3595), '$3.595');
  assert.equal(fmtDistancia(0.84), '840 m');
  assert.equal(fmtDistancia(3.2), '3,2 km');
  assert.equal(nombreCorto('Hipermercado Carrefour'), 'Carrefour');
  assert.equal(nombreCorto('SUPERMERCADOS TOLEDO'), 'Toledo');
});

test('lector: no repite el mismo código mientras sigue en cuadro', () => {
  const f = crearFiltroCodigos(2500);
  assert.equal(f('779', 0), true);
  assert.equal(f('779', 200), false);
  assert.equal(f('779', 2000), false);
  assert.equal(f('123', 2100), true);
  assert.equal(f('779', 2200), true);
  assert.equal(f('779', 6000), true); // volvió a aparecer después de sacarlo de cuadro
});
