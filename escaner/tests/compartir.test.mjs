import { test } from 'node:test';
import assert from 'node:assert/strict';
import { textoCompartir, enlaceProducto } from '../src/compartir.ts';

const suc = (cadena, km) => ({ clave: 'x', cadena, direccion: '', localidad: '', distanciaKm: km });
const ok = {
  estado: 'ok', ean: '7790387000112', nombre: 'Yerba mate', marca: 'Playadito', presentacion: '500 g',
  tipico: 2890, masBarato: { precio: 2650, sucursal: suc('Día', 0.4) },
  promo: { precio: 2400, descripcion: '2do al 50%', sucursal: suc('La Coope', 1.2) },
  cantidadSuper: 5, desactualizados: 0, soloDesactualizados: false, minimo: 2650, cantidadPromos: 1,
};

test('texto completo con oferta y precio de góndola', () => {
  const t = textoCompartir(ok, 'Mar del Plata', 3300);
  assert.match(t, /^Yerba mate · Playadito 500 g\n/);
  assert.match(t, /Por acá en Mar del Plata suele costar \$2\.890\./);
  assert.match(t, /Más barato en Día: \$2\.650 \(a 4 cuadras\)\./);
  assert.match(t, /¡Oferta en La Coope! 2do al 50%: \$2\.400 cada uno\./);
  assert.match(t, /Acá lo vi a \$3\.300: está caro \(\$410 más\)\./);
});

test('un solo súper no dice "más barato" y sin precio de góndola no hay veredicto', () => {
  const t = textoCompartir({ ...ok, cantidadSuper: 1, promo: null }, '');
  assert.doesNotMatch(t, /Más barato|Acá lo vi|Oferta/);
  assert.match(t, /Por acá suele costar/);
});

test('sin precios y enlace', () => {
  assert.match(textoCompartir({ estado: 'sin-precios', ean: '1', nombre: 'Algo', marca: '', presentacion: '' }, 'Batán'), /Ningún súper en Batán/);
  assert.equal(enlaceProducto('7790387000112'), 'https://cuanto-sale.web.app/?p=7790387000112');
});

test('no repite la marca si el nombre ya la trae', () => {
  const t = textoCompartir({ ...ok, nombre: 'Yerba Mate Playadito 500 Gr' }, '');
  assert.match(t, /^Yerba Mate Playadito 500 Gr\n/);
});
