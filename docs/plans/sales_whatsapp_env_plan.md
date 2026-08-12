# Estandarizar el WhatsApp comercial (`NEXT_PUBLIC_SALES_WHATSAPP`)

## Contexto

El número de WhatsApp de ventas de axi está hoy en **dos mecanismos paralelos y desincronizados** dentro de `axi-client`, y el usuario quiere poder cambiarlo en un solo sitio con la certeza de que aplica en todas partes.

La verificación pedida arrojó tres hallazgos que cambian el alcance:

1. **Existe duplicación real.** `core/config/env.ts` lee la variable de entorno (la usan los CTA del trial y el checklist de canales), mientras `modules/landing/ui/content/landing.content.ts:18` hardcodea `WHATSAPP_AGENT_NUMBER = "573224970950"` con su propio constructor de enlaces `buildWaLink()` (lo usan el hero, el CTA final, `/contacto` y el formulario de demo). Dos funciones distintas construyen el mismo `https://wa.me/…`.

2. **Hay dos bugs vivos, no solo desorden.**
   - `.env.local` tiene `NEXT_PUBLIC_SALES_WHATSAPP=3224970950`, **sin el indicativo `57`**. En desarrollo los CTA del trial generan `https://wa.me/3224970950`, que WhatsApp no resuelve.
   - `Dockerfile` (líneas 35-40) y `.github/workflows/deploy.yml` (líneas 51-54) declaran build args para `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_WS_BASE_URL` y `NEXT_PUBLIC_STORAGE_URL`, **pero no para el WhatsApp de ventas**. Como las `NEXT_PUBLIC_*` se hornean en el bundle en tiempo de build, en la imagen de producción `SALES_WHATSAPP` vale `""` y **los tres CTA comerciales del panel privado no se renderizan nunca**. La landing sí funciona, precisamente porque tiene el número hardcodeado.

3. **Los tres archivos de `axi-server` de la lista original son falsos positivos.** `phone.ts`, `phone.spec.ts` y `save_contact_data.tool.spec.ts` no conocen la variable: usan `3224970950` como *fixture* de normalización telefónica de contactos (un celular colombiano dictado sin indicativo). El backend no tiene ni variable, ni constante, ni namespace de config para el número comercial. **No se tocan.**

Resultado buscado: un único punto de definición (la variable de entorno), un único constructor de enlaces, y un pipeline que no pueda desplegar sin el número.

## Decisiones acordadas

| Decisión | Elección |
|---|---|
| Variable ausente en el build | **El build falla** (`throw` en `env.ts`). Impide repetir el escenario de producción actual, donde faltaba en silencio. |
| Texto visible en `/contacto` | **Derivado con un helper** `formatSalesWhatsApp()`, no una segunda variable. |
| `axi-server` | **Sin cambios.** |

## Trabajo

### 0. Preparación

- Worktree propio (`feat/sales-whatsapp-env`), según la convención del proyecto.
- Copiar este plan a `axi-client/docs/plans/sales_whatsapp_env_plan.md`.
- Sin symlink de `node_modules` en el worktree fallan `npm run build` y `npm run api:types` (problema conocido).

### 1. `src/core/config/env.ts` — la única fuente de verdad

Sustituir el bloque actual (líneas 15-26) por:

- `SALES_WHATSAPP`: resuelto en carga de módulo. Normaliza (quita `+`, espacios, guiones y paréntesis: así `+57 322 497 0950` en el `.env` también es válido), aplica la **regla Colombia-first** —10 dígitos empezando por `3` ⇒ se antepone `57`— que es exactamente el criterio de `axi-server/src/core/system/kernel/phone.ts:17,40-42`, y valida contra E.164 (7-15 dígitos). Esa regla arregla por sí sola el valor malo del `.env.local`.
- **`throw` explícito** con mensaje accionable si la variable falta o no es un número plausible, indicando el formato esperado (`573224970950`).
- `salesWhatsAppUrl(message?)`: pasa a devolver **`string`** (ya nunca `null`) y el mensaje pasa a ser **opcional**, para poder construir el enlace pelado que necesita la tarjeta de `/contacto`.
- `formatSalesWhatsApp()`: `573224970950` → `"+57 322 497 0950"` cuando casa el patrón colombiano; en cualquier otro caso, `"+<dígitos>"` sin agrupar.

### 2. Borrar el mecanismo duplicado de la landing

En `src/modules/landing/ui/content/landing.content.ts`:

- Eliminar `WHATSAPP_AGENT_NUMBER` (:18) y `buildWaLink()` (:21-23).
- `CONTACT.details` (:849): `value: formatSalesWhatsApp()` y `href: salesWhatsAppUrl()`.
- **`WA_MESSAGES` y `buildDemoLeadWaText()` se quedan aquí**: son copy, no configuración. La regla del encabezado del archivo ("ninguna sección hardcodea texto ni cifras") se mantiene para el texto; lo que se va es solo el dato de configuración.

Actualizar los 4 consumidores para que importen `salesWhatsAppUrl` de `@/core/config/env` (mismo argumento, misma forma de llamada):

