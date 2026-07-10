# DESIGN-SYSTEM — Sistema de diseño de Axi Connect

> **Documento técnico del sistema de diseño.** Traduce la identidad de marca ([`DESIGN.md`](./DESIGN.md)) a tokens, escalas, recetas y reglas de implementación concretas para `axi-client`. Se consulta SIEMPRE antes de construir una vista o componente nuevo.
>
> Stack de theming: **Tailwind CSS v4** (CSS-first, `@theme inline` en `src/app/globals.css`, sin `tailwind.config`), **next-themes** (estrategia `class`, `defaultTheme="system"`), primitivos **shadcn/ui (new-york) + Radix**, variantes con **cva**, animación con **framer-motion**.

---

## 1. Arquitectura de tokens (fuente única de verdad)

Todos los valores de diseño viven en `src/app/globals.css`, en **tres capas**. Cambiar de marca o de paleta = editar solo la capa 1.

```
Capa 1 — PRIMITIVOS DE MARCA (:root / .dark)     ← el ÚNICO lugar con hex
  --axi-brand, --axi-violet, --axi-amber, --axi-success, --axi-warning,
  --axi-destructive, --axi-info, --background, --foreground, --axi-muted

Capa 2 — TOKENS SEMÁNTICOS (@theme inline)        ← derivan de la capa 1 (color-mix)
  --color-primary, --color-accent, --color-border, --color-ring,
  --color-destructive, --radius-*, --shadow-*, --font-*

Capa 3 — CONSUMO                                   ← clases utilitarias en componentes
  bg-primary, text-brand, rounded-lg, shadow-overlay, .glass
```

**Reglas:**
- Un componente **jamás** escribe un hex, un `rgb()` ni un color Tailwind de paleta cruda (`bg-red-500`, `from-pink-400`). Consume capa 3. **Única excepción:** los SVG del logo (`brand-mark.tsx`, assets de `public/brand/`) conservan sus colores literales — las cintas del isotipo no se recolorean por tema (DESIGN.md §2.2).
- Un token semántico nuevo se deriva de un primitivo con `color-mix()`; no se inventan valores.
- No duplicar utilidades que Tailwind v4 ya genera desde `@theme` (las clases manuales `.bg-background`, `.text-foreground`, `.border-border` de la versión actual de `globals.css` son deuda: Tailwind v4 ya las emite desde los tokens `--color-*`).

---

## 2. Color

### 2.1 Primitivos de marca (capa 1)

| Token | Light | Dark | Origen |
|---|---|---|---|
| `--axi-brand` | `#E65759` | `#FB7185` | Cinta coral del isotipo |
| `--axi-brand-2` | `#E02F2F` | `#DF4F4F` | Coral profundo (extremo del gradiente) |
| `--axi-violet` | `#7C3AED` | `#A78BFA` | Cinta violeta del isotipo |
| `--axi-amber` | `#F0A431` | `#FBBF24` | Cinta ámbar del isotipo |
| `--axi-success` | `#16A34A` | `#4ADE80` | Funcional |
| `--axi-warning` | `#D97706` | `#FBBF24` | Funcional (familia del ámbar) |
| `--axi-destructive` | `#DC2626` | `#F87171` | Funcional — **distinto del coral** (hoy `--color-destructive` apunta a `--axi-brand-2`: deuda a corregir) |
| `--axi-info` | `#2563EB` | `#60A5FA` | Funcional |
| `--background` | `#FFFFFF` | `#0A0A0A` | Neutro base |
| `--foreground` | `#171717` | `#EDEDED` | Neutro base |
| `--axi-muted` | `#F4F4F5` | `#18181B` | Superficie atenuada |

### 2.2 Semánticos (capa 2) — mapa de uso

| Token / clase | Derivación | Úsalo para |
|---|---|---|
| `--color-primary` → `bg-primary` | `--axi-brand` | Botón primario, estados activos, links |
| `--color-ring` → `ring-ring` | `--axi-brand` | Focus visible (siempre) |
| `--color-brand` / `--color-brand-2` | brand / brand-2 | Utilidades `.text-brand`, `.bg-brand-gradient` |
| `--color-accent-violet` → `bg-accent-violet` | `--axi-violet` | Badges de IA, dataviz, acentos de vista |
| `--color-accent-amber` → `bg-accent-amber` | `--axi-amber` | Highlights, dataviz, acentos de vista |
| `--color-secondary` | `color-mix(foreground 6%, background)` | Botón secundario, chips neutros |
| `--color-accent` | `color-mix(brand 14%, background)` | Hover/selección suave (menús, filas) |
| `--color-muted` / `--color-muted-foreground` | muted / `foreground 70%` | Fondos atenuados / texto secundario |
| `--color-border` | `color-mix(foreground 12%, background)` | Bordes por defecto |
| `--color-input` | `color-mix(foreground 14%, background)` | Bordes de campos |
| `--color-destructive` | `--axi-destructive` | Eliminar, errores. Nunca el coral |
| `--color-success` / `--color-warning` / `--color-info` | funcionales | Estados de canal, alerts, badges |

