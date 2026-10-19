# Hotfix «Application error: a client-side exception has occurred» (2026-10-19)

> **Estado:** implementado en `main` (pendiente de push y despliegue con OK del dueño).
> **Alcance:** solo `axi-client` (más el workflow de deploy del cliente). Sin migraciones ni cambios en el servidor.
> **Evidencia:** `docs/qa/hotfix-application-error/` (scripts de reproducción y capturas).

---

## 1. El síntoma

Al entrar a axi-connect.co, a veces y solo en algunos dispositivos, la página se queda en blanco con una sola línea:

```
Application error: a client-side exception has occurred while loading axi-connect.co
(see the browser console for more information).
```

Es la pantalla que Next.js pinta por defecto cuando una excepción del navegador llega a la raíz de React y **nadie la atrapa**. Da la impresión de que la aplicación está caída.

## 2. Causa raíz

Hay dos fallas que, juntas, producen el síntoma.

### 2.1 Cada despliegue borraba los chunks de la versión anterior

- Cada push a `main` dispara `.github/workflows/deploy.yml`, que construye una imagen nueva y **sustituye** el contenedor. Hubo 122 commits a `main` entre el 1 y el 19 de octubre, y cada uno es un despliegue.
- La imagen solo llevaba el `.next/static` de su propio build. Los nombres de los chunks llevan hash de contenido, así que los de la versión anterior desaparecían. Verificado: un chunk inexistente devuelve **404** en producción.
- Un navegador con el HTML de la versión anterior pide chunks que ya no existen. Ese HTML viejo aparece en cuatro casos:
  - una pestaña abierta antes del deploy;
  - una pestaña restaurada, sobre todo en móvil;
  - el botón atrás/adelante, que reutiliza el HTML de la caché;
  - un HTML que se descargó justo antes del swap. La portada pesa 1,3 MB, así que en una red móvil la ventana es larga.
- React pide decenas de chunks **después** del HTML:
  - los componentes cliente que referencia el payload RSC durante la hidratación (24 en `/auth/login`);
  - los `next/dynamic` del layout raíz (`AlertProvider`: el toaster entre 1,2 y 2,5 s después de entrar, y el Modal);
  - las fibras del hero en la home.

  Cualquiera que dé 404 lanza `ChunkLoadError`.
- Las **navegaciones** RSC entre versiones sí se protegen solas: Next compara el `buildId` y hace una navegación completa (`next/dist/client/components/router-reducer/fetch-server-response.js:156`). Los chunks que se cargan **durante el render** no tienen esa protección.

### 2.2 No había ninguna frontera de error

En `src/app` no existía ni un `error.tsx` ni un `global-error.tsx`. Todo `ChunkLoadError` (y cualquier otra excepción en render o efecto) subía a la raíz, y Next pintaba su pantalla genérica.

### 2.3 Reproducción contra producción, antes del arreglo

`docs/qa/hotfix-application-error/reproducir.mjs` carga una página con un Chromium headless y responde 404 a los chunks que no venían en el HTML, como tras un swap. Todo pasa en el navegador local: al servidor solo llegan GET.

```
BASE=https://axi-connect.co node docs/qa/hotfix-application-error/reproducir.mjs
→ chunksBloqueados: 24, pantallaGenerica: true
→ REPRODUCIDO: Next pintó «Application error»
```

Captura: `docs/qa/hotfix-application-error/evidencia/antes-login-application-error-produccion.png`. Es exactamente el mensaje que reportan los usuarios.

### 2.4 Causas secundarias del mismo síntoma

Salieron de la revisión del camino de entrada. Son menos frecuentes, pero dan la misma pantalla:

