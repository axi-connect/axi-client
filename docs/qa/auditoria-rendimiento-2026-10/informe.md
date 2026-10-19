# Auditoría de rendimiento y efectividad — axi-client + despliegue (2026-10-19)

> **Alcance** (lo eligió el dueño): `axi-client` completo, más las cabeceras y la caché de nginx y el pipeline de deploy. `axi-server` queda fuera, para una segunda pasada.
> **Origen:** nace con el hotfix «Application error» (`docs/plans/hotfix_application_error_plan.md`). Ese hotfix ya resuelve lo urgente; esto es lo que sigue.
> **Método:**
> - lectura de código con evidencia `archivo:línea`;
> - medición del build local en `.next/server/app/`, del 13 de octubre, que puede diferir algo del de producción;
> - cabeceras reales de producción con `curl`.
>
> Las cifras marcadas «≈» o «estimado» no están medidas.
> **Nada de esto está implementado.** Cada punto es una propuesta que se aprueba aparte.

## Resumen ejecutivo

| # | Hallazgo | Impacto | Esfuerzo | Propuesta |
|---|---|---|---|---|
| A1 | La portada pesa **1,3 MB** de HTML (160 KB con gzip) | Alto: LCP, CPU en móvil y ventana de fallo durante el deploy | Medio | Un solo nicho en el HTML; geometría SVG fuera del árbol React |
| A2 | Cada visitante anónimo provoca 1 o 2 llamadas al backend (`/api/auth/session`) | Alto: carga del API sin valor | Bajo | Respuesta inmediata si no hay cookies de sesión |
| A3 | CSS bloqueante de ≈ 574 KB en la home (87 KB con gzip) | Alto: render bloqueado | Medio | Separar el CSS del panel y de las escenas bajas de la película |
| A4 | nginx duplica cabeceras: **COOP contradictoria** | Alto en riesgo (alta de WhatsApp por Meta) | Bajo (VPS) | Quitar `Cross-Origin-Opener-Policy` de nginx |
| A5 | Sin telemetría ni alertas de errores del cliente | Alto: los errores solo los veía el usuario | — | **Resuelto en parte por el hotfix**; siguiente paso, Sentry o GlitchTip |
| M1 | framer-motion en el JS común de todas las rutas | Medio | Bajo | `matchMedia` en lugar de `useReducedMotion` en la raíz |
| M2 | Sin `browserslist`; dependencias con `?.` y `??` sin transpilar | Medio | Bajo | Fijar navegadores objetivo |
| M3 | El polling no se pausa con la pestaña oculta | Medio: carga del API | Bajo | Hook `useVisiblePolling` |
| M4 | Doble viaje en cada carga completa del panel | Medio | Medio | Usuario resuelto en el servidor y pasado como `initialUser` |
| M5 | 4,6 MB de PNG sin uso en `public/brand` | Medio: tamaño de la imagen | Trivial | Borrarlos |
| M6 | El presupuesto de bundle no vigila HTML, RSC ni CSS | Medio: A1 y A3 pasaron sin alarma | Bajo | Ampliar `check-bundle-budget.mjs` |
| M7 | Sin brotli; gzip solamente | Medio | Bajo (VPS) | `brotli on` en nginx |
| B1–B6 | Código muerto, fuentes, middleware, storage sin `try` | Bajo | Trivial | Ver detalle |

**Qué ya está bien hecho** (no tocar):
- gsap y lenis van en `import()` diferido (`FilmRoot.tsx:443`);
- recharts siempre con `next/dynamic`;
- confetti en diferido;
- **no hay sockets en las páginas públicas** (`core/realtime/realtime-control.ts`);
- observers, rAF y timers se limpian (`FilmRoot.tsx:400-409, 499-511`, `SiteHeader.tsx:153-163`, `use-socket.ts:48-57`);
- react-query de `/platform` bien configurado (staleTime 30 s, sin reintentos en 4xx);
- el middleware no hace fetch;
- video y audio con `preload="none"` y poster;
- las fuentes de marca en WOFF2 con el peso 300 ya podado;
- el presupuesto de bundle de JS existe y se respeta.

