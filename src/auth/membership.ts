import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '../firebase/db';

export type MembershipStatus = 'checking' | 'member' | 'not-member' | 'error';

// Un usuario es miembro si existe el documento miembros/<su email> en Firestore.
// Los miembros se administran a mano desde la consola de Firebase.
export function useMembership(email: string | null | undefined) {
  const [status, setStatus] = useState<MembershipStatus>('checking');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!email) {
      setStatus('not-member');
      return;
    }
    let cancelled = false;
    setStatus('checking');
    getDoc(doc(db, 'miembros', email.toLowerCase()))
      .then((snap) => {
        if (!cancelled) setStatus(snap.exists() ? 'member' : 'not-member');
      })
      .catch((e: { code?: string }) => {
        if (cancelled) return;
        // Las reglas niegan la lectura a quien no es miembro.
        setStatus(e?.code === 'permission-denied' ? 'not-member' : 'error');
      });
    return () => {
      cancelled = true;
    };
  }, [email, attempt]);

  return { status, retry: () => setAttempt((n) => n + 1) };
}