| Causa | Dónde | Cuándo |
|---|---|---|
| El traductor del navegador cambia los nodos de texto por `<font>` y React ya no puede insertar el icono del botón (react#11538) | Botón «Ingresar» del login; «Salir» de la barra de soporte | Chrome o Android en otro idioma, o con «traducir siempre» |
| `canvas.getContext("2d")!` devuelve `null` | `HeroFibers.tsx` (sprites) | iOS al pasar su tope de memoria de canvas |
| `Intl.DateTimeFormat({ timeZone })` lanza `RangeError` | `DashboardHeader`, `DashboardView` → `UsagePanel` y `ConversationsFlowCard` | Zona del negocio inválida o desconocida para el ICU del navegador (WebViews viejos) |
| `matchMedia().addEventListener` no existe | `use-mobile.ts` (todo el panel), `SiteMenuSheet.tsx` | Safari < 14 |

Se descartaron otras hipótesis. Los chunks de entrada de producción no tienen regex con lookbehind ni APIs ES2023 sin guarda (escaneados con grep). Storage y JSON.parse ya iban en try/catch. Los `play()` de audio y video ya tienen `.catch`.

## 3. La solución: cinco capas

Cada capa cubre un hueco distinto. Si una falla, la siguiente atrapa el problema.

```
 navegador con HTML viejo
          │ pide /_next/static/chunks/abc.js
          ▼
 ┌─────────────────────────────┐   CAPA 1: la imagen nueva TRAE los chunks de los
 │ ¿existe el chunk?           │── sí ─▶ la página funciona con su versión; la próxima
 └─────────────────────────────┘          navegación ve otro buildId y recarga sola
          │ no (más de 14 días, swap a mitad, red cortada)
          ▼
 ┌─────────────────────────────┐   CAPA 2: script en línea del <head>
 │ error en <script>/<link> de │── primera vez en 30 s ─▶ beacon + UNA recarga → HTML nuevo
 │ /_next/static/              │
 └─────────────────────────────┘
          │ ya recargó hace < 30 s (fallo persistente)
          ▼
 ┌─────────────────────────────┐   CAPA 3: fronteras de error
 │ QuietBoundary (accesorios)  │── la pieza (toaster, Modal, fibras) desaparece; la página sigue
 │ error.tsx / (private)/error │── pantalla de marca «Algo no cargó bien» + Reintentar/Recargar
 │ global-error.tsx            │── lo mismo si cayó el layout raíz
 └─────────────────────────────┘
          │ todas las capas informan
          ▼
   CAPA 4: POST /api/client-errors → línea `client_error` en docker logs
```

La capa 5 elimina en origen las causas secundarias de §2.4.

### Capa 1. Retención de estáticos entre despliegues (la causa raíz)

| Archivo | Qué hace |
|---|---|
| `Dockerfile` | `ARG PREV_IMAGE` (por defecto `node:22-alpine`) y una etapa `previous` que parte de la imagen en servicio. En `runner` copia los estáticos heredados y los del build nuevo, y corre la poda |
| `scripts/retain-static.sh` | Une los dos `static`, escribe el manifiesto del build y poda |
| `.github/workflows/deploy.yml` | Pasa `PREV_IMAGE=ghcr.io/<owner>/axi-client:latest`. Durante el build, `latest` todavía apunta a la imagen en servicio |

**Cómo poda:**
- Cada build escribe `.next/static-retention/<UTC YYYYmmddHHMMSS>-<sha>.txt` con la lista de sus archivos. El directorio queda fuera de `static`, así que no se sirve.
- Se conservan los manifiestos de los **últimos 15 builds que además tengan menos de 14 días**. El del build actual se conserva siempre.
- Se borra todo archivo que no figure en un manifiesto conservado, junto con los directorios que queden vacíos.
- La fecha va en el **nombre** del manifiesto, así que no depende del mtime de las capas de Docker.
- **Arranque:** la primera imagen con este cambio hereda estáticos sin manifiesto. El script les crea un manifiesto `-previous` y no se pierden en ese despliegue. Por eso **este mismo despliegue ya protege** a quien tenga el HTML de la versión actual.
- **Tamaño:** un build ocupa unos 16 MB de estáticos. Los chunks sin cambios conservan su nombre, así que la unión crece solo con lo que cambia. Cota en el peor caso: 15 × 16 MB. La línea `retain-static: …` del log del build muestra el tamaño real.
- **En local** (sin `PREV_IMAGE`): la etapa `previous` es una alpine vacía y la imagen sale solo con su build, como antes.

Ajustes por variable de entorno del script: `KEEP_BUILDS` (15) y `KEEP_DAYS` (14). Pruebas: seis despliegues simulados en cadena, con busybox (el `sh` de la imagen) y con GNU, más `docker build --target previous`. Ver §5.

### Capa 2. Recuperación automática antes de React

- **`src/core/lib/chunk-recovery.ts`** contiene:
  - `CHUNK_RECOVERY_SCRIPT`: script ES5 autocontenido que `src/app/layout.tsx` inserta **en línea** en el `<head>`. Tiene que vivir en línea porque lo que falla son justamente los chunks.
  - `isChunkLoadError` y `reloadOnce`: la misma regla, para las fronteras de React.
- **Qué hace el script:**
  - Escucha `error` en **fase de captura**: los errores de carga de recursos no burbujean, pero en captura llegan a `window`. Solo actúa si viene de un `<script>` o `<link>` de `/_next/static/`. Un script de terceros que falla, como el SDK de Facebook o GTM, no lo dispara.
  - Escucha también `unhandledrejection` con `ChunkLoadError`.
  - Recarga **una vez cada 30 s**. Anota el instante en `sessionStorage['axi:chunk-reload']`. Si el chunk vuelve a fallar dentro de esos 30 s, no insiste: el problema no era un HTML viejo y recargar en bucle solo lo empeoraría.
  - **Sin `sessionStorage`** (webviews con storage bloqueado) no recarga, porque no tendría dónde anotar el intento.
  - Antes de recargar envía un `sendBeacon` a la telemetría, que sobrevive a la recarga. Envía **3 como máximo por carga**: un HTML viejo hace fallar decenas de chunks a la vez.
- **Verificado en Chromium real sobre el HTML de producción**, con el script inyectado (`recuperacion-inyectada.mjs`):
  - 404 solo en la primera carga: **una** recarga, el login queda usable y llega 1 reporte.
  - 404 permanente: **una** recarga, sin bucle.

  Capturas en `evidencia/recuperacion-inyectada-*.png`.

### Capa 3. Fronteras de error (se acabó la pantalla genérica)

| Archivo | Atrapa | Qué se ve |
|---|---|---|
| `src/shared/components/features/error-recovery/QuietBoundary.tsx` | Piezas **accesorias** en diferido: toaster y Modal del `AlertProvider`, fibras del hero (`HeroFibersLazy`) | Nada: la pieza desaparece y la página sigue. Viven por encima de cualquier `error.tsx`, así que sin esto su fallo solo lo atrapaba `global-error` y se perdía la página entera |
| `src/app/(private)/error.tsx` | Cualquier vista del panel | La pantalla de error **dentro del shell**: el sidebar y la cabecera siguen y se puede ir a otro módulo |
| `src/app/error.tsx` | Cualquier página bajo el layout raíz (pública, onboarding, `/platform`…) | Pantalla de marca, con los providers vivos |
| `src/app/global-error.tsx` | El propio layout raíz o uno de sus providers | La misma pantalla, con su propio `<html>`/`<body>` y `globals.css`, sin providers ni fuentes de marca |

**La pantalla** (`ErrorRecovery.tsx`) sigue el patrón del 404 (`src/app/not-found.tsx`: `BrandMark` + `Button` del DS):
- **Ante un chunk:** llama a `reloadOnce()` y muestra «Actualizando a la versión más reciente…». Si ya recargó, explica qué pasó y ofrece «Recargar la página».
- **Ante otro error:** titular «Algo no cargó bien», una frase humana y «Reintentar» (`reset()`) más «Recargar la página».
- Nunca muestra el mensaje técnico. El `digest` aparece pequeño («Código: …») para que soporte lo busque en los logs del servidor.

### Capa 4. Telemetría propia de errores del cliente

- **`src/app/api/client-errors/route.ts`** recibe `POST` y escribe **una línea JSON por error** en la salida del contenedor. Responde 204.
- **`client-error-log.ts`** contiene las reglas. Viven aparte porque un `route.ts` de Next solo puede exportar métodos HTTP y su configuración.
- **`src/core/lib/report-client-error.ts`** es el emisor: usa `sendBeacon`, con `fetch keepalive` como alternativa, y nunca lanza.

**Defensas** (el endpoint es público por fuerza: un error puede ocurrir antes de cualquier sesión):
- cuerpo de 4 KB como máximo (413) y cada campo recortado;
- 20 por minuto por IP (429), tomada de `x-forwarded-for`, con un techo de 5.000 IPs vigiladas en memoria;
- `kind` en lista cerrada (`chunk | boundary | global`; cualquier otro valor se guarda como `unknown`);
- sin cookies ni usuario;
- **el path, saneado:** sin query ni hash, y los segmentos de 16 caracteres o más, o numéricos de 6 dígitos o más, se cambian por `:x`. Así los tokens de `/bienvenida/:token`, `/configurar/:token` y `/pay/…` nunca llegan al log;
- el asset fallido guarda solo su pathname.

**Cómo leerla en el VPS:**

```bash
# Todo lo de las últimas 24 h
docker logs --since 24h <contenedor-del-cliente> 2>&1 | grep '"evt":"client_error"'

# Contar por tipo y nombre
docker logs --since 24h <contenedor> 2>&1 | grep '"evt":"client_error"' \
  | sed -E 's/.*"kind":"([^"]*)".*"name":"([^"]*)".*/\1 \2/' | sort | uniq -c | sort -rn

# ¿Qué dispositivos? (campo ua)
docker logs --since 24h <contenedor> 2>&1 | grep '"evt":"client_error"' | grep -o '"ua":"[^"]*"' | sort | uniq -c | sort -rn | head
```

**Cómo distinguir las causas:**
- **`kind: chunk` con un `asset` que el build actual no tiene** era HTML viejo de más de 14 días o de más de 15 builds. Se comprueba con `curl -sI https://axi-connect.co<asset>`, que da 404.
- **`kind: chunk` con un asset que sí existe** fue un corte de red o un 502 durante el swap. Para cerrar este caso, ver §6.3.
- **`name: "asset-error:no-reload"`** significa que falló otra vez dentro de los 30 s.
- **`kind: boundary` o `global`** es un error de código. Hay que leer `message`, `path` y `ua`. Si trae `digest`, se busca ese mismo digest en el log del servidor.
- **`boundary: "quiet:toaster"` (o `quiet:modal`, `quiet:hero-fibers`)** es una pieza accesoria que no cargó y desapareció en silencio.

### Capa 5. Endurecimiento puntual del camino de entrada

- **Login** (`src/app/(public)/auth/login/form.tsx`) y **`SupportSessionBar.tsx`**: el texto del botón va dentro de un `<span>`. Con el traductor activo, React ya no pierde el nodo hermano al cambiar el icono.
- **`HeroFibers.tsx`**: si `getContext("2d")` del sprite devuelve null, el sprite queda vacío y no se lanza nada.
- **`safeTimeZone(tz)`** (`src/core/lib/format.ts`): valida la zona contra el `Intl` del navegador. Si no la conoce, devuelve `undefined` y se pinta en la zona del navegador. Se aplica en `DashboardHeader` y `DashboardView`, que la pasa a `UsagePanel` y `ConversationsFlowCard`.
- **`onMediaQueryChange(mql, fn)`** (`src/core/lib/media-query.ts`): usa `addEventListener` y, si no existe (Safari < 14), `addListener`. Se usa en `use-mobile.ts` y `SiteMenuSheet.tsx`.
- **`AlertProvider.flush()`**: agregado `.catch`. Si el chunk del toaster falla, los avisos quedan en cola para el siguiente intento, sin rechazos sueltos.

## 4. Archivos

**Nuevos**
- `scripts/retain-static.sh`
- `src/core/lib/chunk-recovery.ts`
- `src/core/lib/report-client-error.ts`
- `src/core/lib/media-query.ts`
- `src/app/api/client-errors/route.ts`
- `src/app/api/client-errors/client-error-log.ts`
- `src/app/error.tsx`
- `src/app/global-error.tsx`
- `src/app/(private)/error.tsx`
- `src/shared/components/features/error-recovery/ErrorRecovery.tsx`
- `src/shared/components/features/error-recovery/QuietBoundary.tsx`
- Tests:
  - `src/core/lib/__tests__/chunk-recovery.test.ts`
  - `src/core/lib/__tests__/safe-time-zone.test.ts`
  - `src/app/api/client-errors/__tests__/client-errors.test.ts`
  - `src/shared/components/features/error-recovery/__tests__/ErrorRecovery.test.tsx`
- QA: `docs/qa/hotfix-application-error/{reproducir.mjs, recuperacion-inyectada.mjs, evidencia/}`

**Modificados**
- `Dockerfile`
- `.github/workflows/deploy.yml`
- `src/app/layout.tsx`
- `src/core/providers/alert-provider.tsx`
- `src/core/lib/format.ts`
- `src/core/hooks/use-mobile.ts`
- `src/app/(public)/auth/login/form.tsx`
- `src/modules/support-access/ui/SupportSessionBar.tsx`
- `src/modules/landing/ui/film/parts/HeroFibers.tsx`
- `src/modules/landing/ui/film/parts/HeroFibersLazy.tsx`
- `src/modules/dashboard/ui/DashboardView.tsx`
- `src/modules/dashboard/ui/components/DashboardHeader.tsx`
- `src/shared/components/layout/site/SiteMenuSheet.tsx`
- `docs/architecture.md` §14
- `docs/adr.md`

## 5. Verificación

| Prueba | Resultado |
|---|---|
| `tsc --noEmit` (proyecto entero) | 0 errores |
| `eslint` de los archivos tocados | limpio |
| Tests nuevos (4 suites) | 37 de 37 en verde |
| Tests relacionados con los archivos tocados (`--findRelatedTests`) | 278 suites, 2.044 tests en verde |
| `retain-static.sh`: 6 despliegues simulados en cadena (`docs/qa/hotfix-application-error/retain-static.test.sh`) que cubren el arranque sin manifiestos, las rutas con `()` y `[]`, que conserve lo de menos de 14 días y pode lo de más, el tope por número, el borrado de directorios vacíos y que nunca toque el build actual | verde con busybox (alpine) y con GNU |
| `docker build --target previous` | la etapa crea `static/` y `static-retention/` |
| Reproducción contra producción, antes del arreglo | «Application error» reproducido |
| Capa 2 inyectada sobre el HTML de producción, en Chromium | una recarga y página usable (once); sin bucle (always) |

**Lo que corre el dueño** (regla: él compila):
1. `npm run build:safe && npm start`.
2. `node docs/qa/hotfix-application-error/reproducir.mjs --once` debe dar «OK, recargas = 1».
3. Sin `--once`, debe dar «OK» y nunca «REPRODUCIDO». Con un 404 permanente se verá la página o la pantalla de marca, nunca la genérica, salvo que el chunk que falte sea el de la propia frontera de error (§6, límite 1).
4. En la consola del `npm start` deben aparecer líneas `"evt":"client_error"`.

**Después del push** (el push despliega):
- `curl https://axi-connect.co/api/version` debe devolver el SHA nuevo.
- `curl -sI https://axi-connect.co/_next/static/chunks/webpack-92ee21ece275dc36.js` (un chunk de la versión del 19-10) debe dar **200**, no 404.
- En el log del job de build, la línea `retain-static: builds conservados=2 …` (el arranque más el actual).

## 6. Límites conocidos

1. **Si faltan los chunks de la frontera de error**, ninguna frontera puede pintarse. Pasa con un servidor que no sirve estáticos de forma persistente o con un HTML de más de 14 días. La capa 2 ya habrá recargado una vez y habrá dejado el beacon. Tras la recarga el HTML es nuevo, así que este caso solo queda con el servidor de estáticos realmente caído.
2. **Durante el swap del contenedor** puede haber unos segundos de 502. La capa 2 recarga una vez, pero si la recarga cae dentro del mismo hueco, el usuario ve la página de error de nginx. Lo resuelve el punto 3 de §7.
3. **La telemetría vive en memoria y en stdout.** El límite por IP se reinicia con cada despliegue, y los logs duran lo que retenga Docker.
4. **Los chunks retenidos viven en la imagen.** Un rollback a una imagen anterior a este hotfix vuelve al comportamiento viejo hasta el siguiente despliegue.

## 7. Cómo hacerlo más robusto después (ordenado por valor)

1. **Sentry o GlitchTip (este último, autoalojable) con source maps.** Agrupa errores, da trazas legibles de código minificado, alerta por correo o Slack, y permite seguir sesiones por versión. La telemetría propia es un puente. Al adoptarlo, `reportClientError` pasa a ser un adaptador hacia el SDK; las fronteras ya llaman a un único punto.
2. **Estáticos fuera de la imagen: almacenamiento de objetos o CDN con `assetPrefix`.** Por ejemplo, subir `.next/static` a `storage.axi-connect.co` (MinIO) o a Cloudflare R2 en cada build, sin borrar nunca y con una regla de ciclo de vida de 30 a 90 días. Ventajas: imagen más liviana, retención larga, CDN con `immutable` y cero dependencia del contenedor en servicio. Sustituiría a la capa 1.
3. **Swap azul/verde con drenaje en `deploy-image.sh`** (VPS, fuera del repo). Se levanta el contenedor nuevo, se espera a su healthcheck, nginx cambia el upstream con `nginx -s reload` y el viejo se apaga tras unos 30 s. Así no hay 502 durante el cambio (límite 2).
4. **`deploymentId` de Next** (`next.config.ts`: `deploymentId: process.env.BUILD_SHA`, pasando `BUILD_SHA` también a la etapa `builder`). Añade `?dpl=` a los assets y la cabecera `x-deployment-id`. Combinado con el punto 2, permite enrutar cada versión a sus estáticos.
5. **`browserslist` explícito** (por ejemplo `chrome >= 111, safari >= 16.4, firefox >= 111`, coherente con el `color-mix()` que ya usa la landing), más `transpilePackages` para `zod`, `@radix-ui/*` y `framer-motion`, si se quiere dar soporte a iOS < 13.4. Hoy esas dependencias salen con `?.` y `??` sin transpilar.
6. **Traductor del navegador.** Decisión de producto: `translate="no"` en el `<html>` corta de raíz los fallos de react#11538, pero impide traducir el sitio. Alternativa sin coste de producto: una regla de lint o revisión que exija envolver en `<span>` todo texto condicional que sea hermano de un elemento condicional.
7. **Sonda sintética tras cada deploy:** un job del workflow que corra `reproducir.mjs --once` contra producción y falle si aparece «Application error». También que pida un chunk del build anterior y exija un 200.
8. **Alerta por tasa de errores.** Mientras no haya Sentry, un cron en el VPS que cuente `client_error` cada 5 minutos y avise por WhatsApp o Telegram (ya hay canales) si supera un umbral.
9. **Fronteras por módulo** en las vistas pesadas (inbox, CRM, catálogo, llamadas), para que un fallo de una tarjeta no se lleve la vista entera. El patrón `TileError` del dashboard ya existe para las fichas.
10. **Endurecer la telemetría** si se vuelve ruidosa o se abusa de ella: un tope global por minuto además del de por IP, muestreo de los `chunk` repetidos y persistencia en una tabla o en Loki/Grafana en vez de stdout.
11. **Bajar el peso de la portada** (auditoría, `docs/qa/auditoria-rendimiento-2026-10/informe.md`, A1). Menos HTML significa menos tiempo con un HTML a medio bajar durante un swap, además de un LCP mejor.
