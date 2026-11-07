import { test } from 'node:test';
import assert from 'node:assert/strict';
import { enCuadras, leerPrecio, semaforo } from '../src/texto.ts';

test('distancias en cuadras', () => {
  assert.equal(enCuadras(0.03), 'a menos de una cuadra');
  assert.equal(enCuadras(0.11), 'a 1 cuadra');
  assert.equal(enCuadras(0.71), 'a 7 cuadras');
  assert.equal(enCuadras(3.0), 'a 30 cuadras');
  assert.equal(enCuadras(3.2), 'a 3,2 km');
  assert.equal(enCuadras(25.4), 'a 25 km');
  assert.equal(enCuadras(null), '');
});

test('leer precios escritos a mano', () => {
  assert.equal(leerPrecio('3450'), 3450);
  assert.equal(leerPrecio('3.450'), 3450);
  assert.equal(leerPrecio('$ 3.450'), 3450);
  assert.equal(leerPrecio('3450,50'), 3450.5);
  assert.equal(leerPrecio('3.450,5'), 3450.5);
  assert.equal(leerPrecio('1.234.567'), 1234567);
  assert.equal(leerPrecio('2.5'), 2.5);
  assert.equal(leerPrecio(''), null);
  assert.equal(leerPrecio('abc'), null);
});

test('semáforo con ±10%', () => {
  assert.deepEqual(semaforo(3450, 2800), { tipo: 'caro', diferencia: 650 });
  assert.deepEqual(semaforo(2900, 2800), { tipo: 'normal', diferencia: 100 });
  assert.deepEqual(semaforo(3080, 2800), { tipo: 'normal', diferencia: 280 }); // justo 10%
  assert.deepEqual(semaforo(2500, 2800), { tipo: 'barato', diferencia: -300 });
});
