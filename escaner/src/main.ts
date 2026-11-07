import './style.css';
import { iniciarMedicion, medicionActiva, medir } from './analytics';
import { anotar, diag, exportar } from './diag';
import { alCambiar, instalar, yaInstalada } from './instalar';
import {
  _limpiarCache, consultarPrecio, fmtDistancia, fmtPrecio, obtenerZona, observarRespuestas,
  type PrecioEn, type Resultado, type Zona,
} from './precios';
import { iniciarLector, type EstadoCamara } from './scanner';
import { enlaceProducto, textoCompartir } from './compartir';
import { enCuadras, leerPrecio, semaforo } from './texto';
import { pedirUbicacion, type Lectura } from './ubicacion';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const ICONO = {
  super: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9l1.5-5h15L21 9M3 9h18M3 9v1a3 3 0 0 0 6 0V9m0 1a3 3 0 0 0 6 0V9m0 1a3 3 0 0 0 6 0V9M5 13v7h14v-7M10 20v-4h4v4"/></svg>',
  oferta: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z"/><circle cx="8" cy="8" r="1.5"/></svg>',
  ojo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 9v4M12 17h.01M10.3 3.9 2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>',
  barato: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5"/></svg>',
  normal: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 10h8M8 14h8"/></svg>',
  compartir: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/></svg>',
  caro: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 9v4M12 17h.01M10.3 3.9 2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>',
};

diag.version = __VERSION__;
iniciarMedicion();
if (medicionActiva) $('aviso-medicion').textContent = 'Contamos visitas y escaneos de forma anónima.';
anotar(`inicio · versión ${__VERSION__}`);

// ---- Respuestas del servicio, para la hoja técnica ----
observarRespuestas((r) => {
  const { json, ...meta } = r;
  if (r.path === 'sucursales') diag.crudoZona = json;
  else diag.crudoProducto = json;
  anotar(`${r.path} → ${r.status ?? 'sin respuesta'} · ${r.ms} ms${r.error ? ` · ${r.error}` : ''}`);
  if (r.path === 'producto') diag.producto = { ...meta, ean: new URL(r.url).searchParams.get('id_producto') ?? '', resumen: '' };
  else diag.zona = { ...meta, respondidas: 0, dentro40: 0, masCercana: '' };
});

// ---- Tema: automático, con botón sutil para cambiarlo ----
const temaActual = () =>
  (document.documentElement.dataset.theme as 'light' | 'dark' | undefined) ??
  (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
function colorBarra() {
  const c = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', c));
}
$('tema').addEventListener('click', () => {
  const nuevo = temaActual() === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = nuevo;
  try { localStorage.setItem('tema', nuevo); } catch { /* sin almacenamiento: no pasa nada */ }
  colorBarra();
});
colorBarra();

// ---- Agregar a la pantalla ----
const actualizarInstalar = () => $('instalar').classList.toggle('oculto', yaInstalada());
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
  anotar('app instalada');
  $('instalar').classList.add('oculto');
});

// ---- Zona ----
let zona: Zona | null = null;
let buscandoZona = false;
const REINTENTOS_MAX = 6;
let reintentos = 0;
let timerReintento: ReturnType<typeof setTimeout> | undefined;
const esperaReintento = () => Math.min(10_000 * 2 ** reintentos, 120_000); // 10 s, 20 s, 40 s… hasta 2 min

function textoZona(texto: string, naranja = false, tocable = false) {
  $('zona-texto').textContent = texto;
  $('zona').classList.toggle('aviso-naranja', naranja);
  $<HTMLButtonElement>('zona').disabled = !tocable;
}