---

## Alto

### A1. La portada pesa 1,3 MB de HTML

**Medido** (build local): `index.html` 1.306.854 B (159.766 con gzip -9); `index.rsc` 661.969 B (91.396 con gzip). **Producción:** `content-length: 1307303` y `content-encoding: gzip` activo.

Por qué pesa tanto, de mayor a menor:
1. **El árbol de la película va dos veces.** Una como HTML y otra como payload RSC dentro de 330 `self.__next_f.push(...)` (≈ 738 KB). Todas las escenas son Server Components y pasan como `children` de la isla cliente `FilmRoot` (`src/modules/landing/ui/film/FilmPage.tsx:41-95`). Es normal en App Router, pero con un árbol de este tamaño cuesta mucho.
2. **Cuatro variantes por nicho.** `ByNiche` (`src/modules/landing/ui/film/parts/ByNiche.tsx:24-28`) pinta los cuatro `FILM_NICHES` (`domain/film/niches.ts:11`) y oculta tres con CSS. Aparece en 49 sitios: ≈ 270 KB de HTML dentro de envoltorios `data-only`, más su equivalente en RSC.
3. **Geometría SVG sobremuestreada y repetida.**
   - Hay rectas como cientos de segmentos de 6 px con `.0` sobrante (`M 291.0 1391.0 L 291.0 1385.0 …`). Un mismo trazado de 7 KB aparece 5 veces en el RSC.
   - `goal.tsx:81-99` repite `GOAL_ROUTE_PATH` en 6 `<path>`.
   - `measure.tsx:99-108` genera 8 embudos (4 nichos × escritorio/móvil).
   - Las fuentes de esa geometría: `domain/film/route-map.ts`, `thread-path.ts`, `funnel-fibers.ts`, `flight-route.ts` y `hero-fibers.ts`.
4. **La ciudad de la escena goal.** `goalCityBlocks()` (`route-map.ts:159-176`) produce 327 `<rect>`, cada uno con unos 110 caracteres de `style="color-mix(...)"` (`goal.tsx:63-77`): ≈ 42 KB solo de estilos en línea.

Peso por escena en el HTML: goal 131 KB · measure 73 KB · pilot 63 KB · pipeline 40 KB · photo 25 KB · axel 23 KB · collect 22 KB.

**Por qué importa más allá del LCP:**
- Un móvil tiene que parsear 1,3 MB de HTML y 660 KB de RSC antes de hidratar.
- Mientras el HTML baja, el contenedor puede cambiar. Esa ventana es la que causaba el «Application error».

**Propuesta, en orden.** Los porcentajes son estimados.
- **(a)** Llevar al servidor solo el nicho por defecto. Los otros tres llegan bajo demanda al elegir nicho: un fragmento RSC por parámetro, o un JSON pequeño solo con los textos y las cifras que cambian. Estimado: **entre −35 % y −45 % del total**.
- **(b)** Sacar del árbol React la geometría estática: archivos `.svg` en `/public/assets/film/` (cacheables, `immutable`) o `<symbol>` más `<use href>`. Los 327 rects, con dos clases CSS en lugar de `style` en línea.
- **(c)** Simplificar los trazados: `H`/`V` para las rectas, Ramer–Douglas–Peucker, curvas `C`/`Q` y enteros. Estimado: −50 % a −80 % de los ≈ 155 KB de atributos `d`.
- **(d)** Añadir al presupuesto (M6) un techo para el HTML y el RSC de `/`.

### A2. Cada visitante anónimo dispara llamadas al backend

`AuthProvider` vive en el layout raíz (`src/app/layout.tsx`) y al montar hace `fetch("/api/auth/session")` (`src/core/providers/auth-provider.tsx`, `hydrate`). El BFF (`src/app/api/auth/session/route.ts:35-37`) llama a `GET /auth/me` sin token, recibe 401 y además intenta `refreshSession`.

Resultado: **cada visita a la landing, aunque sea de un bot, pega una o dos veces en el API** sin ningún valor. Es la página con más tráfico.

