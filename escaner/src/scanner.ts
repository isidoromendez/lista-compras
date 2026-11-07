import { crearFiltroCodigos } from './dedupe';

type Detector = { detect: (src: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
type DetectorCtor = (new (o: { formats: string[] }) => Detector) & { getSupportedFormats?: () => Promise<string[]> };

const FORMATOS = ['ean_13', 'ean_8', 'upc_a', 'upc_e'];

// Lector nativo de Chrome si existe; si no, el de respaldo (ZXing) que va en /vendor.
async function crearDetector(): Promise<Detector> {
  const nativo = (window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
  if (nativo?.getSupportedFormats) {
    const soportados = await nativo.getSupportedFormats().catch(() => [] as string[]);
    if (soportados.includes('ean_13')) return new nativo({ formats: FORMATOS.filter((f) => soportados.includes(f)) });
  }
  const url = '/vendor/barcode-detector.js';
  const mod = (await import(/* @vite-ignore */ url)) as { BarcodeDetector: DetectorCtor };
  return new mod.BarcodeDetector({ formats: FORMATOS });
}

export type EstadoCamara = 'iniciando' | 'leyendo' | 'sin-permiso' | 'sin-camara' | 'error';

type Opciones = {
  video: HTMLVideoElement;
  onCodigo: (codigo: string) => void;
  onEstado: (e: EstadoCamara) => void;
  pausado: () => boolean;
};

// Lectura continua: cada producto nuevo se informa una vez; el mismo producto
// no se vuelve a informar mientras siga en cuadro.
export async function iniciarLector({ video, onCodigo, onEstado, pausado }: Opciones) {
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
  } catch (e) {
    onEstado((e as DOMException)?.name === 'NotAllowedError' ? 'sin-permiso' : 'sin-camara');
    return () => {};
  }
  video.srcObject = stream;
  await video.play().catch(() => {});

  let detector: Detector;
  try {
    detector = await crearDetector();
  } catch {
    onEstado('error');
    return () => stream.getTracks().forEach((t) => t.stop());
  }
  onEstado('leyendo');

  const filtro = crearFiltroCodigos();
  let ultimoInformado: string | null = null;
  let activo = true;
  let timer: ReturnType<typeof setTimeout>;

  const leer = async () => {
    if (!activo) return;
    if (video.readyState >= 2 && !document.hidden) {
      try {
        const codigos = await detector.detect(video);
        const codigo = codigos[0]?.rawValue?.replace(/\D/g, '');
        if (codigo && codigo.length >= 8) {
          if (pausado()) {
            if (codigo === ultimoInformado) filtro(codigo); // sigue en cuadro: no releerlo al reanudar
          } else if (filtro(codigo)) {
            ultimoInformado = codigo;
            navigator.vibrate?.(50);
            onCodigo(codigo);
          }
        }
      } catch {
        // un cuadro que no se pudo analizar: se sigue con el próximo
      }
    }
    timer = setTimeout(leer, 150);
  };
  leer();

  return () => {
    activo = false;
    clearTimeout(timer);
    stream.getTracks().forEach((t) => t.stop());
  };
}