async function cargarZona() {
  if (buscandoZona) return;
  buscandoZona = true;
  textoZona('Buscando dónde estás…');
  actualizarAviso();
  let motivo = '';
  let lectura: Lectura | null = null;
  try {
    lectura = await pedirUbicacion((l) => {
      diag.ubicacion = l;
      if (!l.buenaPrecision && l.lecturas === 1) textoZona('Buscando dónde estás… (afinando la ubicación)');
    }).catch((e: Error) => {
      motivo = e.message === 'permiso' ? 'permiso' : 'ubicacion';
      throw e;
    });
    diag.ubicacion = lectura;
    anotar(`ubicación ±${lectura.precisionM} m en ${(lectura.ms / 1000).toFixed(1)} s (${lectura.lecturas} lecturas)`);

    zona = await obtenerZona(lectura).catch((e) => {
      motivo = 'servicio';
      throw e;
    });
    const cerca = zona.sucursales[0];
    if (diag.zona) {
      diag.zona.respondidas = zona.respondidas;
      diag.zona.dentro40 = zona.sucursales.length;
      diag.zona.masCercana = cerca ? `${cerca.cadena} ${cerca.direccion} · ${fmtDistancia(cerca.distanciaKm)}` : '—';
    }
    if (zona.respondidas === 0) {
      motivo = 'servicio_vacio';
      throw new Error();
    }
    if (!zona.sucursales.length) {
      motivo = 'sin_supers';
      throw new Error();
    }
    reintentos = 0;
    const aprox = lectura.precisionM > 1000;
    textoZona(
      `Estás en ${zona.localidad || 'tu zona'} · ${zona.sucursales.length} súpers cerca${aprox ? ' (ubicación aproximada: tocá para afinarla)' : ''}`,
      aprox,
      aprox,
    );
    anotar(`zona ok · ${zona.localidad} · ${zona.sucursales.length} súpers`);
    medir({ nombre: 'zona_lista', localidad: zona.localidad, supers: zona.sucursales.length });
    if (pendiente) {
      const ean = pendiente;
      pendiente = null;
      anotar(`enlace compartido · ${ean}`);
      consultar(ean);
    }
  } catch {
    zona = null;
    const espera = esperaReintento();
    const reintenta = (motivo === 'servicio' || motivo === 'servicio_vacio') && reintentos < REINTENTOS_MAX;
    textoZona(
      motivo === 'permiso'
        ? 'Necesitamos saber dónde estás para mostrarte los precios de tu zona. Tocá acá para permitirlo.'
        : motivo === 'sin_supers'
          ? 'No encontramos supermercados que informen precios cerca tuyo. Tocá para probar de nuevo.'
          : motivo === 'servicio' || motivo === 'servicio_vacio'
            ? `El sistema de precios del Gobierno no está respondiendo. ${reintenta ? `Probamos de nuevo solos en ${Math.round(espera / 1000)} segundos.` : 'Tocá acá para probar de nuevo.'}`
            : 'No pudimos saber dónde estás. Revisá que la ubicación del celular esté prendida y tocá acá.',
      true,
      true,
    );
    anotar(`zona error · ${motivo || 'desconocido'}`);
    medir({ nombre: 'zona_error', motivo });
    if (reintenta) {
      reintentos += 1;
      clearTimeout(timerReintento);
      timerReintento = setTimeout(() => {
        _limpiarCache();
        cargarZona();
      }, espera);
    }
  } finally {
    buscandoZona = false;
    actualizarAviso();
  }
}
$('zona').addEventListener('click', () => {
  reintentos = 0;
  clearTimeout(timerReintento);
  _limpiarCache();
  cargarZona();
});

// ---- Cámara ----
let estadoCamara: EstadoCamara | 'cerrada' = 'cerrada';
const pausado = () => !zona; // no lee hasta tener la zona (si no, el primer código se perdería)

function actualizarAviso() {
  document.querySelector('.camara')!.classList.toggle('pausa', pausado());
  const textos: Record<string, string> = {
    cerrada: '',
    iniciando: 'Abriendo la cámara…',
    'sin-permiso': 'Falta el permiso de la cámara. Habilitalo en el navegador.',
    'sin-camara': 'No encontramos la cámara del celular.',
    error: 'No pudimos prender el lector de códigos.',
    leyendo: pausado() ? (buscandoZona ? 'Un momento, buscando dónde estás…' : 'Primero necesitamos saber dónde estás') : 'Apuntá al código de barras',
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
      anotar(`cámara: ${e}`);
      if (e !== 'leyendo') $('abrir').classList.toggle('oculto', e === 'iniciando');
      actualizarAviso();
    },
    onCodigo: consultar,
  });
}
$('abrir').addEventListener('click', abrirCamara);
navigator.permissions
  ?.query({ name: 'camera' as PermissionName })
  .then((p) => {
    if (p.state === 'granted') abrirCamara();
  })
  .catch(() => {});

