# Plan de implementación — Sistema de diseño Axi Connect

> Plan por fases para llevar el proyecto al estado que definen [`DESIGN.md`](./DESIGN.md) y [`DESIGN-SYSTEM.md`](./DESIGN-SYSTEM.md). Cada fase es un PR independiente, ordenadas por dependencia: primero los tokens (fundación), luego lo que los consume. Marcar cada ítem al completarse.

---

## Estado actual (diagnóstico, julio 2026)

**Lo que ya está bien:**
- Tailwind v4 CSS-first con `@theme inline` y tokens semánticos base en `globals.css`.
- next-themes configurado (`class`, `system`) con `.dark` funcionando a nivel de tokens.
- Primitivos shadcn/Radix consumiendo tokens (`bg-primary`, `ring-ring`…).
- `DetailSheet` con framer-motion + `prefers-reduced-motion`.

**Discrepancias detectadas:**

| # | Problema | Dónde |
|---|---|---|
| D1 | No existe control de tema en la UI (dark solo llega por preferencia del SO) | `PrivateHeader`, `AppSidebar`, `SiteHeader` |
| D2 | Paleta incompleta: violeta y ámbar del isotipo no existen como tokens; sin tokens `success`/`warning`/`info` | `globals.css` |
| D3 | `--color-destructive` apunta al coral de marca (`--axi-brand-2`): "eliminar" y "marca" comparten color | `globals.css:40` |
| D4 | Hex hardcodeados en componentes | `SiteHero.tsx` (`#e60a64` — ni siquiera es el coral de marca), `3dglobe.tsx` (`#9b87f5`, `#0a0613`…), `particles.tsx`, `SiteFooter.tsx`, `sparkles.tsx` |
| D5 | `core/styles/gradients.ts` usa 14 colores Tailwind aleatorios sin relación con la marca | `gradients.ts` |
| D6 | Sin tokens de radio ni de sombra; primitivos con radios pequeños (6–8px) lejos del lenguaje iOS acordado | `button.tsx`, `input.tsx`, `dialog.tsx`… |
| D7 | Headings fuerzan Nexa con `!important` global; Geist Sans cargada sin uso (solo se usa Geist Mono). *(Poppins como cuerpo es decisión de marca confirmada — se queda.)* | `globals.css`, `layout.tsx` |
| D8 | `.glass` rudimentario (sin borde, sin fallback `@supports`, sin variante overlay) y casi sin uso | `globals.css:97` |
| D9 | Utilidades manuales duplicadas que Tailwind v4 ya genera (`.bg-background`, `.text-foreground`, `.border-border`) | `globals.css:85-91` |
| D10 | Assets de marca mínimos: solo `isotype.png`; sin favicon de marca, sin logo SVG, sin og-image; SVG default de Next aún en `public/` | `public/` |
| D11 | Sin presets de motion centralizados (duraciones/curvas ad-hoc) | — |

---

## Fase 1 — Fundación de tokens (`globals.css`) 🔴 prerequisito de todo

**Objetivo:** un solo archivo define la marca completa; re-branding = editar la capa 1.