### 2.3 Gradientes de marca

Definidos una sola vez como utilidades en `globals.css` (nunca inline en componentes):

```css
.bg-brand-gradient      /* coral → coral profundo (existente, para CTAs) */
.bg-brand-gradient-tri  /* coral → ámbar → violeta (hero/momentos de marca) */
.text-brand-gradient    /* texto con gradiente de marca */
```

`core/styles/gradients.ts` (colores Tailwind aleatorios) queda **deprecado**: los avatares/decoraciones derivan de estos gradientes de marca o de los tres acentos.

### 2.4 Paleta de visualización de datos

Orden fijo para series de gráficos: `brand` → `violet` → `amber` → `info` → `success` → tonos `color-mix` al 60% de los anteriores. Nunca colores fuera de la paleta.

---

## 3. Tipografía

### 3.1 Familias (variables montadas en `app/layout.tsx`)

| Variable CSS | Familia | Rol |
|---|---|---|
| `--font-display` | Nexa (local, 200/700) | Display de marca, solo ≥ 30px (landing hero, onboarding) |
| `--font-sans` | Geist Sans | **Default de toda la UI**: headings y cuerpo del panel privado |
| `--font-mono` | Geist Mono | Código, IDs, datos técnicos |

*Estado actual: `--font-sans` apunta a Poppins y los headings fuerzan Nexa con `!important` global — ambas cosas son deuda (ver plan §fase 4). Objetivo: Geist como sans por defecto, Nexa opt-in vía `.font-display`, sin `!important`.*

### 3.2 Escala tipográfica

| Rol | Clase | Tamaño/line-height | Peso | Uso |
|---|---|---|---|---|
| Display | `text-5xl tracking-tight font-display` | 48/1.05 | Nexa 700 | Hero landing |
| H1 | `text-3xl tracking-tight` | 30/1.2 | semibold | Título de página |
| H2 | `text-xl tracking-tight` | 20/1.3 | semibold | Sección |
| H3 | `text-base` | 16/1.4 | semibold | Sub-sección, título de card |
| Body | `text-sm` | 14/1.5 | normal | **Default del panel privado** |
| Body-lg | `text-base` | 16/1.6 | normal | Landing, textos largos |
| Caption | `text-xs text-muted-foreground` | 12/1.4 | normal | Metadatos, timestamps |
| Code | `font-mono text-xs` | 12/1.5 | normal | IDs, tokens |

- Números en tablas/métricas: añadir `tabular-nums`.
- Jerarquía por peso y tamaño; el color queda para `muted-foreground` en secundarios.

---

## 4. Forma, espaciado y elevación

### 4.1 Radios (tokens en `@theme`)

| Token | Valor | Uso |
|---|---|---|
| `--radius-sm` | `8px` | Elementos pequeños internos (checkbox, thumbnails) |
| `--radius-md` | `12px` | **Controles: botones, inputs, selects** |
| `--radius-lg` | `16px` | Cards, popovers, dropdowns |
| `--radius-xl` | `20px` | Modales, sheets, superficies flotantes grandes |
| `--radius-full` | `9999px` | Badges, pills, avatares |

*Estado actual: los primitivos shadcn usan `rounded-md` (6px) y `rounded-lg` (8px) por defecto — se re-mapean estos tokens en `@theme` para que las clases existentes adopten los radios de marca sin tocar cada componente.*

### 4.2 Espaciado

Escala Tailwind estándar (base 4px). Convenciones:

- Padding de card/panel: `p-4` (denso) o `p-6` (cómodo).
- Gap entre secciones de página: `space-y-6`.
- Formularios: `gap-4` entre campos; grid `{base:1, md:2}` (default de `DynamicForm`).
- Altura de controles: `h-9` (36px) default, `h-8` compacto en tablas, `h-10` en landing/CTAs.

### 4.3 Elevación (sombras)

| Token | Receta | Uso |
|---|---|---|
| `--shadow-rest` | ninguna — separar con `border-border` | Contenido en página |
| `--shadow-float` | `0 1px 2px rgb(0 0 0 / .05), 0 4px 12px rgb(0 0 0 / .06)` | Cards elevadas, dropdowns, popovers |
| `--shadow-overlay` | `0 1px 2px rgb(0 0 0 / .06), 0 16px 48px rgb(0 0 0 / .16)` | Modales, sheets |

