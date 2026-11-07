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

// Si no se escucha nada durante este tiempo, el dictado termina solo.
const SILENCIO_MAXIMO_MS = 12_000;

export type EstadoDictado = 'inactivo' | 'escuchando' | 'terminado';

// En Android, Chrome corta el reconocimiento en cada pausa aunque se le pida
// escuchar de corrido. Por eso, mientras no se toque "Listo", se vuelve a
// escuchar automáticamente, y cada corte cuenta como separador entre ítems.
export function useDictado() {
  const recRef = useRef<Rec | null>(null);
  const activo = useRef(false); // el usuario quiere seguir dictando
  const previos = useRef<string[]>([]); // lo dicho en tramos anteriores
  const delTramo = useRef<string[]>([]); // lo dicho en el tramo actual
  const interinoRef = useRef('');
  const ultimaVoz = useRef(0);

  const [estado, setEstado] = useState<EstadoDictado>('inactivo');
  const [segmentos, setSegmentos] = useState<string[]>([]);
  const [parcial, setParcial] = useState('');
  const [error, setError] = useState<string | null>(null);

  const publicar = () => {
    setSegmentos([...previos.current, ...delTramo.current]);
    setParcial(interinoRef.current);
  };

  const iniciarTramo = useCallback(() => {
    const rec = crearReconocedor();
    if (!rec) {
      activo.current = false;
      setError('Este navegador no permite dictar. Abrí la app en Chrome.');
      return;
    }
    recRef.current = rec;
    rec.lang = 'es-AR';
    rec.continuous = true;
    rec.interimResults = true;
    delTramo.current = [];
    interinoRef.current = '';

    rec.onresult = (e) => {
      const finales: string[] = [];
      let interino = '';
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        const t = r[0].transcript.trim();
        if (!t) continue;
        if (!r.isFinal) {
          interino += (interino ? ' ' : '') + t;
          continue;
        }
        // Chrome en Android a veces repite lo ya dicho dentro del resultado siguiente:
        // si el nuevo empieza con el anterior, lo reemplaza en lugar de sumarlo.
        const ultimo = finales[finales.length - 1];
        if (ultimo && norm(t).startsWith(norm(ultimo))) finales[finales.length - 1] = t;
        else if (!ultimo || !norm(ultimo).startsWith(norm(t))) finales.push(t);
      }
      delTramo.current = finales;
      interinoRef.current = interino;
      ultimaVoz.current = Date.now();
      publicar();
    };

    rec.onerror = (e) => {
      // "no-speech" (silencio) y "aborted" no son errores: los maneja onend.
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      activo.current = false;
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed')
        setError('Falta el permiso del micrófono. Habilitalo en el navegador y probá de nuevo.');
      else if (e.error === 'network') setError('El dictado necesita conexión a internet.');
      else setError('No se pudo dictar. Probá de nuevo.');
    };

    rec.onend = () => {
      // Lo que quedó a medio reconocer en este tramo también cuenta.
      const tramo = interinoRef.current ? [...delTramo.current, interinoRef.current] : delTramo.current;
      previos.current = [...previos.current, ...tramo];
      delTramo.current = [];
      interinoRef.current = '';
      publicar();
      if (recRef.current === rec) recRef.current = null;

      const silencioLargo = Date.now() - ultimaVoz.current > SILENCIO_MAXIMO_MS;
      if (activo.current && !silencioLargo) {
        iniciarTramo(); // la pausa separó un ítem: seguimos escuchando
      } else {
        activo.current = false;
        setEstado((s) => (s === 'escuchando' ? 'terminado' : s));
      }
    };

    try {
      rec.start();
    } catch {
      activo.current = false;
      setError('No se pudo usar el micrófono.');
    }
  }, []);

  const empezar = useCallback(() => {
    activo.current = false;
    recRef.current?.abort();
    recRef.current = null;
    previos.current = [];
    delTramo.current = [];
    interinoRef.current = '';
    setSegmentos([]);
    setParcial('');
    setError(null);
    activo.current = true;
    ultimaVoz.current = Date.now();
    setEstado('escuchando');
    iniciarTramo();
  }, [iniciarTramo]);

  // "Listo": deja de escuchar y pasa a la vista previa.
  const terminar = useCallback(() => {
    activo.current = false;
    if (recRef.current) recRef.current.stop();
    else setEstado((s) => (s === 'escuchando' ? 'terminado' : s));
  }, []);

  const cancelar = useCallback(() => {
    activo.current = false;
    recRef.current?.abort();
    recRef.current = null;
    setEstado('inactivo');
    setSegmentos([]);
    setParcial('');
    setError(null);
  }, []);

  useEffect(
    () => () => {
      activo.current = false;
      recRef.current?.abort();
    },
    [],
  );

  return { estado, segmentos, parcial, error, empezar, terminar, cancelar };
}
