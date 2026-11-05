import { getAuth } from 'firebase/auth';
import { app } from './app';

// En web, Firebase guarda la sesión en el navegador (IndexedDB) por defecto.
export const auth = getAuth(app);
