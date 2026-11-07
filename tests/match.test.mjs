import { test } from 'node:test';
import assert from 'node:assert/strict';
import { candidatos, puntaje, yaTachado } from '../src/scanner/match.ts';

const item = (id, nombre, extra = {}) => ({ id, nombre, comprado: false, ean: null, ...extra });
const lista = [
  item('1', 'Leche'),
  item('2', 'Papa'),
  item('3', 'Papel higiénico'),
  item('4', 'Yerba'),
  item('5', 'Leche descremada'),
  item('6', 'Champú'),
  item('7', 'Galletitas', { comprado: true, ean: '7790040' }),
];

test('coincidencias por nombre', () => {
  assert.equal(puntaje('Leche', 'LA SERENISIMA Leche Larga Vida Modificada'), 1);
  assert.equal(puntaje('Papel higiénico', 'CAMPANITA Papel Higienico Hoja Simple'), 1);
  assert.equal(puntaje('Papa', 'PAPEL Higienico'), 0);
  assert.equal(puntaje('Tomates', 'Tomate Perita en Lata'), 1);
});

test('candidatos ordenados: el más específico primero', () => {
  const c = candidatos(lista, '779', 'LA SERENISIMA Leche Descremada 1 L');
  assert.deepEqual(c.map((i) => i.nombre), ['Leche descremada', 'Leche']);
  const d = candidatos(lista, '779', 'Yerba Mate con Palo Liebig Original 500 Gr');
  assert.deepEqual(d.map((i) => i.nombre), ['Yerba']);
});

test('sin coincidencia y producto desconocido', () => {
  assert.deepEqual(candidatos(lista, '779', 'Mayonesa Hellmanns'), []);
  assert.deepEqual(candidatos(lista, '779', null), []);
});

test('mismo código primero, aunque el nombre no coincida', () => {
  const l = [...lista, item('8', 'La de siempre', { ean: '123' })];
  assert.equal(candidatos(l, '123', 'Algo Distinto')[0].id, '8');
});

test('ya tachado', () => {
  assert.equal(yaTachado(lista, '7790040')?.nombre, 'Galletitas');
  assert.equal(yaTachado(lista, '000'), undefined);
});