- [x] Reescribir la capa de primitivos `:root`/`.dark` con la tabla DESIGN-SYSTEM §2.1: añadir `--axi-violet`, `--axi-amber`, `--axi-success`, `--axi-warning`, `--axi-destructive`, `--axi-info` (light y dark). *Se añadió también `--axi-on-color` (texto sobre superficies de color, blanco en light / oscuro en dark) — corrige de paso el contraste de `primary-foreground` en dark, que era blanco fijo sobre coral claro.*
- [x] Corregir D3: `--color-destructive: var(--axi-destructive)` (rojo funcional, no coral).
- [x] Añadir tokens semánticos nuevos en `@theme inline`: `--color-accent-violet`, `--color-accent-amber`, `--color-success(-foreground)`, `--color-warning(-foreground)`, `--color-info(-foreground)`. *Además `--color-border-soft` formaliza la clase manual `.border-border-soft` que ya se usaba.*
- [x] Añadir tokens de radio (`--radius-sm/md/lg/xl` = 8/12/16/20px) y de sombra (`--shadow-float`, `--shadow-overlay`) según DESIGN-SYSTEM §4. **Nota:** al vivir en `@theme`, las clases `rounded-sm/md/lg/xl` existentes ya adoptan los radios nuevos ⇒ el primer ítem de la Fase 5 quedó cubierto aquí; a la Fase 5 le quedan los ajustes por componente y la revisión visual.
- [x] Añadir `.bg-brand-gradient-tri` (coral→ámbar→violeta) junto a las utilidades de marca existentes (+ `.text-brand-gradient-tri`).
- [x] Mejorar `.glass` (borde translúcido + `@supports` fallback) y añadir `.glass-overlay` (DESIGN-SYSTEM §5.1).
- [x] Limpiar D9: eliminar `.bg-background`, `.text-foreground`, `.border-border`, `.outline-ring\/50` manuales (Tailwind v4 las genera) y verificar que nada rompe. *Verificado en el CSS compilado: todas las utilidades se generan y `rounded-md` compila a 12px.*
- [x] Verificación: `npm run build` ✅ (verde) + revisión visual de la landing en light y dark con el toggle de la Fase 2 (tokens, gradiente y glass correctos en ambos temas). Las vistas privadas se revisarán en las Fases 5–6 (requieren sesión contra el backend).

## Fase 2 — Toggle de tema (D1)

**Objetivo:** el usuario controla light/dark/system desde la UI.

- [x] Crear `shared/components/layout/theme-toggle.tsx` (`"use client"`): 3 estados con iconos lucide (`Sun`/`Moon`/`Monitor`), `useTheme()` de next-themes, `aria-label`, montaje seguro (evitar mismatch de hidratación con `mounted`). *Implementado como control segmentado pill con `role="radiogroup"`.*
- [x] Montarlo en `PrivateHeader` (junto a las acciones de usuario), en el footer del `AppSidebar` (oculto con sidebar colapsado) y en `SiteHeader` (landing: desktop + menú móvil).
- [x] Verificar persistencia (localStorage de next-themes) y ausencia de flash al recargar. *Verificado en navegador: click en "Tema oscuro" → `html.dark` + `theme=dark` en localStorage; tras recarga el tema se restaura antes del paint (script bloqueante de next-themes) y el radio queda marcado.*

## Fase 3 — Migración de discrepancias de color (D4, D5)

**Objetivo:** cero hex fuera de `globals.css`.

- [x] `SiteHero.tsx`: reemplazados `#e60a64`/`#ffffff` por `var(--axi-brand)`/`var(--foreground)` (las partículas ahora reciben el token y reaccionan al tema); `rose-300/500` → `via-brand`/`.bg-brand-gradient`; sombras rosa `rgba(236,72,153,…)` → `color-mix` con `--axi-brand`; `bg-white/5` → `bg-background/5`.
- [x] `3dglobe.tsx`: **eliminado** — era un template ajeno sin consumidores ("Lunexa crypto trading", imágenes externas). No había nada que migrar.
- [x] `particles.tsx` (nuevo `colorToRgb()` que resuelve `var(--token)`, hex y rgb; default `var(--foreground)`), `sparkles.tsx` (fallback sin hex) y `SiteFooter.tsx` (blancos/negros del glass del footer → `color-mix` sobre `--foreground`/`--background`). *Extra: `spotlight.tsx` — gradientes `hsla` rosa → `color-mix` con `--axi-brand`.*
- [x] `core/styles/gradients.ts`: **eliminado** — no tenía ningún consumidor (código muerto).
- [x] **Barrido extra (adelanto de deuda):** toda la paleta Tailwind cruda de estados migrada a los tokens funcionales — `notice.tsx`, `alert.tsx`, `badge.tsx` (info), `TreeView.tsx` (prioridades), `ChannelList.tsx`/`ChannelDetailSheet.tsx`/`AgentDetailSheet.tsx` (dots de estado → `success/warning/destructive/muted-foreground`), `Composer.tsx`, `MessageBubble.tsx` (leído → `info`), `SiteInboxShowcase.tsx`.
- [x] Auditoría final: cero hex y cero paleta cruda en `src/` fuera de `globals.css`. **Excepción documentada:** `brand-mark.tsx` (SVG inline del isotipo) conserva sus hex — los colores del logo son fijos por regla de marca (DESIGN.md §2.2), no temáticos. Verificado con `npm run build` ✅ y lint limpio (0 errores).