**Propuesta:**
- en la ruta, devolver `{ isAuthenticated: false }` sin llamar al backend cuando no hay cookies `accessToken`, `refreshToken` ni `supportAccessToken`;
- mejor aún, montar `AuthProvider` solo en los layouts privados, de onboarding y de auth, o hidratar en la capa pública solo si existe una cookie no HttpOnly tipo `hasSession`.

Esfuerzo bajo y alto retorno.

### A3. CSS bloqueante en la home

Hay 5 hojas enlazadas en `index.html`: ≈ 574 KB sin comprimir, 87 KB con gzip. **Una sola pesa 417 KB** (58 KB con gzip). El CSS de la película suma unos 200 KB de fuente: `film.css` 54 KB, `film-tanda4.css` 31, `film-sell.css` 27, `film-pilot.css` 27, `film-call.css` 20 y `film-video.css` 17.

**Propuesta:**
- revisar con `ANALYZE=true npm run build` qué entra en la hoja global; probablemente estilos del panel que se cuelan por el layout raíz;
- en la película, separar el CSS crítico del primer pliegue (hero) del de las escenas inferiores.

### A4. nginx duplica cabeceras y la COOP se contradice

Medido en producción (`curl -D -`) sobre `/` y sobre un chunk estático:

```
cross-origin-opener-policy: same-origin-allow-popups   ← Next (next.config.ts, a propósito)
cross-origin-opener-policy: same-origin                ← nginx
x-content-type-options: nosniff                        ← (también duplicada)
```

`next.config.ts` documenta que **`same-origin` rompe el Embedded Signup de Meta**: el popup pierde `window.opener` y el alta de WhatsApp se queda colgada sin error. Con dos valores, el navegador combina la cabecera en una lista que no es válida para COOP. El resultado depende del navegador, y en el mejor caso se ignora.

**Propuesta (en el VPS):** quitar `Cross-Origin-Opener-Policy` y `X-Content-Type-Options` de la configuración de nginx para `axi-connect.co`; Next ya las pone. Verificar después con `curl -sI https://axi-connect.co/ | grep -i cross-origin`: tiene que salir **una** línea.

### A5. Errores del cliente sin telemetría

Antes del hotfix, un error del navegador no dejaba rastro. El hotfix añade `/api/client-errors`, que escribe en `docker logs`.

**Siguiente paso:** Sentry o GlitchTip (autoalojable) con source maps y alertas. Detalle en §7 del plan del hotfix.

---

## Medio

### M1. framer-motion en el JS común de todas las rutas
`MotionProvider` (`src/core/providers/motion-provider.tsx:3`, `MotionConfig`) y `SplashProvider` (`splash-provider.tsx:11`, `useReducedMotion`) están en el layout raíz. La landing no usa `motion.*`, pero paga el núcleo de framer-motion. `optimizePackageImports` no lo evita.

**Propuesta:**
- un hook propio `usePrefersReducedMotion` con `matchMedia('(prefers-reduced-motion: reduce)')`;
- mover `MotionConfig` a los layouts privados;
- después, bajar el techo `shared` del presupuesto (hoy 103 kB).

### M2. Sin `browserslist`
No hay `.browserslistrc` ni clave en `package.json`. El `target: "ES2017"` de `tsconfig.json` no influye en la salida (`noEmit`; compila SWC). Mientras tanto, las dependencias salen sin transpilar: zod (chunk `22531`, en la home y en `/comenzar`), Radix (`72918`) y framer-motion (`32687`) llevan `?.` y `??`, así que exigen Chrome 80 o iOS 13.4 como mínimo.

**Propuesta:**
- fijar `chrome >= 111, safari >= 16.4, firefox >= 111`, coherente con el `color-mix()` que la landing ya exige, y dejarlo documentado;
- si se quiere soportar dispositivos más viejos, además `transpilePackages`.

