import './style.css';
import { iniciarMedicion, medicionActiva, medir } from './analytics';
import { alCambiar, instalar, yaInstalada } from './instalar';
import {
  _limpiarCache, consultarPrecio, fmtDistancia, fmtPrecio, obtenerZona,
  type PrecioEn, type Resultado, type Zona,
} from './precios';
import { iniciarLector, type EstadoCamara } from './scanner';
import { pedirUbicacion } from './ubicacion';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

iniciarMedicion();
$('version').textContent = `versión ${__VERSION__}`;
if (medicionActiva) $('aviso-medicion').textContent = 'Contamos visitas y escaneos con Google Analytics, sin datos personales.';

// ---- Tema claro/oscuro (automático, con botón para cambiarlo) ----
const temaActual = () =>
  (document.documentElement.dataset.theme as 'light' | 'dark' | undefined) ??
  (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
function aplicarColorBarra() {
  const c = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', c));
}
$('tema').addEventListener('click', () => {
  const nuevo = temaActual() === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = nuevo;
  try { localStorage.setItem('tema', nuevo); } catch { /* sin almacenamiento: no pasa nada */ }
  aplicarColorBarra();
});
aplicarColorBarra();

// ---- Instalar como app ----
function actualizarInstalar() {
  $('instalar').classList.toggle('oculto', yaInstalada());
}
alCambiar(actualizarInstalar);
actualizarInstalar();
$('instalar').addEventListener('click', async () => {
  const conDialogo = await instalar();
  medir({ nombre: 'instalar_toque', con_dialogo: conDialogo });
  $('ayuda-instalar').classList.toggle('oculto', conDialogo);
});
$('ayuda-cerrar').addEventListener('click', () => $('ayuda-instalar').classList.add('oculto'));
window.addEventListener('appinstalled', () => {
  medir({ nombre: 'app_instalada' });
  $('instalar').classList.add('oculto');
});

// ---- Zona (súpers a menos de 40 km) ----
let zona: Zona | null = null;
let buscandoZona = false;

async function cargarZona() {
  if (buscandoZona) return;
  buscandoZona = true;
  const chip = $<HTMLButtonElement>('zona');
  chip.classList.remove('error');
  chip.disabled = true;
  $('zona-texto').textContent = 'Buscando tu zona…';
  actualizarAviso();
  let motivo = '';
  let detalle = '';
  try {
    const u = await pedirUbicacion().catch((e: Error) => {
      motivo = e.message === 'permiso' ? 'permiso' : 'ubicacion';
      throw e;
    });
    // Siempre visible: qué ubicación recibió la app, para poder confirmarla.
    $('ubic-texto').textContent = `📍 ${u.lat.toFixed(4)}, ${u.lng.toFixed(4)}${u.precisionM != null ? ` · precisión ±${u.precisionM >= 1000 ? (u.precisionM / 1000).toFixed(1) + ' km' : u.precisionM + ' m'}` : ''}`;
    $('ubic').classList.remove('oculto');
    zona = await obtenerZona(u).catch((e) => {
      motivo = 'servicio';
      throw e;
    });
    if (!zona.sucursales.length) {
      motivo = 'sin_supers';
      // Diagnóstico: qué ubicación se recibió y a qué distancia quedó el súper más cercano.
      detalle = `Ubicación recibida: ${u.lat.toFixed(3)}, ${u.lng.toFixed(3)}${u.precisionM != null ? ` (±${u.precisionM >= 1000 ? (u.precisionM / 1000).toFixed(1) + ' km' : u.precisionM + ' m'})` : ''}. ${
        zona.masCercanaKm != null ? `El súper más cercano que informa está a ${Math.round(zona.masCercanaKm)} km` : `Precios Claros devolvió ${zona.respondidas} súpers`
      }.`;
      throw new Error();
    }
    const cerca = zona.sucursales[0];
    $('zona-texto').textContent = `${zona.localidad || 'Tu zona'} · ${zona.sucursales.length} súpers a menos de 40 km`;
    if (cerca) $('ubic-texto').textContent += ` · el más cercano: ${cerca.cadena} a ${fmtDistancia(cerca.distanciaKm)}`;
    medir({ nombre: 'zona_lista', localidad: zona.localidad, supers: zona.sucursales.length });
  } catch {
    zona = null;
    chip.classList.add('error');
    chip.disabled = false;
    $('zona-texto').textContent =
      motivo === 'permiso'
        ? 'Necesito tu ubicación para saber los precios de tu zona. Tocá para reintentar.'
        : motivo === 'sin_supers'
          ? `No hay súpers con precios informados a menos de 40 km. ${detalle} Tocá para reintentar.`
          : motivo === 'servicio'
            ? 'No se pudo consultar Precios Claros. Tocá para reintentar.'
            : 'No pude obtener tu ubicación. Tocá para reintentar.';
    medir({ nombre: 'zona_error', motivo, detalle });
  } finally {
    buscandoZona = false;
    actualizarAviso();
  }
}
$('zona').addEventListener('click', cargarZona);
$('ubic-actualizar').addEventListener('click', () => {
  _limpiarCache();
  cargarZona();
});

// ---- Cámara ----
let estadoCamara: EstadoCamara | 'cerrada' = 'cerrada';
const pausado = () => !zona; // no lee hasta tener la zona (si no, el primer código se perdería)

function actualizarAviso() {
  const camara = document.querySelector('.camara')!;
  camara.classList.toggle('pausa', pausado());
  const textos: Record<string, string> = {
    cerrada: '',
    iniciando: 'Abriendo cámara…',
    'sin-permiso': 'Falta el permiso de la cámara. Habilitalo en el navegador.',
    'sin-camara': 'No se encontró una cámara.',
    error: 'No se pudo iniciar el lector de códigos.',
    leyendo: pausado() ? (buscandoZona ? 'Buscando tu zona…' : 'Sin zona no puedo consultar precios') : 'Apuntá al código de barras',
  };
  $('aviso').textContent = textos[estadoCamara] ?? '';
}

async function abrirCamara() {
  $('abrir').classList.add('oculto');
  estadoCamara = 'iniciando';
  actualizarAviso();
  await iniciarLector({
    video: $<HTMLVideoElement>('video'),
    pausado,
    onEstado: (e) => {
      estadoCamara = e;
      if (e !== 'leyendo') $('abrir').classList.toggle('oculto', e === 'iniciando');
      actualizarAviso();
    },
    onCodigo: consultar,
  });
}
$('abrir').addEventListener('click', abrirCamara);

// Si ya dio permiso de cámara antes, se abre sola.
navigator.permissions
  ?.query({ name: 'camera' as PermissionName })
  .then((p) => {
    if (p.state === 'granted') abrirCamara();
  })
  .catch(() => {});

// ---- Consulta y tarjeta ----
type Escaneado = Extract<Resultado, { estado: 'ok' | 'sin-precios' | 'no-encontrado' }>;
let historial: Escaneado[] = [];
let actual: string | null = null;
let consultaId = 0;

const lugar = (p: PrecioEn) =>
  `${esc(p.sucursal.cadena)}${p.sucursal.distanciaKm != null ? ` · ${fmtDistancia(p.sucursal.distanciaKm)}` : ''}`;

function tarjeta(r: Resultado): string {
  if (r.estado === 'no-encontrado') {
    return `<div class="card"><p class="nombre">No está en Precios Claros</p>
      <p class="linea">Este producto no figura en la base de precios que informan los súpers.</p>
      <p class="meta">código ${esc(r.ean)}</p></div>`;
  }
  const titulo = `<p class="nombre">${r.marca ? esc(r.marca) + ' · ' : ''}${esc(r.nombre)}</p>${r.presentacion ? `<p class="pres">${esc(r.presentacion)}</p>` : ''}`;
  if (r.estado === 'sin-precios') {
    return `<div class="card">${titulo}<p class="linea" style="margin-top:10px">Está en Precios Claros, pero ningún súper de la zona informa su precio.</p></div>`;
  }
  const masBarato =
    r.cantidadSuper === 1 ? `solo en ${lugar(r.masBarato)}` : `más barato: ${fmtPrecio(r.masBarato.precio)} en ${lugar(r.masBarato)}`;
  const promo = r.promo
    ? `<p class="linea promo">Promo: ${fmtPrecio(r.promo.precio)} en ${lugar(r.promo)}${r.promo.descripcion ? ` (${esc(r.promo.descripcion)})` : ''}</p>`
    : '';
  const alerta = r.soloDesactualizados
    ? `<p class="alerta">Ningún súper actualizó este precio hoy: puede estar desactualizado.</p>`
    : '';
  const meta = `según ${r.cantidadSuper} ${r.cantidadSuper === 1 ? 'súper' : 'súpers'}${r.soloDesactualizados ? '' : ' · actualizado hoy'}${r.desactualizados && !r.soloDesactualizados ? ` · ${r.desactualizados} sin actualizar` : ''}`;
  return `<div class="card">${titulo}
    <p class="label">Precio sugerido en la zona</p>
    <p class="precio">${fmtPrecio(r.tipico)}</p>
    <p class="linea">${masBarato}</p>${promo}${alerta}
    <p class="meta">${meta}</p></div>`;
}

function mostrarHistorial() {
  const anteriores = historial.filter((h) => h.ean !== actual);
  $('historial').classList.toggle('oculto', anteriores.length === 0);
  $('hist-titulo').textContent = `Escaneados · ${anteriores.length}`;
  $('hist-lista').innerHTML = anteriores
    .map((h) => {
      const nombre = h.estado === 'no-encontrado' ? `Código ${h.ean}` : h.nombre;
      const precio = h.estado === 'ok' ? fmtPrecio(h.tipico) : h.estado === 'sin-precios' ? 'sin precio' : 'no encontrado';
      return `<li><button type="button" data-ean="${esc(h.ean)}"><span class="h-nombre">${esc(nombre)}</span><span class="h-precio${h.estado === 'ok' ? '' : ' sin'}">${precio}</span></button></li>`;
    })
    .join('');
}

$('hist-lista').addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest('button[data-ean]') as HTMLButtonElement | null;
  const h = b && historial.find((x) => x.ean === b.dataset.ean);
  if (!h) return;
  actual = h.ean;
  $('resultado').innerHTML = tarjeta(h);
  mostrarHistorial();
});

