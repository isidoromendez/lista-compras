import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase/db';

export type Item = {
  id: string;
  nombre: string;
  cantidad: string | null;
  creadoPor: string;
  creadoEn: Timestamp | null;
  comprado: boolean;
  compradoPor: string | null;
  compradoEn: Timestamp | null;
  ean: string | null;
};

export type NuevoItem = { nombre: string; cantidad?: string | null };

const itemsRef = collection(db, 'items');

// Escucha la lista en tiempo real: cualquier cambio de cualquier usuario llega al instante.
export function subscribeToItems(
  onChange: (items: Item[]) => void,
  onError: (error: Error) => void,
) {
  const q = query(itemsRef, orderBy('creadoEn', 'desc'));
  // Firestore aplica primero los cambios locales: lo que agrega, tacha o borra el
  // usuario se ve al instante, sin esperar la respuesta del servidor.
  return onSnapshot(
    q,
    (snap) =>
      onChange(
        snap.docs.map((d) => ({
          id: d.id,
          nombre: d.get('nombre'),
          cantidad: d.get('cantidad') ?? null,
          creadoPor: d.get('creadoPor'),
          creadoEn: d.get('creadoEn', { serverTimestamps: 'estimate' }) ?? null,
          comprado: d.get('comprado') === true,
          compradoPor: d.get('compradoPor') ?? null,
          compradoEn: d.get('compradoEn', { serverTimestamps: 'estimate' }) ?? null,
          ean: d.get('ean') ?? null,
        })),
      ),
    onError,
  );
}

function datosNuevo(item: NuevoItem, creadoPor: string) {
  const cantidad = item.cantidad?.trim();
  return {
    nombre: item.nombre.trim(),
    ...(cantidad ? { cantidad } : {}),
    creadoPor,
    creadoEn: serverTimestamp(),
  };
}

export function addItem(nombre: string, creadoPor: string) {
  return addDoc(itemsRef, datosNuevo({ nombre }, creadoPor));
}

// Agrega varios ítems de una vez (por ejemplo, los dictados por voz).
export function addItems(items: NuevoItem[], creadoPor: string) {
  const batch = writeBatch(db);
  for (const item of items) batch.set(doc(itemsRef), datosNuevo(item, creadoPor));
  return batch.commit();
}

// Agrega un ítem que ya entra comprado (escaneado en el súper y que no estaba en la lista).
export function addItemComprado(nombre: string, email: string, ean?: string) {
  return addDoc(itemsRef, {
    ...datosNuevo({ nombre }, email),
    comprado: true,
    compradoPor: email,
    compradoEn: serverTimestamp(),
    ...(ean ? { ean } : {}),
  });
}

export function setComprado(id: string, comprado: boolean, email: string, ean?: string) {
  return updateDoc(
    doc(db, 'items', id),
    comprado
      ? {
          comprado: true,
          compradoPor: email,
          compradoEn: serverTimestamp(),
          ...(ean ? { ean } : {}),
        }
      : { comprado: false, compradoPor: deleteField(), compradoEn: deleteField() },
  );
}

export function deleteItem(id: string) {
  return deleteDoc(doc(db, 'items', id));
}

export function deleteItems(ids: string[]) {
  const batch = writeBatch(db);
  for (const id of ids) batch.delete(doc(db, 'items', id));
  return batch.commit();
}
