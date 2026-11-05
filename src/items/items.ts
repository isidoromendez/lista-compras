import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase/db';

export type Item = {
  id: string;
  nombre: string;
  creadoPor: string;
  creadoEn: Timestamp | null;
};

const itemsRef = collection(db, 'items');

// Escucha la lista en tiempo real: cualquier cambio de cualquier usuario llega al instante.
export function subscribeToItems(
  onChange: (items: Item[]) => void,
  onError: (error: Error) => void,
) {
  const q = query(itemsRef, orderBy('creadoEn', 'desc'));
  // Firestore aplica primero los cambios locales: lo que agrega o borra el usuario
  // se ve al instante, sin esperar la respuesta del servidor.
  return onSnapshot(
    q,
    (snap) =>
      onChange(
        snap.docs.map((d) => ({
          id: d.id,
          nombre: d.get('nombre'),
          creadoPor: d.get('creadoPor'),
          creadoEn: d.get('creadoEn', { serverTimestamps: 'estimate' }) ?? null,
        })),
      ),
    onError,
  );
}

export function addItem(nombre: string, creadoPor: string) {
  return addDoc(itemsRef, { nombre, creadoPor, creadoEn: serverTimestamp() });
}

export function deleteItem(id: string) {
  return deleteDoc(doc(db, 'items', id));
}
