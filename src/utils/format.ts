import type { Timestamp } from 'firebase/firestore';

// "isidoro.mendez@gmail.com" -> "isidoro"
export function shortName(email: string | null | undefined): string {
  if (!email) return '';
  return email.split('@')[0].split(/[._+-]/)[0].toLowerCase();
}

// "isidoro.mendez@gmail.com" -> "IM"
export function initials(email: string | null | undefined): string {
  if (!email) return '?';
  const parts = email.split('@')[0].split(/[._+-]/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0].slice(0, 2);
  return letters.toUpperCase();
}

export function timeAgo(ts: Timestamp | null, now = Date.now()): string {
  if (!ts) return 'recién';
  const s = Math.max(0, Math.round((now - ts.toMillis()) / 1000));
  if (s < 60) return 'recién';
  const m = Math.round(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  if (d === 1) return 'ayer';
  if (d < 7) return `hace ${d} días`;
  return ts.toDate().toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}
