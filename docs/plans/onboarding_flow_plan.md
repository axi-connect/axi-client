# Plan — `/onboarding` premium («Flow», segunda tanda): bienvenida, cinco pasos y cierre

> Estado: **F0 ✅ (mockup aprobado 2026-09-05) · F1 en gate**. Rama `feat/onboarding-flow` (worktree `.claude/worktrees/feat-onboarding-flow`), desde `main` = registro «Flow» + catálogo público de precios (Tanda A3) ya fusionados.
> Mockup aprobado: https://claude.ai/code/artifact/3c9c5a8a-6c9e-4284-85a8-f174d4dd2459 (copia fiel en `docs/design/mockups/onboarding-flow-v1.html`, builder al lado). Antecedente: `docs/plans/comenzar_premium_plan.md`.

## 1. Por qué

`/comenzar` ya habla el lenguaje «Flow»: una pregunta por pantalla, título enorme, controles de cristal sobre el campo coral, ruta animada al pie. El resto del viaje del usuario nuevo seguía con el lenguaje anterior: bienvenida con card de cristal y confeti, shell de `/onboarding` con barra tricolor y `StepIndicator`, cada paso en `StepFrame` con rail de tips, `ProviderCard` para nichos y plantillas, tabla de revisión, `DoneStep` sin celebración; y alrededor el banner del panel, `/verificar-correo`, el skeleton y el error de carga. Cero movimiento entre pasos. El corte entre el registro y la configuración se notaba.

## 2. Decisiones cerradas con el dueño (2026-09-05, no re-litigar)

