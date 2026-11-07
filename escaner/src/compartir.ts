// Texto para compartir un producto (WhatsApp, etc.). Pensado para leerse de corrido en el chat.
import { fmtPrecio, type Resultado } from './precios.ts';
import { enCuadras, semaforo } from './texto.ts';

export const SITIO = 'https://cuanto-sale.web.app';
export const MENSAJE_APP =
  'Mirá esta app: escaneás el código de barras en el súper y te dice si el precio está caro o barato para tu barrio. Es gratis y no hay que registrarse.';

type Compartible = Extract<Resultado, { estado: 'ok' | 'sin-precios' }>;

export function enlaceProducto(ean: string, base = SITIO): string {
  return `${base}/?p=${encodeURIComponent(ean)}`;
}

export function textoCompartir(r: Compartible, localidad: string, precioAca?: number | null): string {
  // El nombre del servicio muchas veces ya trae la marca y el tamaño: no repetirlos.
  const yaTrae = r.marca && r.nombre.toLowerCase().includes(r.marca.toLowerCase());
  const extra = yaTrae ? '' : [r.marca, r.presentacion].filter(Boolean).join(' ');
  const titulo = [r.nombre, extra].filter(Boolean).join(' · ');
  const zona = localidad ? ` en ${localidad}` : '';
  if (r.estado === 'sin-precios') {
    return `${titulo}\nNingún súper${zona} informa su precio.`;
  }
  const lineas = [titulo, `Por acá${zona} suele costar ${fmtPrecio(r.tipico)}.`];
  const lejos = (km: number | null | undefined) => (km != null ? ` (${enCuadras(km)})` : '');
  if (r.cantidadSuper > 1) {
    lineas.push(`Más barato en ${r.masBarato.sucursal.cadena}: ${fmtPrecio(r.masBarato.precio)}${lejos(r.masBarato.sucursal.distanciaKm)}.`);
  }
  if (r.promo) {
    lineas.push(
      `¡Oferta en ${r.promo.sucursal.cadena}!${r.promo.descripcion ? ` ${r.promo.descripcion}:` : ''} ${fmtPrecio(r.promo.precio)} cada uno.`,
    );
  }
  if (precioAca) {
    const v = semaforo(precioAca, r.tipico);
    const veredicto =
      v.tipo === 'caro' ? `está caro (${fmtPrecio(v.diferencia)} más)` : v.tipo === 'barato' ? `¡buen precio! (${fmtPrecio(-v.diferencia)} menos)` : 'precio normal';
    lineas.push(`Acá lo vi a ${fmtPrecio(precioAca)}: ${veredicto}.`);
  }
  if (r.soloDesactualizados) lineas.push('Ojo: ningún súper lo actualizó hoy.');
  return lineas.join('\n');
}
