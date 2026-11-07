import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

// Reconocimiento de voz del navegador (Chrome en Android lo trae; usa los servidores de Google).
type Rec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function crearReconocedor(): Rec | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

export const dictadoDisponible =
  Platform.OS === 'web' &&
  typeof window !== 'undefined' &&
  ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

const norm = (s: string) => s.trim().toLowerCase();

export type EstadoDictado = 'inactivo' | 'escuchando' | 'terminado';

export function useDictado() {
  const recRef = useRef<Rec | null>(null);
  const [estado, setEstado] = useState<EstadoDictado>('inactivo');
  const [segmentos, setSegmentos] = useState<string[]>([]);
  const [parcial, setParcial] = useState('');
  const [error, setError] = useState<string | null>(null);

  const empezar = useCallback(() => {
    const rec = crearReconocedor();
    if (!rec) {
      setError('Este navegador no permite dictar. Abrí la app en Chrome.');
      return;
    }
    recRef.current?.abort();
    recRef.current = rec;
    rec.lang = 'es-AR';
    rec.continuous = true;
    rec.interimResults = true;
    setSegmentos([]);
    setParcial('');
    setError(null);

    rec.onresult = (e) => {
      const finales: string[] = [];
      let interino = '';
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        const t = r[0].transcript;
        if (!r.isFinal) {
          interino += t;
          continue;
        }
        // En Android, Chrome a veces repite lo ya dicho dentro del resultado siguiente:
        // si el nuevo empieza con el anterior, lo reemplaza en lugar de sumarlo.
        const ultimo = finales[finales.length - 1];
        if (ultimo && norm(t).startsWith(norm(ultimo))) finales[finales.length - 1] = t;
        else if (!ultimo || !norm(ultimo).startsWith(norm(t))) finales.push(t);
      }
      setSegmentos(finales.map((s) => s.trim()).filter(Boolean));
      setParcial(interino.trim());
    };
    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed')
        setError('Falta el permiso del micrófono. Habilitalo en el navegador y probá de nuevo.');
      else if (e.error === 'no-speech') setError('No escuché nada. Probá de nuevo.');
      else if (e.error === 'network') setError('El dictado necesita conexión a internet.');
      else if (e.error !== 'aborted') setError('No se pudo dictar. Probá de nuevo.');
    };
    rec.onend = () => setEstado((s) => (s === 'escuchando' ? 'terminado' : s));

    try {
      rec.start();
      setEstado('escuchando');
    } catch {
      setError('No se pudo usar el micrófono.');
    }
  }, []);

  const terminar = useCallback(() => {
    recRef.current?.stop();
  }, []);

  const cancelar = useCallback(() => {
    recRef.current?.abort();
    recRef.current = null;
    setEstado('inactivo');
    setSegmentos([]);
    setParcial('');
    setError(null);
  }, []);

  useEffect(() => () => recRef.current?.abort(), []);

  // Lo que quedó en "parcial" al terminar también cuenta.
  const texto = parcial ? [...segmentos, parcial] : segmentos;

  return { estado, segmentos: texto, parcial, error, empezar, terminar, cancelar };
}
