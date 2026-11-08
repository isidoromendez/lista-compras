import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guardarZona, leerZona, haceCuanto, VALIDEZ_MS } from '../src/memoria.ts';

const almacen = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };
const zona = { ubicacion: { lat: -38, lng: -57.5 }, sucursales: [{ clave: '1', cadena: 'Día', direccion: '', localidad: 'Mar del Plata', distanciaKm: 0.4 }], localidad: 'Mar del Plata', respondidas: 30, masCercanaKm: 0.4 };

test('guarda y lee la última zona', () => {
  const a = almacen();
  guardarZona(zona, 1000, a);
  assert.equal(leerZona(2000, a).zona.localidad, 'Mar del Plata');
});

test('vence y no guarda basura', () => {
  const a = almacen();
  guardarZona(zona, 0, a);
  assert.equal(leerZona(VALIDEZ_MS + 1, a), null);
  a.setItem('ultima-zona', '{roto');
  assert.equal(leerZona(0, a), null);
  assert.equal(leerZona(0, null), null);
});

test('hace cuánto, en criollo', () => {
  assert.equal(haceCuanto(30_000), 'recién');
  assert.equal(haceCuanto(15 * 60_000), 'hace 15 minutos');
  assert.equal(haceCuanto(60 * 60_000), 'hace una hora');
  assert.equal(haceCuanto(5 * 3600_000), 'hace 5 horas');
  assert.equal(haceCuanto(26 * 3600_000), 'ayer');
  assert.equal(haceCuanto(4 * 86_400_000), 'hace 4 días');
});
