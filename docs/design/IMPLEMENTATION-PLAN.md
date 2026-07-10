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
| D7 | `--font-sans` = Poppins y headings fuerzan Nexa con `!important` global; Geist cargada pero sin uso; 4 familias cargadas a la vez | `globals.css`, `layout.tsx` |
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

- [ ] `SiteHero.tsx`: reemplazar `#e60a64` y `#ffffff` por tokens/utilidades de marca (`var(--axi-brand)`, gradiente tri).
- [ ] `3dglobe.tsx`: mapear `#9b87f5` → `--axi-violet`; fondos `#0a0613`/`#150d27` → derivados de `--background` dark o tokens dedicados de la sección hero.
- [ ] `particles.tsx`, `sparkles.tsx`, `SiteFooter.tsx`: consumir `var(--color-foreground)`/`var(--color-background)` en lugar de blanco/negro fijos (deben reaccionar al tema).
- [ ] Reescribir `core/styles/gradients.ts`: derivar de la paleta de marca (brand/violet/amber + mixes) y tipar como `as const`; actualizar consumidores.
- [ ] Auditoría final: `grep -rnE "#[0-9a-fA-F]{3,6}\b" src --include="*.tsx" --include="*.ts"` sin resultados fuera de `globals.css`.

## Fase 4 — Tipografía (D7)

**Objetivo:** Geist como sans de UI, Nexa solo display, Poppins retirada.

- [ ] `globals.css`: `--font-sans: var(--font-geist-sans)`; crear utilidad `.font-display` (Nexa) y eliminar el bloque `h1..h6 { font-family: nexa !important }`.
- [ ] Aplicar `.font-display` explícitamente donde corresponde (hero landing, momentos de marca).
- [ ] Retirar Poppins de `layout.tsx` (dejar de cargarla) una vez que ninguna vista dependa de ella; menos fuentes = mejor LCP.
- [ ] Revisar títulos del panel privado con la escala DESIGN-SYSTEM §3.2 (H1 `text-3xl tracking-tight font-semibold`, etc.).
- [ ] Añadir `tabular-nums` en celdas numéricas de `DataTable` y métricas.

## Fase 5 — Forma y radios (D6)

**Objetivo:** lenguaje iOS de radios sin tocar componente por componente.

- [ ] Mapear los tokens `--radius-*` en `@theme` para que `rounded-md/lg/xl` de los primitivos existentes adopten 12/16/20px automáticamente.
- [ ] Ajustar manualmente los primitivos que no siguen el patrón: `dialog.tsx` → `rounded-xl` + `shadow-overlay`; badges → pill; revisar `button.tsx`/`input.tsx` tras el re-mapeo.
- [ ] Revisión visual de tablas, formularios, sheets y modales en ambas densidades.

## Fase 6 — Rollout de glass (D8)

**Objetivo:** material flotante según DESIGN-SYSTEM §5.2.

- [ ] Aplicar `.glass` a `PrivateHeader` y `SiteHeader` (sticky) y al `AppSidebar`.
- [ ] Aplicar `.glass-overlay` a `Modal`/`Dialog`, `DetailSheet`, `Popover`, `DropdownMenu`, `Command` y `FloatingAlert`.
- [ ] Confirmar que superficies de contenido (DataTable, forms, inbox) permanecen sólidas.
- [ ] Medir: sin jank de scroll por `backdrop-filter` (probar en el inbox con lista larga); si lo hay, reducir blur o limitar glass al header.

## Fase 7 — Motion (D11)

**Objetivo:** presets únicos, micro-interacciones consistentes.

- [ ] Crear `core/styles/motion.ts` con los presets DESIGN-SYSTEM §6 (`spring.soft`, `spring.snappy`, `fade.fast`, `press`).
- [ ] Migrar `DetailSheet`/modales a los presets (hoy tienen valores propios).
- [ ] Añadir `active:scale-[0.97]` + transición a `button.tsx` (variante cva base).
- [ ] Verificar `prefers-reduced-motion` en todos los puntos animados.

## Fase 8 — Assets de marca (D10)

**Objetivo:** inventario DESIGN §2.3 completo.

- [ ] Obtener/vectorizar `isotype.svg` (fuente de verdad) — **requiere el archivo fuente del diseñador**; si no existe, vectorizar el PNG.
- [ ] Generar `favicon.ico`, `icon.svg`, `apple-touch-icon.png` desde el isotipo y declararlos vía metadata de Next (`app/icon.svg` o `metadata.icons`).
- [ ] Crear `logo-horizontal.svg` (+ variante dark) y `og-image.png` (1200×630); añadir `openGraph` a `metadata` en `app/layout.tsx`.
- [ ] Eliminar los SVG default de Next: `file.svg`, `globe.svg`, `window.svg`, `vercel.svg`.
- [ ] Revisar animaciones Lottie de `public/animations/` sobre ambos temas; descartar las que no se usen (`loader.funny`, `loader.bat.ball`…).

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
