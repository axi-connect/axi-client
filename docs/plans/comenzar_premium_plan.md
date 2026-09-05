# Plan — `/comenzar` premium («Flow»): una pregunta por pantalla sobre el campo de marca

> Estado: **F1 hecha (2026-09-05)**, en gate. Rama `feat/comenzar-premium` (worktree `.claude/worktrees/feat-comenzar-premium`), desde `main` = `origin/main`.
> Mockups aprobados: v3 «Flow» https://claude.ai/code/artifact/5fafaf84-b9ee-407a-9ef0-47af48185b27 (la dirección) y v2 «bento» (referencia guardada en `docs/design/mockups/comenzar-premium-v2.html`, descartada como dirección).

## 1. Por qué

`/comenzar` es la superficie de conversión y se veía como un formulario de panel: card blanca, dos grids iguales de `ProviderCard`, rail estático y cero movimiento entre pasos. El dueño pidió un onboarding **premium, minimalista, estilo Apple/iOS**, y tras ver dos direcciones eligió la del patrón «una pregunta por pantalla» con la ruta animada al pie (referencia: onboarding de Jitter), adaptada a la marca.

## 2. Decisiones cerradas con el dueño (no re-litigar)

1. **Alcance: solo `/comenzar`.** La bienvenida y `/onboarding` quedan para otra tanda.
2. **Ambos temas, dark como escaparate.** En claro el campo es un cielo coral con texto blanco (gradiente de marca en un momento hero, DESIGN.md §3.2); en oscuro, noche de marca (casi negro con aurora coral y violeta).
3. **Coral manda; violeta = IA/completado.** Sin tricolor en el fondo ni ámbar en la vista.
4. **Dirección v3 «Flow»**: cinco pantallas de una pregunta, título enorme centrado, controles de cristal blanco, sin card ni rail; ruta curva al pie con una parada por paso, la activa grande y centrada, que se desliza con spring al avanzar; puntos de progreso; las paradas recorridas son botones para volver.
5. **Los gráficos de capacidad por plan y módulo** (onda de voz, pines, embudo, calendario, chat, equipos, barras de crecimiento, pista de 7 días) **se conservan tal cual** en las fichas de la oferta; el dueño los aprobó explícitamente. La única corrección fue darles columna propia para que no se solaparan con el texto.
6. El componente bento de 21st.dev que se pegó en el prompt fue solo inspiración: no se copia (hex, `bg-black`, CDN externo, blur bajo texto).

## 3. Arquitectura de la solución

### 3.1 El material: `.signup-field` (globals.css)

Un bloque, aplicado una vez en `app/comenzar/layout.tsx`. Técnica de `.theme-dark-island`: **re-deriva los tokens semánticos** (`--color-foreground`, `--color-muted-foreground`, `--color-border`, `--color-input`, `--color-ring`, `--color-primary(-foreground)`, `--color-secondary`, `--color-accent`, `--color-destructive`) dentro de su alcance, así `Input`, `FormLabel`, `FormMessage`, `Button`, `Checkbox`… adoptan el material **sin variantes nuevas ni hex en componentes**. `--color-background` no se toca: el cristal se mezcla contra el fondo real y los overlays siguen siendo los de la app.

- Único hex del bloque: `--sf-fg: #ffffff` (texto sobre coral). En `.dark` pasa a `var(--foreground)`.
- `--color-destructive` = blanco en claro (el rojo semántico no se lee sobre coral; el error se distingue por peso, `role="alert"` y el borde del control) y vuelve al rojo en oscuro.
- Marca: el isotipo conserva sus tres cintas (el dueño rechazó el mono blanco); solo el wordmark pasa al color del texto por CSS (`.signup-field .text-brand-wordmark`) → `BrandLockup` no gana variantes.
- Utilidades hermanas: `.signup-grain` (retícula con máscara), `.sf-glass` / `.sf-glass-hover` / `.sf-glass-on` / `.sf-line` (cristal blanco sin `backdrop-filter`, DESIGN-SYSTEM §5.2), `.signup-route-path`.

### 3.2 Dominio: cinco pasos, tres objetos del wire

`SIGNUP_STEPS` = `offer · company · location · owner · account`. `CompanyDraft` y `AccountDraft` siguen enteros: cada pantalla valida su parte con un `pick` del schema (`companyIdentitySchema`, `companyLocationSchema`, `ownerSchema`, `passwordSchema`) y el orquestador funde los valores en el mismo objeto. `toSignupPayload` no cambia. Bloqueos por pantalla (`hasCompanyIdentity`, `hasCompanyLocation`, `hasOwnerIdentity`) y `reachableSignupStep` para volver, al recargar, al paso más lejano que las respuestas guardadas permitan. La contraseña sigue sin persistirse.