Sombras siempre difusas y de baja opacidad; en dark el borde sutil pesa más que la sombra.

---

## 5. Glass (material flotante)

### 5.1 Receta

```css
.glass {
  background-color: color-mix(in srgb, var(--color-background) 65%, transparent);
  -webkit-backdrop-filter: saturate(160%) blur(16px);
  backdrop-filter: saturate(160%) blur(16px);
  border: 1px solid color-mix(in srgb, var(--color-border) 60%, transparent);
  box-shadow: var(--shadow-float);
}
.glass-overlay { /* modales/sheets: más opaco para legibilidad */
  background-color: color-mix(in srgb, var(--color-background) 80%, transparent);
  backdrop-filter: saturate(160%) blur(20px);
  box-shadow: var(--shadow-overlay);
}
@supports not (backdrop-filter: blur(1px)) {
  .glass, .glass-overlay { background-color: var(--color-background); }
}
```

### 5.2 Dónde sí / dónde no

| ✅ Glass | ❌ Sólido |
|---|---|
| `PrivateHeader`, `SiteHeader` (sticky) | Tablas (`DataTable`) y sus cards |
| Sidebar (`AppSidebar`) | Formularios (`DynamicForm`) |
| `Modal`, `Dialog`, `DetailSheet` | Paneles del inbox (lista + conversación) |
| `Popover`, `DropdownMenu`, `Command` | Cards de datos/métricas |
| `FloatingAlert`, tooltips | Cualquier superficie con texto denso |

Regla de legibilidad: el glass solo se posa sobre fondos que controla la app; nunca texto largo sobre glass con contenido moviéndose detrás.

---

## 6. Movimiento

Presets centralizados en **`src/core/styles/motion.ts`** — nunca duraciones/curvas ad-hoc:

| Preset | Valor | Uso |
|---|---|---|
| `spring.soft` | `{ type: "spring", stiffness: 260, damping: 30 }` | Sheets, modales (entrada/salida) |
| `spring.snappy` | `{ type: "spring", stiffness: 400, damping: 30 }` | Popovers, dropdowns |
| `fade.fast` | `150ms ease-out` | Listas, cambios de estado |
| `fade.slow` | `300ms ease-in-out` | Overlays de pantalla completa |
| `press` | `scale: 0.97`, 100ms | Botones e ítems interactivos |
| `hover` | transición 150–200ms | Color/fondo/sombra en hover |
| `splash.*` | entrada spring / salida `0.9s [0.7,0,0.84,0]` | Splash post-login (el logo "atraviesa la pantalla") |

Animaciones CSS de marca (en `globals.css`): `.animate-brand-pulse` (pulso del isotipo en el `BrandLoader`; se desactiva con reduced-motion) y `.animate-delayed-fade-in` (aparición diferida ~150ms para indicadores de navegación, evita flicker).

Reglas:
- Toda animación no esencial se desactiva con `prefers-reduced-motion` (`useReducedMotion` de framer-motion o la media query CSS ya presente en `globals.css`).
- Animar solo `transform` y `opacity` (compositor); nunca `width`/`height`/`top` en listas grandes.
- Nada parpadea ni se mueve en loop en el workspace.

---

## 7. Iconografía e ilustración

- **lucide-react** es el set único de UI (stroke 2px, tamaño default `size-4` en controles, `size-5` en navegación). `@heroicons/react` y `react-icons` solo para logos de terceros (WhatsApp, Instagram, Messenger) donde lucide no los tenga.
- Iconos de canal: usar el color oficial del proveedor **solo** en el icono, nunca en superficies propias.
- Loaders: **sin Lottie** (retirado). El loader de marca es `BrandLoader` (isotipo SVG inline vía `BrandMark` + animación CSS); ver §9.1.
- Ilustraciones/empty states: línea simple + un acento de la paleta (coral o violeta), fondo transparente.

---

## 8. Tema claro/oscuro

- Estrategia: `next-themes` con `attribute="class"`, `defaultTheme="system"`, `enableSystem` (ya configurado en `ThemeProvider`).
- **Control de tema** (`ThemeToggle`, a crear en `shared/components/layout/`): toggle de 3 estados (light / dark / system) presente en `PrivateHeader`, footer del `AppSidebar` y `SiteHeader`.
- Todo componente nuevo se revisa en ambos temas antes de mergear; los tokens hacen el 95% del trabajo si no hay hex sueltos.
- Evitar flash de tema: no leer `window`/tema en render de servidor; `suppressHydrationWarning` en `<html>` (ya aplicado).
- Imágenes/logos con variante por tema: renderizar ambas con `dark:hidden` / `hidden dark:block` (no JS).