// ---- Resultado ----
type Escaneado = Extract<Resultado, { estado: 'ok' | 'sin-precios' | 'no-encontrado' }>;
let historial: Escaneado[] = [];
// Un enlace compartido (?p=EAN) abre directamente ese producto, con los precios de la zona de quien lo abre.
let pendiente = new URLSearchParams(location.search).get('p')?.replace(/\D/g, '') || null;
if (pendiente) history.replaceState(null, '', location.pathname);
let actual: Escaneado | null = null;
let consultaId = 0;

const botonCompartir = `<button type="button" class="compartir" id="compartir">${ICONO.compartir}<span>Compartir</span></button>`;
const donde = (p: PrecioEn) => `${esc(p.sucursal.cadena)}${p.sucursal.distanciaKm != null ? ` · ${enCuadras(p.sucursal.distanciaKm)}` : ''}`;

function tarjeta(r: Escaneado): string {
  if (r.estado === 'no-encontrado') {
    return `<div class="card"><p class="nombre">No encontramos este producto</p>
      <p class="suele">Puede que los súpers no informen su precio. Probá con otro.</p></div>`;
  }
  const titulo = `<p class="nombre">${esc(r.nombre)}</p>${r.presentacion || r.marca ? `<p class="pres">${esc([r.marca, r.presentacion].filter(Boolean).join(' · '))}</p>` : ''}`;
  if (r.estado === 'sin-precios') {
    return `<div class="card">${titulo}<p class="suele">Ningún súper de tu zona informa el precio de este producto.</p>${botonCompartir}</div>`;
  }
  const masBarato =
    r.cantidadSuper === 1
      ? `<div class="fila super">${ICONO.super}<div><b>Solo lo encontramos en ${donde(r.masBarato)}</b></div></div>`
      : `<div class="fila super">${ICONO.super}<div><b>Más barato en ${esc(r.masBarato.sucursal.cadena)}</b><br><span>${fmtPrecio(r.masBarato.precio)}${r.masBarato.sucursal.distanciaKm != null ? ` · ${enCuadras(r.masBarato.sucursal.distanciaKm)}` : ''}</span></div></div>`;
  const oferta = r.promo
    ? `<div class="fila oferta">${ICONO.oferta}<div><b>¡Hay oferta en ${esc(r.promo.sucursal.cadena)}!</b><br><span>${r.promo.descripcion ? esc(r.promo.descripcion) + '. ' : ''}Te queda a ${fmtPrecio(r.promo.precio)} cada uno${r.promo.sucursal.distanciaKm != null ? ` (${enCuadras(r.promo.sucursal.distanciaKm)})` : ''}.</span></div></div>`
    : '';
  const ojo = r.soloDesactualizados ? `<div class="fila ojo">${ICONO.ojo}<div>Ojo: este precio puede estar viejo. Ningún súper lo actualizó hoy.</div></div>` : '';
  const poco = r.cantidadSuper <= 2 && r.cantidadSuper > 1 ? `<p class="poco">Lo encontramos en pocos súpers, así que tomalo como referencia.</p>` : '';
  return `<div class="card">${titulo}
    <p class="suele">Por acá suele costar</p>
    <p class="precio">${fmtPrecio(r.tipico)}</p>
    ${masBarato}${oferta}${ojo}${poco}
    <div class="aca">
      <label for="aca">¿Cuánto sale acá?</label>
      <div class="campo">$<input id="aca" inputmode="decimal" autocomplete="off" placeholder="Escribí el precio de la góndola" aria-label="Precio de la góndola" /></div>
      <div id="veredicto"></div>
    </div>
    ${botonCompartir}
  </div>
  <p class="siguiente">Para ver otro, apuntá a otro producto.</p>`;
}

