// Ejecutar con: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsearDictado } from '../src/voice/parse.ts';

const ver = (t) => parsearDictado(t).map((i) => (i.cantidad ? `${i.nombre} · ${i.cantidad}` : i.nombre));

test('ejemplo del usuario, con comas', () => {
  assert.deepEqual(
    ver('hay que comprar dos leches, hay que comprar un kilo de papa, hay que comprar una garrafa de gas, hay que comprar papel higiénico, hay que comprar champú'),
    ['Leche · 2', 'Papa · 1 kg', 'Garrafa de gas', 'Papel higiénico', 'Champú'],
  );
});

test('dictado sin puntuación, separado por pausas (segmentos)', () => {
  assert.deepEqual(
    ver(['hay que comprar dos leches', 'un kilo de papa', 'una garrafa de gas', 'papel higiénico y champú']),
    ['Leche · 2', 'Papa · 1 kg', 'Garrafa de gas', 'Papel higiénico', 'Champú'],
  );
});

test('dictado de corrido: los números arrancan ítems nuevos', () => {
  assert.deepEqual(ver('dos leches un kilo de papa y champú'), ['Leche · 2', 'Papa · 1 kg', 'Champú']);
});

test('números en dígitos (como los devuelve Chrome) y unidades', () => {
  assert.deepEqual(
    ver('2 paquetes de fideos, 1 kg de tomates, 3 latas de atún, medio kilo de queso, 1,5 litros de aceite'),
    ['Fideos · 2 paquetes', 'Tomates · 1 kg', 'Atún · 3 latas', 'Queso · ½ kg', 'Aceite · 1,5 l'],
  );
});

test('plurales a singular solo cuando hay cantidad', () => {
  assert.deepEqual(ver('tres limones, dos papas fritas, cuatro alfajores de maicena, galletitas'), [
    'Limón · 3', 'Papa frita · 2', 'Alfajor de maicena · 4', 'Galletitas',
  ]);
});

test('relleno y artículos', () => {
  assert.deepEqual(ver('necesitamos la yerba, también un desodorante y después pan'), ['Yerba', 'Desodorante', 'Pan']);
});

test('docena y cuarto', () => {
  assert.deepEqual(ver('una docena de huevos, un cuarto de jamón'), ['Huevos · 1 docena', 'Jamón · ¼ kg']);
});

test('vacío', () => {
  assert.deepEqual(ver(''), []);
  assert.deepEqual(ver('hay que comprar'), []);
});

test('"coma" dicho en voz alta separa ítems', () => {
  assert.deepEqual(ver('yerba mate coma lavandina coma papel higiénico'), ['Yerba mate', 'Lavandina', 'Papel higiénico']);
});

test('cada pausa (segmento) es un ítem aparte', () => {
  assert.deepEqual(ver(['yerba mate Levi', 'lavandina Ayudín', 'papel higiénico doble hoja']), [
    'Yerba mate levi', 'Lavandina ayudín', 'Papel higiénico doble hoja',
  ]);
});