---

## 9. Componentes: composición y patrones

Los primitivos viven en `shared/components/ui/` (shadcn) y los features en `shared/components/features/` — **componer, nunca reinventar** (arquitectura §11–12).

| Necesitas | Usa |
|---|---|
| Listado con paginación/búsqueda | `DataTable` + `usePaginatedList` |
| Formulario | `DynamicForm` + `*.config.tsx` (Zod) |
| Panel de detalle | `DetailSheet` (`fetchDetail`) |
| Confirmación / alerta | `useAlert()` (`showModal` / `showAlert`) |
| Selección múltiple | `MultiSelect` |
| Overlay navegable | Slot paralelo `@modal`/`@form` + ruta interceptada |
| Carga de vista/tabla/formulario | Ver §9.1 (Estados de carga) |

Patrones de estado obligatorios en toda vista: **cargando** (§9.1), **vacío** (icono + frase + acción sugerida), **error** (`errorMessage(err)` + reintento).

### 9.1 Estados de carga (jerarquía normativa)

Guía completa con ejemplos: [`LOADING.md`](./LOADING.md). Regla de decisión, en orden:

1. **Skeleton estructural** — cuando la forma de la UI destino es conocida. Replica la silueta (icono + texto, filas, paneles) para que el render final no "salte". Piezas: `Skeleton` (`shared/components/ui/skeleton.tsx`) y los compuestos `TableSkeleton` / `FormSkeleton` / `InboxSkeleton` (`shared/components/features/loading/`) y `SidebarNavSkeleton` (menú).
2. **`BrandLoader`** (`shared/components/ui/brand-loader.tsx`) — cuando la estructura no es predecible (vistas nuevas, cargas de pantalla completa). Isotipo con pulso sutil; RSC-compatible (usable en `loading.tsx` sin `"use client"`).
3. **Spinner inline** (`LoaderCircle` de lucide + `animate-spin`) — solo para acciones puntuales: botones en submit, ítem de navegación pendiente, estados "conectando" de un canal.

Reglas:
- Toda ruta privada lleva `loading.tsx` (skeleton estructural o `BrandLoader` según lo anterior).
- Los indicadores de navegación aparecen con retardo (~150ms, `.animate-delayed-fade-in`) para no parpadear en cargas instantáneas.
- Skeletons con anchos **deterministas** (nunca `Math.random()`: rompe la hidratación SSR).
- Todo estado de carga usa tokens (light + dark), expone `role="status"` + `aria-label`, y anima solo `transform`/`opacity`.
- **Prohibido**: animaciones Lottie para loaders, spinners ad-hoc, texto "Cargando..." suelto como único indicador.
- El splash post-login (`SplashProvider` + `useSplash`) es el único loader de pantalla completa por encima de los layouts; ver LOADING.md §Splash.

---

## 10. Accesibilidad (no negociable)

- Contraste AA: 4.5:1 texto, 3:1 texto grande y componentes UI — verificado en light y dark.
- Focus visible siempre: `focus-visible:ring-ring` (coral) en todo elemento interactivo; jamás `outline: none` sin reemplazo.
- Semántica: primitivos Radix ya la traen; no romperla (un botón es `<button>`, no un `<div onClick>`).
- Targets táctiles ≥ 40px en móvil.
- `alt` en imágenes significativas, `aria-label` en botones de solo-icono (incluido el `ThemeToggle`).
- `prefers-reduced-motion` respetado (ver §6).

---

## 11. Checklist de diseño (antes de mergear UI)

- [ ] ¿Cero hex/colores crudos? ¿Todo vía tokens semánticos o utilidades de marca?
- [ ] ¿Se ve correcto en light **y** dark?
- [ ] ¿Radios según §4.1 (controles 12px, flotantes 16–20px, pills)?
- [ ] ¿Glass solo si es superficie flotante (§5.2)?
- [ ] ¿Tipografía de la escala §3.2, Geist en UI, Nexa solo display?
- [ ] ¿Estados cargando/vacío/error cubiertos?
- [ ] ¿Focus visible, contraste AA, `aria-label` en icon-buttons?
- [ ] ¿Animaciones con presets §6 y `prefers-reduced-motion`?
- [ ] ¿Iconos lucide (salvo logos de terceros)?
- [ ] ¿Destructivo usa `destructive`, nunca el coral?
