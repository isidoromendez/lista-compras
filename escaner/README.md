# ¿Cuánto sale? (escáner público)

Web pública y sin login: escaneás un producto y ves el **precio sugerido en los súpers a menos de 40 km**, con los datos que los supermercados informan a [Precios Claros](https://www.preciosclaros.gob.ar) (SEPA, Secretaría de Comercio).

- Sitio: `cuanto-sale.web.app` (segundo sitio de Hosting del proyecto `lista-compas-3763b`, target `escaner`).
- No usa la base de datos de la lista de compras ni Firebase Auth.
- TypeScript sin framework + Vite (≈13 KB de JS). Se instala como app (PWA).

## De dónde salen los precios

Servicio que usa el sitio preciosclaros.gob.ar (`/sucursales` y `/producto`). **No es oficial ni documentado**: solo responde desde Argentina y puede cambiar sin aviso. El formato real quedó guardado en `tests/fixtures/` (respuestas del 7/11/2026).

- Precio sugerido = mediana de los precios de lista **actualizados hoy** (`actualizadoHoy`). Si nadie actualizó, se usan los que hay y se avisa.
- Más barato: con nombre corto de la cadena y distancia. La sucursal se cruza con la clave `comercioId-banderaId-id`.
- Promo: la más barata de `promo1`/`promo2`, si deja el producto más barato que el mejor precio de lista.

## Medición de uso

Google Analytics 4, **apagado** hasta completar `GA_MEASUREMENT_ID` en `src/config.ts` (los pasos están en ese archivo). Eventos: `zona_lista`, `zona_error`, `escaneo` (resultado, código, producto, localidad, súpers, si tenía promo), `borrar_historial`, `instalar_toque`, `app_instalada`. No se manda la ubicación exacta.

## Comandos

```bash
cd escaner
npm install
npm run dev      # desarrollo
npm test         # pruebas (con respuestas reales de la API)
npm run build    # dist/
```
