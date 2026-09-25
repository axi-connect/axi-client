# Imágenes del correo de bienvenida

Las cinco piezas estáticas del correo «Axi Noir» (plan `axi-server/docs/plans/entrega_bienvenida_plan.md`,
adenda N6 y «Diseño del correo v2»). Son iguales para todos los clientes: lo que cambia por cliente va
como texto real en el HTML del correo, nunca dentro de una imagen.

| Pieza | Lienzo | Salida |
|---|---|---|
| Portada tipográfica | `src/hero.html` | `public/images/email/welcome/hero.jpg` |
| El iPhone con el producto | `src/phones.html` | `public/images/email/welcome/phones.jpg` |
| Cotiza · Arma · Comparte | `src/tiles.html` | `public/images/email/welcome/tiles.jpg` |
| La semana como flujo | `src/week.html` | `public/images/email/welcome/week.jpg` |
| El kit como librillo | `src/kit.html` | `public/images/email/welcome/kit.jpg` |

`src/quote.svg`, `src/order.svg` y `src/pay.svg` son las ilustraciones fuente de `tiles.html`, que ya
las lleva incrustadas (con los atributos en kebab-case: fuera de React, `strokeWidth` o `fontFamily`
no hacen nada y el trazo sale mal).

## Regenerar

Desde la raíz de `axi-client`:

```bash
# Con playwright y sharp instalados en el repo
node scripts/email-welcome/render.mjs

# En este equipo, con los paquetes de otro checkout
PW_PATH=/home/davela/dev/kodecol/node_modules/playwright \
  node scripts/email-welcome/render.mjs

# Solo algunas piezas
node scripts/email-welcome/render.mjs hero kit
```

- Chromium pinta cada lienzo (`#c`, 600 px de ancho) a 2x; sharp lo pasa a JPEG con calidad 84,
  mozjpeg y croma 4:4:4 (sin submuestreo el texto coral no se emborrona).
- `playwright` está en `devDependencies`. Si el navegador no está descargado:
  `node <ruta a playwright>/cli.js install chromium`.
- `sharp` llega con `next`. Si no se resuelve, se indica su ruta con `SHARP_PATH`
  (por ejemplo `/home/davela/dev/axi/axi-server/node_modules/sharp`).
- Revisa las cinco imágenes antes de commitear: el correo las sirve desde
  `https://axi-connect.co/images/email/welcome/*.jpg`, una ruta pública (`/images` está en
  `PUBLIC_PATHS` y fuera del matcher del middleware).
- **Nunca se cambia el nombre de un archivo publicado**: los correos ya enviados lo siguen pidiendo.
  Si una pieza cambia de fondo, se sobrescribe; si cambia de sentido, va con un nombre nuevo.

## Fuentes (`src/fonts/`)

| Archivo | Familia | Licencia |
|---|---|---|
| `Nexa-Heavy.ttf`, `Nexa-ExtraLight.ttf` | Nexa (Fontfabric) | Pesos de la edición gratuita «Nexa Free»; el EULA de Fontfabric permite el uso comercial (revísalo si se cambia de versión). Son los mismos originales que el repo ya sirve en WOFF2 desde `public/fonts/nexa/`. Descarga: https://www.fontfabric.com/fonts/nexa/ |
| `poppins-300…700.woff2` | Poppins (Indian Type Foundry) | SIL Open Font License 1.1. https://fonts.google.com/specimen/Poppins |
| `shadows.woff2` | Shadows Into Light (Kimberly Geswein) | SIL Open Font License 1.1. https://fonts.google.com/specimen/Shadows+Into+Light |

Los WOFF2 de Google son el subconjunto latino que sirve `fonts.googleapis.com`.