function mostrar(r: Escaneado) {
  actual = r;
  $('resultado').innerHTML = tarjeta(r);
  $('ayuda-codigo').classList.add('oculto');
  const input = document.getElementById('aca') as HTMLInputElement | null;
  document.getElementById('compartir')?.addEventListener('click', () => {
    if (r.estado !== 'no-encontrado') compartir(r, input ? leerPrecio(input.value) : null);
  });
  if (input && r.estado === 'ok') {
    let medido = false;
    input.addEventListener('input', () => {
      const p = leerPrecio(input.value);
      const box = $('veredicto');
      if (!p) return void (box.innerHTML = '');
      const v = semaforo(p, r.tipico);
      const texto =
        v.tipo === 'caro'
          ? `Está caro: ${fmtPrecio(v.diferencia)} más de lo normal`
          : v.tipo === 'barato'
            ? `¡Buen precio! ${fmtPrecio(-v.diferencia)} menos de lo normal`
            : 'Precio normal para la zona';
      box.innerHTML = `<div class="veredicto ${v.tipo}">${ICONO[v.tipo]}<span>${texto}</span></div>`;
      if (!medido) {
        medido = true;
        setTimeout(() => {
          const final = leerPrecio(input.value);
          if (final) {
            const fv = semaforo(final, r.tipico);
            medir({ nombre: 'semaforo', veredicto: fv.tipo });
            anotar(`semáforo: ${fmtPrecio(final)} → ${fv.tipo}`);
          }
        }, 2000);
      }
    });
  }
}

async function compartir(r: Extract<Escaneado, { estado: 'ok' | 'sin-precios' }>, precioAca: number | null) {
  const text = textoCompartir(r, zona?.localidad ?? '', precioAca);
  const url = enlaceProducto(r.ean);
  let via: 'nativo' | 'copiado' | 'cancelado' = 'nativo';
  try {
    if (navigator.share) await navigator.share({ title: '¿Cuánto sale?', text, url });
    else {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      via = 'copiado';
      const b = document.getElementById('compartir');
      const span = b?.querySelector('span');
      if (span) {
        span.textContent = '¡Copiado! Pegalo donde quieras';
        setTimeout(() => (span.textContent = 'Compartir'), 2500);
      }
    }
  } catch (e) {
    via = 'cancelado';
    if ((e as Error).name !== 'AbortError') anotar(`compartir error · ${String(e)}`);
  }
  anotar(`compartir ${r.ean} · ${via}`);
  if (via !== 'cancelado') medir({ nombre: 'compartir', ean: r.ean, via, con_precio_aca: !!precioAca });
}

function mostrarHistorial() {
  const anteriores = historial.filter((h) => h.ean !== actual?.ean);
  $('historial').classList.toggle('oculto', anteriores.length === 0);
  $('hist-lista').innerHTML = anteriores
    .map((h) => {
      const nombre = h.estado === 'no-encontrado' ? 'Producto no encontrado' : h.nombre;
      const precio = h.estado === 'ok' ? fmtPrecio(h.tipico) : 'sin precio';
      return `<li><button type="button" data-ean="${esc(h.ean)}"><span class="h-nombre">${esc(nombre)}</span><span class="h-precio${h.estado === 'ok' ? '' : ' sin'}">${precio}</span></button></li>`;
    })
    .join('');
}

$('hist-lista').addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest('button[data-ean]') as HTMLButtonElement | null;
  const h = b && historial.find((x) => x.ean === b.dataset.ean);
  if (!h) return;
  mostrar(h);
  mostrarHistorial();
  window.scrollTo({ top: $('resultado').offsetTop - 12, behavior: 'smooth' });
});

$('borrar').addEventListener('click', () => {
  medir({ nombre: 'borrar_historial', cantidad: historial.length });
  anotar(`historial borrado (${historial.length})`);
  historial = [];
  actual = null;
  $('resultado').innerHTML = '';
  $('ayuda-codigo').classList.remove('oculto');
  mostrarHistorial();
});

async function consultar(ean: string) {
  const id = ++consultaId;
  anotar(`escaneo ${ean}`);
  $('resultado').innerHTML = `<div class="card cargando"><span class="spinner"></span>Buscando el precio…</div>`;
  if (!zona) {
    $('resultado').innerHTML = `<div class="card"><p class="nombre">Primero necesitamos saber dónde estás</p><p class="suele">Así te mostramos los precios de los súpers de tu zona.</p></div>`;
    return;
  }
  try {
    const r = (await consultarPrecio(ean, zona)) as Escaneado;
    if (id !== consultaId) return; // llegó otro código mientras tanto
    if (diag.producto) {
      diag.producto.resumen =
        r.estado === 'ok'
          ? `${r.nombre} · con precio hoy ${r.cantidadSuper}${r.desactualizados ? ` (+${r.desactualizados} viejos)` : ''} · mediana ${r.tipico} · mín ${r.minimo} · promos ${r.cantidadPromos}`
          : r.estado === 'sin-precios'
            ? `${r.nombre} · sin precios en la zona`
            : 'no encontrado';
    }
    historial = [r, ...historial.filter((x) => x.ean !== ean)].slice(0, 30);
    mostrar(r);
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
  } catch (e) {
    if (id !== consultaId) return;
    anotar(`escaneo ${ean} error · ${String(e)}`);
    $('resultado').innerHTML = `<div class="card"><p class="nombre">No pudimos consultar el precio</p><p class="suele">Revisá que tengas internet. También puede que el sistema de precios del Gobierno no esté andando: probá en un rato.</p></div>`;
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
    ($('manual-box') as HTMLDetailsElement).open = false;
    consultar(c);
  }
});