- `modules/landing/ui/sections/LandingHero.tsx:68`
- `modules/landing/ui/sections/LandingFinalCta.tsx:72`
- `modules/landing/ui/forms/DemoLeadForm.tsx:64`
- `app/(public)/contacto/page.tsx:75`

### 3. Limpiar las guardas que quedan muertas

Con `salesWhatsAppUrl()` devolviendo siempre `string`, dos condicionales dejan de tener rama falsa y deben irse (si no, mienten sobre un estado imposible):

- `modules/companies/ui/components/TrialCountdownBanner.tsx:40` — quitar el ternario `{cta ? … : null}`.
- `modules/channels/ui/components/connect/PrerequisitesChecklist.tsx:126` — quitar `supportUrl !== null &&`.

`core/providers/company-suspended-screen.tsx:48` **conserva su guarda**: ahí el `null` viene de `variant !== "trial_expired"`, no de la ausencia de número.

### 4. Pipeline y configuración (lo que arregla producción)

- **`Dockerfile`** — añadir `ARG NEXT_PUBLIC_SALES_WHATSAPP` y su línea en el `ENV` del stage `builder`, junto a las otras tres.
- **`.github/workflows/deploy.yml`** — añadir el build arg siguiendo el patrón ya usado: `NEXT_PUBLIC_SALES_WHATSAPP=${{ vars.NEXT_PUBLIC_SALES_WHATSAPP || '573224970950' }}`. El default literal vive en el pipeline (sobreescribible con una Variable del repositorio), no en el código de la aplicación, así que el build de CI nunca se queda sin número pese al `throw`.
- **`.env.example`** — documentar la variable (hoy no aparece), marcándola como obligatoria.
- **`.env.local`** — corregir `3224970950` → `573224970950`. No está versionado, pero conviene dejarlo canónico.

### 5. Tests

- **`jest.config.cjs` + nuevo `jest.env.ts`** — añadir `setupFiles: ['<rootDir>/jest.env.ts']` que fije `process.env.NEXT_PUBLIC_SALES_WHATSAPP` si no está. Sin esto, el `throw` de `env.ts` tumba **toda** la suite: `env.ts` entra transitivamente por `core/services/http.ts` en casi cualquier test. Va en `setupFiles` (no en `setupFilesAfterEnv`) porque debe correr antes de que se evalúe cualquier módulo del test.
- **`core/providers/__tests__/company-suspended-screen.test.tsx:15-17`** — el comentario y el assert asumen hoy que sin variable el CTA no aparece; esa premisa se invierte. Pasar a verificar que el enlace comercial existe y apunta al `wa.me` correcto.
- **Nuevo `src/core/config/__tests__/env.test.ts`** — cubre el invariante, hoy sin ningún test: normalización con indicativo y sin él, tolerancia a `+`/espacios/guiones, `formatSalesWhatsApp()` en colombiano y en internacional, y que la ausencia de la variable lanza. Para las variantes hay que reasignar `process.env` y recargar el módulo con `jest.isolateModules`, porque `SALES_WHATSAPP` se resuelve en carga.

### 6. Documentación

- **`docs/architecture.md` §13** (líneas 484-486) — la nota "Sin valor, el CTA simplemente no se muestra" deja de ser cierta: pasa a ser variable **obligatoria** que rompe el build, y su alcance ya no es solo el trial sino también la landing pública y `/contacto`.

## Verificación

1. `npm run lint` limpio sobre los archivos tocados (usar la lista de `git show --name-only`, no de memoria).
2. `npm test` — suite completa verde, con atención a que el nuevo `jest.env.ts` no haya dejado suites rotas.
3. **Prueba del fail-fast:** `NEXT_PUBLIC_SALES_WHATSAPP= npm run build` debe abortar con el mensaje accionable; `npm run build` normal (con `.env.local`) debe pasar.
4. **Prueba de la normalización:** poner temporalmente `NEXT_PUBLIC_SALES_WHATSAPP=3224970950` (sin indicativo) y confirmar que los enlaces siguen saliendo como `wa.me/573224970950`.
5. **Verificación visual** (receta de chromium sin sudo del proyecto), levantando el servidor el usuario: en `/` el botón del hero y el CTA final, y en `/contacto` la tarjeta de WhatsApp y el bloque de contacto — que el `href` sea `https://wa.me/573224970950?text=…` y que el texto visible diga `+57 322 497 0950`.
6. **Prueba del cambio de número** (el objetivo real del encargo): cambiar la variable a otro número en `.env.local`, rebuild, y confirmar que **los seis puntos** cambian a la vez — hero, CTA final, `/contacto` (enlace y texto), banner de trial, pantalla de prueba finalizada y checklist de prerrequisitos de canales.
7. Reindexar el grafo de `axi-client` en `codebase-memory` al terminar.

## Fuera de alcance

- **`axi-server`**: no se toca nada. Los tres archivos señalados usan el número como fixture de normalización telefónica.
- **Worktrees bajo `axi-client/.claude/worktrees/`**: tienen copias de estos archivos, pero pertenecen a otras ramas y se resuelven por merge, no editándolos.
- `README.md:198-203` tiene datos desactualizados (`src/config/env.ts` y puerto 3001) sin relación con este cambio; se puede corregir aparte.
