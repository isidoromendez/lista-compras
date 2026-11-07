import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fonts } from '../theme';
import { crearFiltroCodigos } from './dedupe';

type Detector = { detect: (src: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
type DetectorCtor = new (o: { formats: string[] }) => Detector;

const FORMATOS = ['ean_13', 'ean_8', 'upc_a', 'upc_e'];
// import() con URL armada en tiempo de ejecución: el empaquetador no la toca.
const importar = new Function('u', 'return import(u)') as (u: string) => Promise<{ BarcodeDetector: DetectorCtor }>;

// Lector nativo de Chrome si existe; si no, el de respaldo (ZXing) que va en /vendor.
async function crearDetector(): Promise<{ detector: Detector; respaldo: boolean }> {
  const nativo = (window as unknown as { BarcodeDetector?: DetectorCtor & { getSupportedFormats?: () => Promise<string[]> } }).BarcodeDetector;
  if (nativo?.getSupportedFormats) {
    const soportados = await nativo.getSupportedFormats().catch(() => [] as string[]);
    if (soportados.includes('ean_13')) return { detector: new nativo({ formats: FORMATOS.filter((f) => soportados.includes(f)) }), respaldo: false };
  }
  const { BarcodeDetector } = await importar('/vendor/barcode-detector.js');
  return { detector: new BarcodeDetector({ formats: FORMATOS }), respaldo: true };
}

type Props = {
  onCode: (codigo: string) => void;
  // En pausa la cámara sigue abierta pero no lee (por ejemplo, mientras se espera una decisión).
  pausado?: boolean;
  // Texto a mostrar sobre la cámara mientras está en pausa.
  mensajePausa?: string;
};

type Estado = 'iniciando' | 'leyendo' | 'sin-permiso' | 'sin-camara' | 'error';

export function CameraScanner({ onCode, pausado = false, mensajePausa = '' }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [estado, setEstado] = useState<Estado>('iniciando');
  const onCodeRef = useRef(onCode);
  onCodeRef.current = onCode;
  const pausadoRef = useRef(pausado);
  pausadoRef.current = pausado;

  useEffect(() => {
    let cancelado = false;
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const filtro = crearFiltroCodigos();

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch (e) {
        if (!cancelado) setEstado((e as DOMException)?.name === 'NotAllowedError' ? 'sin-permiso' : 'sin-camara');
        return;
      }
      if (cancelado) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      const v = videoRef.current!;
      v.srcObject = stream;
      await v.play().catch(() => {});

      let detector: Detector;
      try {
        detector = (await crearDetector()).detector;
      } catch {
        if (!cancelado) setEstado('error');
        return;
      }
      if (cancelado) return;
      setEstado('leyendo');

      let ultimoEmitido: string | null = null;
      const leer = async () => {
        if (cancelado) return;
        if (v.readyState >= 2) {
          try {
            const codigos = await detector.detect(v);
            const codigo = codigos[0]?.rawValue?.replace(/\D/g, '');
            if (codigo && codigo.length >= 8) {
              if (pausadoRef.current) {
                // En pausa no se emite nada, pero si el último producto sigue en cuadro
                // se lo sigue registrando: así no se relee apenas termina la pausa.
                if (codigo === ultimoEmitido) filtro(codigo);
              } else if (filtro(codigo)) {
                ultimoEmitido = codigo;
                navigator.vibrate?.(50);
                onCodeRef.current(codigo);
              }
            }
          } catch {
            // un cuadro que no se pudo analizar: se sigue con el próximo
          }
        }
        timer = setTimeout(leer, 150);
      };
      leer();
    })();

    return () => {
      cancelado = true;
      if (timer) clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const aviso =
    estado === 'iniciando'
      ? 'Abriendo cámara…'
      : estado === 'sin-permiso'
        ? 'Falta el permiso de la cámara. Habilitalo en el navegador.'
        : estado === 'sin-camara'
          ? 'No se encontró una cámara.'
          : estado === 'error'
            ? 'No se pudo iniciar el lector de códigos.'
            : pausado
              ? mensajePausa
              : 'Apuntá al código de barras';

  return (
    <View style={styles.box}>
      <video ref={videoRef} playsInline muted autoPlay style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      <View style={[styles.mira, pausado && styles.miraPausa]} pointerEvents="none" />
      {aviso ? (
        <Text style={styles.aviso} pointerEvents="none">
          {aviso}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: '100%', aspectRatio: 16 / 10, backgroundColor: '#111', borderRadius: 12, overflow: 'hidden' },
  mira: {
    position: 'absolute',
    left: '12%',
    right: '12%',
    top: '34%',
    height: '32%',
    borderWidth: 2,
    borderColor: 'rgba(47, 209, 155, 0.9)',
    borderRadius: 10,
  },
  miraPausa: { borderColor: 'rgba(255, 255, 255, 0.35)' },
  aviso: {
    position: 'absolute',
    bottom: 10,
    left: 12,
    right: 12,
    textAlign: 'center',
    color: '#fff',
    fontFamily: fonts.medium,
    fontSize: 13,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowRadius: 3,
  },
});