## Fase 4 — Tipografía (D7)

**Objetivo:** sistematizar el stack confirmado — **Nexa (headings) + Poppins (cuerpo, se queda por decisión de marca) + Geist Mono** — y limpiar deuda menor.

- [x] `globals.css`: quitado el `!important` del bloque `h1..h6`. *Al quitarlo afloró que el H1 del hero cargaba y aplicaba **Bricolage Grotesque** (residuo del template, antes anulada por el `!important`) — se eliminó esa fuente de `SiteHero`; el hero queda en Nexa.*
- [x] `layout.tsx`: Geist Sans ya no se carga (Geist Mono se mantiene). Familias activas: Nexa + Poppins + Geist Mono.
- [x] Títulos de página del panel privado normalizados a la escala H1 (`text-3xl tracking-tight font-semibold`): dashboard, settings (company/roles/users), agentes y workspace.
- [x] `tabular-nums` añadido a `TableCell` (aplica a todas las tablas; solo afecta dígitos).
- [x] Verificación en runtime (navegador): h1/h2 computan Nexa, body computa Poppins, familias cargadas = 3. `tsc --noEmit` y lint limpios.

## Fase 5 — Forma y radios (D6)

**Objetivo:** lenguaje iOS de radios sin tocar componente por componente.

- [x] Mapear los tokens `--radius-*` en `@theme` para que `rounded-md/lg/xl` de los primitivos existentes adopten 12/16/20px automáticamente. *(Hecho en Fase 1.)*
- [x] Ajustes por componente: `dialog.tsx` → `rounded-xl`; `badge.tsx` → pill (`rounded-full`); `popover`/`dropdown-menu`/`command` → `rounded-lg`; `button`/`input` correctos tras el re-mapeo (12px).
- [x] Revisión visual en navegador (landing + workspace/inbox con sesión real, light y dark).
- [x] *Extra:* añadidos los tokens de superficie `--color-card(-foreground)` y `--color-popover(-foreground)` que los primitivos shadcn consumían sin que existieran (las utilidades `bg-card`/`bg-popover` no se generaban).

## Fase 6 — Rollout de glass (D8)

**Objetivo:** material flotante según DESIGN-SYSTEM §5.2.

- [x] `.glass` aplicado a `PrivateHeader` (ahora sticky), `SiteHeader` (al hacer scroll, junto con sus dropdowns) y al contenedor `sidebar-inner` del `AppSidebar`.
- [x] `.glass-overlay` aplicado a `Dialog` (cubre `Modal`), `Sheet`, `DetailSheet` y menú móvil del `SiteHeader`; `Popover` y `DropdownMenu` con `.glass`; `FloatingAlert` y `Tooltip` ya lo tenían.
- [x] Superficies de contenido (DataTable, forms, paneles del inbox) permanecen sólidas — verificado en workspace/inbox con sesión real.
- [x] **Bug crítico encontrado y corregido:** `SiteFooter` redefinía `.glass` globalmente vía `<style jsx global>` (gradiente radial de marca + `display:flex` + `!important`), secuestrando la clase del design system en toda la app → renombrada a `.footer-glass`. **Regla: jamás redefinir clases del design system desde styled-jsx global.**
- [x] Fix adicional en `SiteHeader`: la variante `scrolled` de framer-motion no definía `y/opacity` — al scrollear antes de terminar la animación de entrada, el header quedaba congelado invisible. El backdrop/sombra inline se retiró (ahora lo aporta `.glass` por CSS).
- [ ] Pendiente de observación: jank de scroll por `backdrop-filter` en listas largas del inbox (no observado en la verificación; re-evaluar con más datos).

## Fase 7 — Motion (D11)

**Objetivo:** presets únicos, micro-interacciones consistentes.