$('borrar').addEventListener('click', () => {
  medir({ nombre: 'borrar_historial', cantidad: historial.length });
  historial = [];
  actual = null;
  $('resultado').innerHTML = '';
  mostrarHistorial();
});

async function consultar(ean: string) {
  const id = ++consultaId;
  actual = ean;
  $('resultado').innerHTML = `<div class="card cargando"><span class="spinner"></span>Buscando ${esc(ean)}…</div>`;
  mostrarHistorial();
  if (!zona) {
    $('resultado').innerHTML = `<div class="card"><p class="nombre">Falta tu zona</p><p class="linea">Necesito tu ubicación para buscar los precios de los súpers cercanos.</p></div>`;
    return;
  }
  try {
    const r = await consultarPrecio(ean, zona);
    if (id !== consultaId) return; // llegó otro código mientras tanto
    $('resultado').innerHTML = tarjeta(r);
    historial = [r as Escaneado, ...historial.filter((x) => x.ean !== ean)].slice(0, 30);
    mostrarHistorial();
    medir({
      nombre: 'escaneo',
      resultado: r.estado === 'ok' ? 'ok' : r.estado === 'sin-precios' ? 'sin_precios' : 'no_encontrado',
      ean,
      producto: r.estado === 'no-encontrado' ? undefined : r.nombre,
      localidad: zona.localidad,
      supers: r.estado === 'ok' ? r.cantidadSuper : 0,
      con_promo: r.estado === 'ok' && !!r.promo,
    });
  } catch {
    if (id !== consultaId) return;
    $('resultado').innerHTML = `<div class="card"><p class="nombre">No se pudo consultar el precio</p><p class="linea">Revisá la conexión y volvé a escanear.</p></div>`;
    medir({ nombre: 'escaneo', resultado: 'error', ean, localidad: zona.localidad });
  }
}

$('manual').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = $<HTMLInputElement>('codigo');
  const c = input.value.replace(/\D/g, '');
  if (c.length >= 8) {
    input.value = '';
    input.blur();
    consultar(c);
  }
});

// ---- Arranque ----
cargarZona();
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