### M3. Polling que no se pausa con la pestaña oculta
Sondean cada 5 a 15 s mientras hay trabajo en vuelo, también en segundo plano:
- `modules/prospecting/ui/SearchesView.tsx:111-114`;
- `LeadsInboxView.tsx:197-205`;
- `LeadDetailView.tsx:245-249`;
- `components/LeadPeopleSection.tsx:85-89`;
- `modules/marketing/ui/CampaignDetailView.tsx:136-140`;
- `MetaTemplatesView.tsx:136`.

Buen ejemplo a copiar: `modules/inbox/infrastructure/hooks/use-conversation-events.ts:80-90`.

**Propuesta:** un hook compartido `useVisiblePolling(fn, ms, enabled)` que pause con `visibilitychange` y refresque al volver.

### M4. Doble viaje en cada carga completa del panel
`(private)/layout.tsx` resuelve `/me/navigation` en el servidor. Tras hidratar, `AuthProvider` vuelve a pedir `/api/auth/session`, que a su vez llama a `/auth/me`.

**Propuesta:** resolver el usuario en el layout del servidor y pasarlo como `initialUser` al provider.

### M5. Assets muertos en `/public`
Sin ninguna referencia en `src`:
- `public/brand/holographic_sticker-png.png` (2,0 MB);
- `holographic_sticker.png` (1,8 MB);
- `isotype.png` (423 KB);
- `isotype-expand.png` (360 KB).

Engordan cada imagen Docker y cada pull en el VPS. **Propuesta:** borrarlos.

### M6. El presupuesto de bundle no ve HTML, RSC ni CSS
`scripts/check-bundle-budget.mjs` y `scripts/bundle-budget.json` miden solo el JS de primera carga con gzip: `shared` 103 kB, `/` 200 kB, rutas privadas hasta 482 kB. Por eso A1 y A3 crecieron sin alarma.

**Propuesta:** añadir techos para `.next/server/app/index.html` e `index.rsc` (con gzip) y para el CSS enlazado por ruta.

### M7. Sin brotli
Producción responde `content-encoding: gzip` en HTML, RSC y chunks. Brotli suele ahorrar un 15–20 % adicional sobre texto (cifra estimada).

**Propuesta (VPS):** el módulo `ngx_brotli` o un `brotli_static` sobre los chunks inmutables.

---

## Bajo

- **B1. Código muerto en la landing**, todo en `src/modules/landing/ui/components/`: `CountUpNumber.tsx`, `ParallaxLayer.tsx` y `UnifiedContactBeam.tsx`. `AnimatedBeam.tsx` solo lo usa `UnifiedContactBeam`, que además trae react-icons.
- **B2. Geist Mono se precarga en todas las rutas** (`src/app/layout.tsx`). Si solo la usa el panel: `preload: false` o moverla.
- **B3. `/brand/*` y `/audio/*` pasan por el middleware** y no están en `PUBLIC_PATHS`, así que a un anónimo lo mandaría al login. Hoy ninguna página pública los usa, pero conviene excluirlos del matcher.
- **B4. `crypto.randomUUID()` en el render** de `CallLauncherDialog.tsx:88`: falla en http y en Safari < 15.4. Mejor en un efecto o con alternativa.
- **B5. `sessionStorage` sin `try`** en `platform/infrastructure/auth/token-storage.ts:17` y en `marketing/infrastructure/preset-handoff.ts:28`. Lanza con el storage bloqueado.
- **B6. Pesos de dinero con `currency: null`**: `formatMoney` (`core/lib/format.ts:58`) lanza `RangeError`, porque el valor por defecto solo cubre `undefined`. Se usa en `DunningBanner.tsx:198`, en el render.

## Orden sugerido

1. **Ya mismo, en el VPS (minutos):** A4 (COOP) y M7 (brotli).
2. **Una tanda corta en el cliente, de bajo riesgo:** A2, M5, B4, B5, B6 y M3.
3. **Proyecto con maqueta y medición antes y después:** A1, A3 y M1. Es la home: aplica la regla de rediseño (medir por píxeles y no quitar funciones).
4. **Infraestructura:** Sentry o GlitchTip, estáticos en storage o CDN y swap azul/verde (§7 del plan del hotfix).