- [x] `core/styles/motion.ts` con los presets DESIGN-SYSTEM §6 (`spring.soft/snappy`, `fade.fast/slow`, `press`, `durations`, coreografía del splash). *(Creado durante el desarrollo del splash.)*
- [x] Migradas las transiciones ad-hoc a presets: `DetailSheet` (→ `spring.soft`), `StatusAlert`/notice (→ `spring.snappy`), `FloatingAlert` (→ `spring.soft`), `RowCollapse` (→ `fade.fast`), `SiteHeader` (entrada → `fade.slow`, logo hover → `spring.snappy`, dropdown → `fade.fast`), `BasicPagination` (→ `durations.hover`).
- [x] `motion-safe:active:scale-[0.97]` en la base cva de `button.tsx` (press físico; no aplica con reduced-motion).
- [x] `prefers-reduced-motion` sistémico: nuevo `MotionProvider` (`MotionConfig reducedMotion="user"`) en el root layout — desactiva transform/layout en TODOS los `motion.*` automáticamente; en CSS se añadió el guard para las entradas/salidas de Radix (`.animate-in/.animate-out`), sumado a los guards existentes del splash.
- [x] *Extra:* tonos `info` y `neutral` de `StatusAlert` migrados a tokens (se habían escapado del barrido de la Fase 3: usaban `sky-*`, `white`, `neutral-900`).

## Fase 8 — Assets de marca (D10)

**Objetivo:** inventario DESIGN §2.3 completo.

- [x] Isotipo vectorial: `public/brand/isologo-axi-connect.svg` (fuente de verdad) + `BrandMark` inline sincronizado.
- [x] `favicon.ico` (16/32/48, reemplaza el default de Next), `src/app/icon.svg` y `src/app/apple-icon.png` (180×180, fondo blanco) — generados desde el SVG con Chrome headless + Pillow; conectados por convención de archivos de App Router (verificado: `<link rel="icon">` y `apple-touch-icon` en el head).
- [x] `src/app/opengraph-image.png` (1200×630: isotipo + wordmark Nexa + gradiente tri) y `public/brand/logo-horizontal(.png/-dark.png)`; `metadata` con `metadataBase`, título con template, descripción de marca y `openGraph` (verificado: tags `og:*` completos). *Los logos horizontales son PNG — el wordmark vectorial con texto trazado queda pendiente del archivo fuente del diseñador.*
- [x] SVG default de Next eliminados (`file/globe/window/vercel.svg`).
- [x] Lotties revisadas: el loader migró a `BrandLoader` (isotipo + `brand-pulse` CSS) y `public/animations/` quedó eliminado por completo.

## Fase 9 — QA de cierre

- [ ] Barrido de contraste AA (light y dark) sobre los pares de tokens con un checker; ajustar `color-mix` si algo baja de 4.5:1.
- [ ] Recorrido completo de vistas (landing, login, dashboard, admin, workspace/inbox, settings) en light/dark/system + móvil.
- [ ] Navegación solo con teclado: focus visible en todo el flujo.
- [ ] `npm run lint` + `npm test` + `npm run build` verdes.
- [ ] Actualizar `docs/architecture.md` §11 para referenciar `docs/design/` como fuente de verdad de theming.

---

## Orden y dependencias

```
Fase 1 (tokens) ──┬─→ Fase 2 (toggle)      — independiente tras F1
                  ├─→ Fase 3 (colores)     — necesita los tokens nuevos
                  ├─→ Fase 5 (radios)      — necesita --radius-*
                  └─→ Fase 6 (glass)       — necesita .glass mejorado
Fase 4 (tipografía) — independiente (puede ir en paralelo a F3–F6)
Fase 7 (motion)     — tras F5/F6 para no re-tocar componentes
Fase 8 (assets)     — independiente; bloqueada solo por el SVG fuente
Fase 9 (QA)         — al final, siempre
```

Estimación de tamaño por PR: F1 y F3 medianas; F2, F5, F7 pequeñas; F4, F6 medianas (requieren revisión visual amplia); F8 depende del material de diseño; F9 transversal.