// ---- Hoja de datos técnicos ----
const fila = (k: string, v: string | number | null | undefined) => `<dt>${esc(k)}</dt><dd>${esc(v == null || v === '' ? '—' : String(v))}</dd>`;

function pintarHoja() {
  const u = diag.ubicacion;
  const z = diag.zona;
  const p = diag.producto;
  $('hoja-cuerpo').innerHTML = `
    <h3>Ubicación</h3><dl>
      ${fila('coordenadas', u ? `${u.lat.toFixed(5)}, ${u.lng.toFixed(5)}` : null)}
      ${fila('precisión', u ? `±${u.precisionM} m${u.buenaPrecision ? '' : ' (no llegó a 50 m)'}` : null)}
      ${fila('GPS', u ? `${(u.ms / 1000).toFixed(1)} s · ${u.lecturas} lecturas` : null)}
    </dl>
    <h3>Zona · /sucursales</h3><dl>
      ${fila('estado', z ? `${z.status ?? 'sin respuesta'} · ${z.ms} ms${z.error ? ` · ${z.error}` : ''}` : null)}
      ${fila('respondió', z ? `${z.respondidas} súpers` : null)}
      ${fila('a menos de 40 km', z?.dentro40)}
      ${fila('más cercano', z?.masCercana)}
      ${fila('localidad', zona?.localidad)}
    </dl>
    <h3>Último producto · /producto</h3><dl>
      ${fila('código', p?.ean)}
      ${fila('estado', p ? `${p.status ?? 'sin respuesta'} · ${p.ms} ms${p.error ? ` · ${p.error}` : ''}` : null)}
      ${fila('resumen', p?.resumen)}
    </dl>
    <h3>Registro</h3>
    <div class="registro">${esc(diag.registro.map((r) => `${r.hora} ${r.texto}`).join('\n') || '—')}</div>`;
  $('hoja-version').textContent = `versión ${diag.version}`;
}

$('debug').addEventListener('click', () => {
  pintarHoja();
  $('hoja-crudo').classList.add('oculto');
  $('hoja-ver-crudo').textContent = 'Ver respuesta cruda';
  $('hoja').classList.remove('oculto');
  medir({ nombre: 'debug_abierto' });
});
$('hoja-cerrar').addEventListener('click', () => $('hoja').classList.add('oculto'));
$('hoja').addEventListener('click', (e) => {
  if (e.target === $('hoja')) $('hoja').classList.add('oculto');
});
$('hoja-ver-crudo').addEventListener('click', () => {
  const pre = $('hoja-crudo');
  const abrir = pre.classList.contains('oculto');
  pre.textContent = JSON.stringify({ zona: diag.crudoZona, producto: diag.crudoProducto }, null, 1);
  pre.classList.toggle('oculto', !abrir);
  $('hoja-ver-crudo').textContent = abrir ? 'Ocultar respuesta cruda' : 'Ver respuesta cruda';
});
$('hoja-copiar').addEventListener('click', async () => {
  const texto = exportar();
  try {
    await navigator.clipboard.writeText(texto);
  } catch {
    const t = document.createElement('textarea');
    t.value = texto;
    document.body.appendChild(t);
    t.select();
    document.execCommand('copy');
    t.remove();
  }
  $('hoja-copiar').textContent = '¡Copiado!';
  setTimeout(() => ($('hoja-copiar').textContent = 'Copiar todo'), 2000);
});

// ---- Arranque ----
cargarZona();
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