### 3.3 UI (`modules/onboarding/ui/signup/`)

| Pieza | Qué es |
|---|---|
| `SignupFunnelView` | Orquestador: estado, borrador, analítica, errores por `code` (NIT → «Empresa», correo → «Tú», resto → aviso en «Cuenta»), `AnimatePresence mode="wait"` con `spring.soft` / `fade.fast` entre pantallas, puntos de progreso y la ruta. |
| `SignupScreen` + `SignupProgressDots` | La pregunta (`h1` por pantalla), la línea de contexto y el hueco del control; los puntos. |
| `SignupRoute` | La ruta: SVG con cúbicas de tangentes horizontales, paradas equidistantes alternando alto/bajo, dos paradas virtuales en los extremos, la activa centrada por `translateX` animado (`spring.soft`; `useReducedMotion` la deja fija). Alto 280 px y amplitud corta (9 %) para que la parada activa con su anillo quepa entera arriba y abajo. `nav` con botones «Volver a …» en las paradas recorridas. |
| `SignupActions` | Pie único: CTA a todo el ancho (blanco con texto coral por la re-derivación), microcopy y «Atrás» (`DraftBackButton`). |
| `CompanyIdentityStep`, `CompanyLocationStep`, `OwnerStep`, `PasswordStep` | Las cuatro pantallas de formulario sobre `DynamicForm` (`columns={{ base: 1 }}`), etiquetas `SrLabel` (la pregunta es la etiqueta visible; el placeholder nombra el control), inputs con `SIGNUP_INPUT_CLASS`. `PasswordStep` lleva el resumen «hoy pagas $0» antes del CTA. |
| `OfferStep` (F2) | Fichas de cristal con los gráficos aprobados, segmentado Paquete/Módulos, nota violeta con «Crecimiento» (corregido: decía «Small Business Suite», paquete retirado). |
| `signup-field.styles.ts` | `SIGNUP_INPUT_CLASS`, `SIGNUP_SELECT_CLASS`, `SrLabel`, `SIGNUP_STEP_ICONS` (Blocks, Building2, MapPin, UserRound, KeyRound). |

Eliminados: `SignupSummaryRail`, `CompanyStep`, `AccountStep`, y el uso de `StepIndicator` en el funnel.

## 4. Fases

| Fase | Alcance | Estado |
|---|---|---|
| **F0** | Mockups v1→v3, aprobación de la dirección | ✅ 2026-09-05 |
| **F1** | Campo (`.signup-field`), cabecera con marca mono, puntos, ruta animada, transición entre pantallas, dominio de 5 pasos, pantallas Empresa/Ubicación/Tú/Cuenta en cristal, resumen final, skeleton, fix del copy; tests actualizados | ✅ en gate |
| **F2** | Pantalla Oferta: fichas de cristal (`role=radio`/`checkbox`) con los gráficos SVG como componentes (`ui/signup/graphics/*.tsx`), Crecimiento destacado a todo el ancho, segmentado de cristal (`SegmentedControl treatment` nueva o clases locales), nota de ≥2 módulos, CTA con `offerBlocker`; retirar `ProviderCard` del funnel | pendiente |
| **F3** | Móvil y pulido: alturas de la ruta en pantallas bajas, foco automático en el primer control tras la transición (solo con puntero), Enter avanza, `sesión abierta`, estados de error visibles en claro y oscuro; captura de pantalla de las 5 pantallas en ambos temas | pendiente |
| **F4** | Docs y verjas: `docs/modules/onboarding.md` (B.2/B.3 decisiones 12–14, B.4 piezas nuevas), DESIGN-SYSTEM §5 (`.sf-glass`) y §8 (re-derivación de tokens por alcance), `public-site.md` si cambia el copy; reindexar grafo; `next build` y suite completa por el dueño | pendiente |

Cada fase se cierra, se reporta y espera aprobación explícita antes de la siguiente.

## 5. Verificación

- **Verja barata (cada fase):** `npx tsc --noEmit`, `npx eslint <ficheros tocados>`, `npx jest src/modules/onboarding src/app/comenzar` desde el checkout que se esté usando (sin `--testPathIgnorePatterns`).
- **Del dueño:** `next build`, suite completa, y en `next dev` recorrer `/comenzar`, `/comenzar?plan=crecimiento`, `/comenzar?modulo=calls,crm` y `/comenzar?plan=enterprise` en claro y oscuro, con y sin `prefers-reduced-motion`; probar la vuelta atrás desde la ruta y el error de NIT repetido contra el backend local (S1–S3 ya en main).
- **Reglas que aplican:** sin hex fuera de `globals.css`; glass solo flotante; `prefers-reduced-motion` en todo; AA en ambos temas; `text-brand-gradient`/`text-brand-wordmark` jamás por `cn()`; el dueño compila y corre las suites.