1. **Alcance:** bienvenida, Negocio, Horario, Catálogo, Agentes, WhatsApp y «Listo»; además `OnboardingResumeBanner` (panel), `VerifyEmailView` (`/verificar-correo`), el skeleton y la pantalla de error de carga.
2. **Material híbrido.** La bienvenida continúa el campo coral (`.signup-field`). Al pulsar «Configurar mi empresa» el campo **se hunde** (`translateY(100%)`, 600 ms, solo transform) y descubre el suelo del panel ya pintado debajo (`.flow-ground`: mismas `--sf-*` desde los tokens de la app, sin re-derivar `--color-*`; el CTA sigue coral). Nada de cristal bajo tablas ni formularios densos (DESIGN-SYSTEM §5.2).
3. **Progreso = la misma ruta animada al pie** (`FlowRoute`), 5 paradas + «Listo»; cerradas (hechas u omitidas) = botones «Volver a…»; omitida = borde discontinuo; en pantallas largas va al final del contenido, no fija.
4. **La bienvenida no lleva ruta ni barra** (B.7: «aún no se empezó»); la ruta **sube desde abajo** en el primer paso.
5. **Piezas compartidas intactas:** `SchedulesEditor` (companies) y `ConnectChannelFlow` (channels, B.3 #7) solo cambian de marco (hoja sólida). Se rediseñan las propias: fichas de nicho con 9 gráficos, dropzone, `CatalogScan`, revisión en hoja sólida, plantillas como fichas, personalización **en pantalla** (fuera del `DetailSheet`) con teléfono de vista previa viva.
6. **Momentos interactivos:** vista previa viva del agente; «la IA lee tu catálogo» (haz violeta + filas que aparecen) en vez de barra indeterminada; 9 fichas de nicho con gráfico monocromo; en «Listo» la ruta enciende las paradas hechas en violeta y el resumen entra escalonado.
7. **«Listo» celebra con un segundo confeti corto (~1,5 s)**: DESIGN-SYSTEM §6 pasa a dos celebraciones (bienvenida y cierre), mismas condiciones (colores de marca desde tokens, tras `splash.phase === "idle"`, una vez, nada con reduced-motion).
8. **Sin rail de tips:** una línea bajo el título y el beneficio (o la consecuencia de saltar) como microcopy bajo el CTA. Desaparece `StepAside`.
9. **El teléfono de vista previa tiene alto fijo** (única corrección del dueño al mockup): no crece con los mensajes.
10. **Supuesto mostrado en el mockup:** el ámbar semántico solo dentro de la tabla de revisión (estado de dato); fuera, nada de ámbar.
11. Siguen valiendo: sin hex fuera de `globals.css`; coral manda, violeta = IA/completado; «seleccionado = elevado, nunca teñido»; presets solo de `core/styles/motion.ts`; solo `transform`/`opacity`; reduced-motion en todo; el slice no importa de `modules/landing/ui`; el isotipo conserva sus cintas; el dueño compila y corre las suites.

## 3. Contrato con precios (Tanda A3 fusionada; Tanda B pendiente)

El alta lee precios del catálogo público por props (`catalog: PublicCatalog | null`, `loadPublicCatalog()` en `app/comenzar/page.tsx`); sin catálogo, «Precio a confirmar». `FlowTile`/`OfferStep` conservan ese contrato. Para la Tanda B: `toSignupPayload` emitirá `offer.volume_tier`, `offer.interval` y `offer.promotion_code` cuando B1 amplíe el DTO; la bienvenida deja hueco para la línea de cotización (`entitlements.quote`). Onboarding **no** construye pantallas de pago.

## 4. Hallazgos del código actual que la tanda corrige

- `(onboarding)/onboarding/layout.tsx` no monta `[data-app-scroll]`: en viewport bajo la bienvenida y los pasos no desplazan.
- `WelcomeView.tsx` usa `bg-violet/15 text-violet`, utilidades que no existen (el token es `accent-violet`).
- `.sf-glass`, `.sf-line` y el trazo de la ruta fuera de `.signup-field` quedaban inválidos (variables sin definir) → nace `.flow-ground`.

## 5. Arquitectura

### 5.1 Primitivas Flow → `src/modules/onboarding/ui/flow/` (F1)

| Pieza | Desde | Qué cambia |
|---|---|---|
| `FlowRoute` | `signup/SignupRoute` | `FlowStop.status?: pending\|done\|skipped`; `ariaLabel`; cerrada = `status !== "pending"` o, sin `status`, `index < current` (el registro no cambia); omitida = `.flow-stop--skipped` + «Volver a X (para después)»; hecha = check pequeño (`.flow-stop-badge`); `celebrate` enciende las hechas una cada `flowStage.lightEvery` (`useStaggeredCount`), con reduced-motion todas a la vez. Geometría intacta. |
| `FlowScreen` + `FlowProgressDots` | `signup/SignupScreen` | `size: narrow\|wide\|full` (760/960/1120 px); `focusHeading` (el `h1` recibe el foco al montar: pantallas sin primer input). |
| `FlowActions` + `FlowBackButton` | `signup/SignupActions` | + `secondary` (la salida «saltar/mantener», ghost bajo el CTA) + `error` (`role="alert"`). |
| `FlowTile` | `signup/OfferTile` | props agnósticas: `title`, `meta`, `metaNote` (antes `name`, `price`, `priceNote`). |
| `FlowSkeleton` | `SignupSkeleton` | `{ steps, label }`; `SignupSkeleton` queda como envoltorio (lo usan `comenzar/{page,loading}.tsx`). |
| `flow.styles.ts`, `flow-motion.ts`, `use-staggered-count.ts` | `signup-field.styles.ts`, constantes de `SignupFunnelView` | `FLOW_INPUT_CLASS`, `FLOW_SELECT_CLASS`, `SrLabel`; `FLOW_INITIAL/ENTER/EXIT`, `hasFinePointer`. `signup-field.styles.ts` re-exporta con los nombres del registro y conserva `SIGNUP_STEP_ICONS`. |

**CSS (`globals.css`):** `.signup-field` gana `--sf-line-on` (= `--sf-fg`) y `--flow-done-*` (= cristal encendido: el violeta no se lee sobre coral); `.sf-glass-on` usa `--sf-line-on` (mismo valor sobre el campo → `/comenzar` igual al píxel); `.signup-route-path` → `.flow-route-path` (26 % sobre el suelo); nuevo alcance `.flow-ground`; `.flow-stop--skipped`, `.flow-stop--lit` (pulso por `scale`, propiedad individual, para no pisar el `translate` inline), `.flow-stop-badge`. **Motion:** `flowStage { drain, rise, lightEvery, staggerEvery }` en `core/styles/motion.ts`.

### 5.2 El drenado (`FlowStage`, F2)

El suelo es el layout de `(onboarding)` (`flow-ground bg-brand-ambient` + `data-app-scroll` + cabecera con `BrandLockup` y «Salir al panel»). El campo es una **capa absoluta `signup-field` que contiene la bienvenida** (la re-derivación de tokens es por descendencia) y sale con `y: "100%"` (`flowStage.drain`) vía `AnimatePresence`; debajo ya está el paso 1 con `FLOW_ENTER`, y la ruta sube con `flowStage.rise` solo cuando se viene de la bienvenida. El skeleton usa `?welcome=1` como pista para pintarse sobre el campo. El confeti sigue gateado por `splash.phase === "idle"`.

### 5.3 Pantallas sobre el suelo (F2–F4)

Marco común: `AnimatePresence mode="wait"` → `section aria-label="Paso n de 5: …"` → `FlowScreen` → control único → `FlowActions`. Mueren `OnboardingShell`, `StepFrame`, `StepAside` y el uso de `StepIndicator`; el aviso de correo sin verificar pasa a pastilla `sf-glass` `role="status"`.

- **Negocio:** `FlowTile role="radio"` ×9 con `graphics/NicheGraphics.tsx` (`wide`).
- **Horario:** `SchedulesEditor` intacto en marco sólido; `FlowActions` con `secondary` «Mantener este horario y continuar».
- **Catálogo:** dropzone de cristal → `CatalogScan` (sustituye a `ImportJobProgress`, mismas props: haz determinado con `importProgressRatio`, barrido CSS solo si es indeterminado, hasta 6 filas con `items_total` + «y N más», `role="progressbar"` y `role="status"`) → `ExtractedProductsReview` con su `Table` en superficie sólida (`full`) → resumen.
- **Agentes:** `phase: choose | customize | created`; `TemplateCustomizeForm` (cuerpo puro de la hoja) | `AgentPreview({ name, tone, characterName, companyName, nicheCode })` con `agent-preview-copy.ts`; burbujas del agente en `accent-violet/12`; `.chat` de alto fijo. Se borran `TemplateCustomizeSheet` y `TemplateCard`.
- **WhatsApp:** `EmailVerificationGate` + `ConnectChannelFlow embedded` intactos en marco sólido.
- **Listo:** `ol` de `motion.li` escalonados («Listo» / «Para después»), bloque de cuotas, `FlowRoute celebrate`, `brandCelebrationShort` en `confetti.tsx`.

### 5.4 Banner, verificación, skeleton, error (F5)

`FlowRouteMini` (5 discos de 28 px unidos por línea; estático) reemplaza badges y glifo en `OnboardingResumeBanner` (raíz `flow-ground`). `VerifyEmailView` con `flow-ground` + `FlowScreen` y el disco-parada como icono de estado; textos y enlaces literales. `OnboardingSkeleton` = `FlowSkeleton`. Error de carga = `FlowScreen` + `FlowActions`.

## 6. Fases

| Fase | Alcance | Estado |
|---|---|---|
| **F0** | Mockup navegable (13 pantallas, temas, móvil, reduced-motion) | ✅ aprobado 2026-09-05 |
| **F1** | Primitivas en `ui/flow/` + `.flow-ground` + `flowStage`; `/comenzar` igual al píxel (verja: `SignupFunnelView.test.tsx` verde sin ediciones); `FlowRoute.test.tsx`; este plan y el mockup en el repo | en gate |
| **F2** | Layout con scroller + suelo + cabecera; `FlowStage` (drenado); bienvenida sobre el campo (conserva sus contratos de test: 5 `listitem`, `<b>` de la empresa, fecha, `BrandLockup`); orquestador con `FlowRoute` (`routeStops(progress)` en `ui/onboarding/onboarding-route.ts`, iconos Store · Clock · Package · Bot · MessageCircle + Sparkles) y `AnimatePresence`; seis pasos re-enmarcados con interiores intactos; skeleton y error | |
| **F3** | Negocio (9 gráficos + `FlowTile`); Catálogo (dropzone, `CatalogScan` + test, revisión en sólido, copy por fase) | |
| **F4** | Agentes (`TemplateCustomizeForm`, `AgentPreview` + test, gráficos de rol, subpantallas; mismos payloads de creación); WhatsApp en marco sólido | |
| **F5** | Cierre (`celebrate`, escalonado, `brandCelebrationShort`), `FlowRouteMini` + banner, verificación; docs: `onboarding.md` (B.2, B.3 #15–17, B.7, B.11), DESIGN-SYSTEM §5.3/§6/§8, `architecture.md` §6; reindexar el grafo tras fusionar y recargar el ADR | |

Cada fase se cierra, se reporta y espera aprobación explícita antes de la siguiente.

## 7. Verificación

- **Verja barata (cada fase):** `npx tsc --noEmit`, `npx eslint <ficheros tocados>`, `npx jest src/modules/onboarding src/app` desde el worktree (con su `node_modules` propio vía `npm ci`).
- **Del dueño:** `next build`, suite completa, y en `next dev` recorrer `/comenzar` → bienvenida → 5 pasos → panel en claro y oscuro, con y sin reduced-motion, móvil 390; el banner del panel con pasos pendientes; `/verificar-correo?token=` válido y caducado; `/comenzar` con y sin catálogo (API caído ⇒ «Precio a confirmar»).
