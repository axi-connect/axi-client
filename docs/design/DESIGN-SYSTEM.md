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

**Techo de tinte y sus dos excepciones.** El techo del sistema para teñir una
superficie es el 14% de `--color-accent`. Lo rompen a propósito dos superficies, y
las dos están declaradas en `globals.css` con su motivo: `.channel-surface`
(7–34%, el color oficial del proveedor) y `.axel-field` (hasta el 26%, la aurora
del despacho de Axel). El criterio que las autoriza es el mismo: el tinte no
compite con el coral de acción ni con los colores de estado, y la superficie
existe para sentirse habitada, no para presentar datos. Una tercera excepción no
se añade sin actualizar esta línea.

### 2.4 Paleta de visualización de datos

Orden fijo para series de gráficos: `brand` → `violet` → `amber` → `info` → `success` → tonos `color-mix` al 60% de los anteriores. Nunca colores fuera de la paleta.

---

## 3. Tipografía

### 3.1 Familias (variables montadas en `app/layout.tsx`)

| Variable CSS | Familia | Rol |
|---|---|---|
| `--font-headings` | Nexa (local, 200/700) | Headings (h1–h6) y display de marca |
| `--font-sans` / `--font-body` | **Poppins** | **Default de toda la UI y el cuerpo** — decisión de marca confirmada, no se reemplaza |
| `--font-mono` | Geist Mono | Código, IDs, datos técnicos |

*Deuda menor pendiente (Fase 4): quitar el `!important` del selector global `h1..h6` en favor de una regla normal, y dejar de cargar Geist Sans (solo se usa la Mono).*

### 3.2 Escala tipográfica

| Rol | Clase | Tamaño/line-height | Peso | Uso |
|---|---|---|---|---|
| Display | `text-5xl tracking-tight font-heading` | 48/1.05 | Nexa 700 | Hero landing |
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

### 4.2 Espaciado y ancho de contenido

Escala Tailwind estándar (base 4px). Convenciones:

- Padding de card/panel: `p-4` (denso) o `p-6` (cómodo).
- Gap entre secciones de página: `space-y-6`.
- Formularios: `gap-4` entre campos; grid `{base:1, md:2}` (default de `DynamicForm`).
- Altura de controles: `h-9` (36px) default, `h-8` compacto en tablas, `h-10` en landing/CTAs.

**Ancho de contenido (panel privado):** las **superficies** (fondo degradado del panel, header glass) ocupan siempre el **100%** del ancho disponible; el **contenido** se centra con `mx-auto max-w-7xl` + gutters `p-4 md:p-6`. Ese centrado lo aporta el layout del route group `(content)` (`src/app/(private)/(content)/layout.tsx`) y el wrapper interno del `PrivateHeader` — **las páginas no añaden padding de página propio** (los skeletons de `features/loading/` tampoco). Las vistas de aplicación (`workspace/inbox`) viven fuera del grupo `(content)` y son **full-bleed**: aprovechan todo el ancho sobre la superficie.

**Propiedad del scroll (alto del panel privado y de `/platform`).** Cada superficie tiene **un solo** contenedor scrolleable, marcado `[data-app-scroll]`. La cadena es fija:

```
SidebarProvider            h-dvh min-h-0 overflow-hidden        ← marco topado al viewport
└ div[data-app-scroll]     flex min-h-0 flex-1 flex-col overflow-y-auto   ← scroller del PANEL
  ├ div                    sticky top-0 z-40 shrink-0           ← header + banners, juntos
  └ SidebarInset           flex-1  has-[[data-app-view]]:min-h-0
    └ superficie           flex flex-1 flex-col  has-[[data-app-view]]:min-h-0
      └ vista full-bleed   data-app-view + flex min-h-0 flex-1 overflow-hidden
        └ wrapper children flex min-w-0 min-h-0 flex-1 overflow-hidden
          └ raíz de vista  flex min-h-0 flex-1                  ← la page NO añade wrapper
            └ columnas     min-h-0 flex-1 overflow-y-auto       ← el único scroll del área
```

Reglas que se derivan de ahí:

- **Nunca `calc(100svh - <alto del header>)`.** Restar la altura del header a mano es el defecto que produjo el doble scroll de todo el panel: el header medía **54px** reales (`py-2` + `size-9` de la campana + los 2px de borde de `.glass`) y seis archivos asumían **52px**, así que el scroller desbordaba 2px y pintaba una barra fantasma junto a la del contenido. La altura la reparte flex: el grupo pegado es `shrink-0` y consume su alto real, y el hermano de abajo toma el resto con `flex-1`.
- **El header y los banners viven DENTRO del scroller**, como un único grupo `sticky top-0 shrink-0`. Es lo que mantiene el blur-through del glass (§5.1): el contenido sigue pasando por detrás del cristal al scrollear. No sacarlos fuera.
- **El header no declara altura fija**, a propósito: nada debe depender de cuánto mide.
- **Hay DOS modos de scroll y la vista elige, con `data-app-view`.** Una vista **documental** (dashboard, ajustes, cualquier página de `(content)`) debe **crecer** y que scrollee el panel. Una vista de **aplicación** (inbox, CRM) debe quedarse **topada** y que scrollee su interior. Como el shell es el mismo, `SidebarInset` y la superficie llevan `min-height: auto` por defecto —que es lo que permite crecer— y lo cambian a `min-h-0` con `has-[[data-app-view]]` cuando la vista se declara de aplicación. Sin ese marcador, una vista full-bleed puede poner todos los `min-h-0` que quiera abajo: sus dos ancestros seguirán estirándose con el contenido y el scroll se irá al panel. **Solo poner `data-app-view` si la vista garantiza un scroller interno propio**; si no, el contenido se recorta en vez de scrollear.
- **`flex-1`, nunca porcentajes**, en toda la cadena — superficie, vistas full-bleed **y todo lo que cuelgue de ellas**: `SidebarInset` tiene altura `auto` y un `h-full`/`min-h-full` contra un padre `auto` resuelve a `auto`, no a la altura del viewport. Corolario que ya costó un bug: **quitar una altura definida (`h-[calc(...)]`) obliga a convertir en el mismo commit todos los `h-full` que colgaban de ella**. El inbox se quedó con nueve (`page.tsx`, `InboxView`, `InboxList`, `ConversationPanel`, `ContextPanel`, el skeleton…) cuando su raíz pasó de `h-[calc(100svh-52px)]` a `flex-1`: el timeline crecía hasta 7361px con 60 mensajes en vez de acotarse a 625px, y el panel entero scrolleaba.
- **Las `page.tsx` no envuelven la vista en un `<div>` de altura.** Un `<div className="h-full">` intermedio rompe la cadena; la vista es directamente el ítem flex.
- **El marcador `data-app-view` va en un `layout.tsx`, no en la vista.** Si vive en el componente de la vista, el `loading.tsx` del segmento se pinta sin él —en modo documental— y hereda el padding del shell además del suyo. Moldes: `crm/pipeline/layout.tsx`, `scheduling/reminders/layout.tsx`.
- **Un shell de SECCIÓN nunca declara el modo: lo propaga.** Una sección con rutas de los dos modos (CRM, Agenda, Llamadas) lleva `has-[[data-app-view]]:*` y deja que la vista de aplicación se marque. Declararlo en el shell le impone un scroller propio a las rutas documentales, y eso son **dos barras apiladas** más —porque un `overflow-y: auto` fuerza `overflow-x` a `auto`— **una franja vacía abajo**. Ya pasó tres veces: `/crm/contacts` (`aed8893`), `/calls/settings` y `/scheduling/settings`, las dos últimas por copiar el shell del CRM antes de que se arreglara.
- Los scrollers internos de las vistas (tablas, rails, columnas kanban, lista del inbox) siguen usando `min-h-0 flex-1 overflow-y-auto` y son el único scroll de su área. **Y son scrollers de BLOQUE, no `flex flex-col`**: el tamaño mínimo automático de un hijo que sea contenedor de scroll (cualquier cosa con `overflow-hidden`) es **0**, así que en un scroller flex ese hijo se aplasta a la altura disponible y recorta su contenido en vez de hacer scrollear al padre. Es el defecto que dejaba sin scroll el tablero de Axel. Separa con `space-y-*`, no con `gap`.
- **`body` es un tercer scroller latente y no documentado.** `globals.css` deja `html { overflow: hidden }` y acto seguido `body { overflow-y: auto }`, lo que convierte a `body` en contenedor de scroll (y fuerza su `overflow-x` a `auto`). Hoy nunca desborda porque el marco del panel mide exactamente `h-dvh`, pero cualquier elemento que se salga de `100dvh` pinta una barra que no pertenece a ninguna superficie.

### 4.3 Elevación (sombras)

| Token | Receta | Uso |
|---|---|---|
| `--shadow-rest` | ninguna — separar con `border-border` | Contenido en página |
| `--shadow-float` | `0 1px 2px rgb(0 0 0 / .05), 0 4px 12px rgb(0 0 0 / .06)` | Cards elevadas, dropdowns, popovers |
| `--shadow-overlay` | `0 1px 2px rgb(0 0 0 / .06), 0 16px 48px rgb(0 0 0 / .16)` | Modales, sheets |

Sombras siempre difusas y de baja opacidad; en dark el borde sutil pesa más que la sombra.

### 4.4 Capas (z-index)

Fuente única: `src/core/styles/layers.ts` (`LAYERS`). **Ningún z-index suelto en componentes**; si hace falta una capa nueva, se añade allí y se documenta aquí.

| Capa | Valor | Qué vive ahí |
|---|---|---|
| `overlay` | 50 | `Dialog`, `Sheet`, `Modal` — overlays de Radix con backdrop propio |
| `detailSheet` | 60 | Panel del `DetailSheet` (su backdrop se pinta en 59) |
| `floating` | 70 | Contenido **portalado** a `body`: `Select`, `Popover`, `Tooltip`, `ContextMenu` |
| `alert` | 9999 | `FloatingAlert` |

`DropdownMenu` queda fuera de la tabla a propósito: es una implementación propia con `absolute`, así que vive dentro del contexto de apilamiento de su contenedor y nunca compite con los overlays.

**Regla: el contenido flotante vive siempre por encima de la superficie que lo ancla.** El contenido de un `Select` se portaliza a `document.body`, así que su z-index compite con el de los overlays, no con el del formulario que lo contiene. Si empata o queda por debajo del panel opaco que lo abrió, el listado se pinta detrás y el clic lo recibe el panel: el control parece no funcionar.

En Tailwind v4 las clases se extraen estáticamente del fuente: usar `z-[70]` literal, nunca `z-[${valor}]`. Cuando el valor tiene que ser dinámico (el `zIndex` configurable del `DetailSheet`), va por `style` inline leyendo `LAYERS`.

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
.glass-menu { /* mega-menú público: panel grande con tarjetas dentro */
  background-color: color-mix(in srgb, var(--color-background) 82%, transparent);
  backdrop-filter: saturate(180%) blur(32px);
  box-shadow: var(--shadow-overlay);
}
@supports not (backdrop-filter: blur(1px)) {
  .glass, .glass-overlay { background-color: var(--color-background); }
}
```

**Tres recetas, no dos.** La opacidad y el blur se mueven juntos y en sentido
contrario: **más blur es lo que permite bajar la opacidad sin perder
legibilidad**. De ahí las tres, por tamaño de la superficie y por lo que lleva
dentro:

| Receta | Fondo · blur | Para |
|---|---|---|
| `.glass` | 65 % · 16px | Barras y flotantes pequeños: header, sidebar, popovers, tooltips |
| `.glass-menu` | 82 % · 32px | Mega-menú del sitio público: panel ancho con tarjetas propias dentro |
| `.glass-overlay` | 80 % · 20px | Modales y sheets: texto denso, y el scrim ya separa del fondo |

Corolario para el contenido que va **dentro** de una superficie de cristal: sus
tarjetas y filas no pueden ser opacas, o tapan el blur y el panel se lee como
una caja sólida. Para eso están la variante `surface="glass"` de `BrandCard`
(fondo al 55 %) y `.brand-sheen`, que aporta el halo de marca **sin** su propio
suelo — mismas coordenadas que `.bg-brand-ambient`, para que el ambiente de la
marca no se bifurque.

**El lenguaje de superficie de la marca son elipses, no retículas.** El halo
suave anclado a una esquina es lo que hacen el hero y la tarjeta del footer;
una rejilla de cuadros es lenguaje técnico y no es de esta marca (por eso se
retiró la `GridCard` que vino con la plantilla del mega-menú).

### 5.2 Dónde sí / dónde no

| ✅ Glass | ❌ Sólido |
|---|---|
| `PrivateHeader`, `SiteHeader` (sticky) | Tablas (`DataTable`) y sus cards |
| Panel del mega-menú público (`.glass-menu`) | Páginas de producto: sus tarjetas son sólidas |
| Sidebar (`AppSidebar`) | Formularios (`DynamicForm`) |
| `Modal`, `Dialog`, `DetailSheet` | Paneles del inbox (lista + conversación) |
| `Popover`, `DropdownMenu`, `Command` | Cards de datos/métricas |
| `FloatingAlert`, tooltips | Cualquier superficie con texto denso |

Regla de legibilidad: el glass solo se posa sobre fondos que controla la app; nunca texto largo sobre glass con contenido moviéndose detrás.

La tabla habla de **superficies**. Un glifo ilustrado de cristal (`GlassGlyph`, §7) no es una superficie y no está en ninguna de las dos columnas: no lleva `backdrop-filter`, no aloja contenido y nunca hay texto encima.

### 5.3 Cristal blanco sobre un campo de color (`.sf-glass`)

El registro `/comenzar` (rediseño «Flow», 2026-09-05) pinta sus controles —fichas, inputs, segmentado, nodos de la ruta— con **otro material**: cristal blanco a distintos porcentajes del color del texto (`--sf-fg` 16 % en reposo, 24 % en hover, 30 % seleccionado; borde al 26 %) y **sin `backdrop-filter`**, porque detrás solo hay un degradado que la app controla (§5.2) y los nodos viajan dentro de un `transform`. No sustituye a `.glass`: `.glass` es el material de lo que flota sobre el contenido; `.sf-glass` es el de los controles que se posan sobre un **campo de color** (ver §8, «re-derivación por alcance»). Vive junto a `.signup-field` en `globals.css` y solo tiene sentido dentro de ese alcance.

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
| `splash.*` | entrada `0.45s` / salida `1.1s [0.55,0,0.85,0.15]`, escala 1→80 | Splash de entrada a la app ("se entra por el ojo de la α") — valores documentales; la implementación real es CSS |

Animaciones CSS de marca (en `globals.css`): `.animate-brand-pulse` (pulso del isotipo en el `BrandLoader`; se desactiva con reduced-motion), `.animate-delayed-fade-in` (aparición diferida ~150ms para indicadores de navegación, evita flicker) y las fases del splash (`splash-in` / `splash-exit` / `fade-in`).

Reglas:
- Toda animación no esencial se desactiva con `prefers-reduced-motion` (`useReducedMotion` de framer-motion o la media query CSS ya presente en `globals.css`).
- Animar solo `transform` y `opacity` (compositor); nunca `width`/`height`/`top` en listas grandes.
- **Animaciones que deben sobrevivir a cargas pesadas** (splash, loaders de transición) van en **CSS, no en framer-motion**: framer anima por rAF en el hilo principal y se congela si la página destino está hidratando; el CSS corre en el compositor (caso real: LOADING.md §6.3).
- Nada parpadea ni se mueve en loop en el workspace. **Excepción única y
  declarada: la aurora del despacho de Axel** (`.axel-field::before`, módulo
  CMO). Se concede porque cumple las tres condiciones que la hacen inocua: 72 s
  por vuelta (no se percibe movimiento mirando la pantalla, se nota al volver a
  ella), solo `transform` sobre una capa sin texto encima, y `alternate` para que
  no dé un salto al reiniciar el ciclo. Se apaga entera con
  `prefers-reduced-motion`. Cualquier otra superficie del panel sigue quieta: si
  aparece una segunda, esto deja de ser una excepción y pasa a ser la regla nueva
  — y entonces se discute aquí, no en el componente.
- **Lo que NO cuenta como excepción**: un efecto que solo corre mientras el
  puntero está encima. En reposo la superficie está quieta, no hay animación ni
  `requestAnimationFrame` vivo, y el usuario decide cuándo empieza y cuándo
  acaba. Es el caso del cometa de `.channel-surface` (canales e integraciones),
  del de `.ticket-surface--live` (el tiquete de facturación) y del tilt de
  `TiltCard`. La línea que separa una cosa de la otra es *quién lo dispara*: si
  arranca solo, es un loop y necesita permiso aquí; si lo enciende el ratón, es
  respuesta a una acción. Los tres se apagan igualmente con
  `prefers-reduced-motion` y ninguno se engancha sin puntero fino.
- **Celebraciones**: una ráfaga de confeti **finita** (`Confetti` +
  `brandCelebration`, ~2,5 s, termina sola) tampoco es un loop: la dispara una
  acción del usuario que merece celebrarse y acaba. Hoy hay una sola: la
  bienvenida tras crear la cuenta (`/onboarding?welcome=1`). Condiciones para
  cualquier otra: colores de marca leídos de los tokens, disparo **después** de
  que el splash se haya ido (`SplashContext.phase === "idle"`), una sola vez por
  pantalla, y con `prefers-reduced-motion` no se pinta nada. El workspace
  (inbox, CRM, tablas) no celebra: sigue quieto.

---

## 7. Iconografía e ilustración

- **lucide-react** es el set único de UI (stroke 2px, tamaño default `size-4` en controles, `size-5` en navegación). `@heroicons/react` y `react-icons` solo para logos de terceros (WhatsApp, Instagram, Messenger) donde lucide no los tenga.
- Iconos de canal: usar el color oficial del proveedor **solo** en el icono, nunca en superficies propias.
- Loaders: **sin Lottie** (retirado). El loader de marca es `BrandLoader` (isotipo SVG inline vía `BrandMark` + animación CSS); ver §9.1.
- **Ilustración y empty states: dos materiales, y la vista elige uno.**
  - **Línea simple** — trazo de un pelo + un acento de la paleta (coral o violeta), fondo transparente. Es el default y cubre cualquier ilustración puntual que no tenga glifo propio.
  - **Cristal ilustrado** (`GlassGlyph`, `shared/components/ui/glyphs/`) — diez glifos propios, uno por familia semántica del inventario de estados vacíos, dibujados como objeto de vidrio en SVG inline. El material vive en el bloque `.glass-glyph` de `globals.css`; el componente es solo geometría.

  **Por qué no contradice el mandamiento 3 (DESIGN §8) ni la tabla de §5.2.** El glass de §5 es un material de SUPERFICIE y está *definido* por `backdrop-filter`: compone lo que hay detrás, y por eso la regla lo prohíbe bajo texto denso. El cristal ilustrado **no lleva `backdrop-filter` en ninguna capa** — su translucidez está pintada en gradientes, no compuesta. No aloja contenido, no tiene nada moviéndose detrás y nunca hay texto encima. Es un glifo, no una superficie: el mismo criterio con el que `.ticket-surface` pone el ámbar fuerte en el anillo de 1px, «que NO es tinte de superficie».

  **Test de revocación, binario:** si un glifo llega a usar `backdrop-filter`, deja de estar autorizado por esta línea y pasa a ser glass sujeto a §5.2. Hay un test que lo comprueba (`glass-glyph.test.tsx`).

  Condiciones de uso, todas obligatorias:
  1. **Solo estados vacíos e ilustración.** Nunca como icono de un control, de navegación, de un badge o de una fila de tabla: ahí manda lucide.
  2. **Nunca debajo de texto** ni como fondo de nada.
  3. **Tres tamaños y un techo de 176px.** `sm` 48px (dentro de una card), `md` 96px (el estado vacío estándar), `lg` 176px (vacío de página completa). El `tier` decide tamaño, detalle Y grosor de trazo a la vez, a propósito: separarlos permite pedir nueve capas a 48px (barro) o un trazo de 1px sobre 176 (silueta anémica). La primera escala del set —32/64/128 con trazo único— se quedó corta: un objeto translúcido se lee por su silueta, así que un rim delgado hace que el glifo parezca pequeño aunque no lo sea. Un glifo que ocupa media pantalla vuelve a ser una superficie.
  4. **Cero hex en el componente.** El material sale de las variables `--glass-*` y el acento de `--glyph-accent`, declaradas una sola vez en `globals.css`. Los dos únicos literales del material —blanco de luz y blanco de reflejo— viven ahí: son física, no paleta. Esto es MÁS estricto que `BrandMark`, que sí se declara artwork y lleva sus hex.
  5. **Un acento por vista (§2.1).** El glifo *consume* el acento de su familia vía `.glass-glyph--{brand|amber|violet|success|muted}`; no lo elige el llamador.
  6. **Con un glifo, `EmptyState` no pinta el disco teñido.** El glifo ya trae su pedestal y un círculo tintado detrás de un objeto de vidrio se lee como dos platos compitiendo.
  7. **El reflejo solo lo enciende el puntero** sobre un contenedor marcado con `glass-host`, o un `:focus-visible` dentro. En reposo el glifo está quieto y no hay animación viva — es el caso que §6 excluye expresamente de la regla del loop. Y `glass-host` se pone **solo donde el contenedor es hovereable de verdad**: un estado vacío inerte que brilla al pasar por encima promete una interacción que no existe.

---

## 8. Tema claro/oscuro

- Estrategia: `next-themes` con `attribute="class"`, `defaultTheme="system"`, `enableSystem` (ya configurado en `ThemeProvider`).
- **Control de tema** (`ThemeToggle`, a crear en `shared/components/layout/`): toggle de 3 estados (light / dark / system) presente en `PrivateHeader`, footer del `AppSidebar` y `SiteHeader`.
- Todo componente nuevo se revisa en ambos temas antes de mergear; los tokens hacen el 95% del trabajo si no hay hex sueltos.
- Evitar flash de tema: no leer `window`/tema en render de servidor; `suppressHydrationWarning` en `<html>` (ya aplicado).
- **Re-derivación de tokens por alcance** (`.theme-dark-island`, `.signup-field`): un bloque puede redefinir los tokens semánticos (`--color-foreground`, `--color-muted-foreground`, `--color-border`, `--color-input`, `--color-ring`, `--color-primary(-foreground)`, `--color-secondary`, `--color-accent`, `--color-destructive`) **dentro de su propio alcance**, y todo primitivo que viva dentro adopta el material sin variantes ni hex en componentes. Es la forma de pintar un momento de marca (isla oscura de Fundadores, campo coral del registro) sin bifurcar componentes. Reglas: se aplica **una vez**, en el layout de la superficie; `--color-background` no se toca (el cristal se mezcla contra el fondo real y los overlays siguen siendo los de la app); el bloque declara como mucho **un** hex propio (`--sf-fg: #ffffff`, el texto sobre coral) y todo lo demás se deriva con `color-mix`; el bloque `.dark` del mismo alcance devuelve los tokens al tema (`--sf-fg: var(--foreground)`, destructivo al rojo). Cuando la marca cae sobre el campo, el isotipo conserva sus cintas y solo el wordmark toma el color del texto (`.signup-field .text-brand-wordmark`).
- Imágenes/logos con variante por tema — **dos casos, según el logo**:
  - **A color** (varias tintas, como el logo horizontal de axi con sus tres cintas): dos archivos, renderizando ambos con `dark:hidden` / `hidden dark:block` (no JS).
  - **Monocromo** (silueta con canal alfa): **un solo archivo** como `mask-image` + `bg-current`. El color lo aporta el token de texto, así que sigue al tema sin una sola variante `dark:` y sin un segundo asset que mantener sincronizado. El color del archivo es irrelevante — solo cuenta su transparencia. Referencia: `shared/components/layout/site/KodecolBanner.tsx`.
    - La `mask-image` va en `style` inline si la URL es un valor de runtime: Tailwind necesita clases estáticas en build time. En ese caso, escribir los `-webkit-mask-*` a mano — los estilos inline de React no pasan por Lightning CSS y no reciben prefijado automático.
    - Sin `<img>` no hay semántica de imagen: declarar `role="img"` + `aria-label`.

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
| Avatar / logo con fallback | `Avatar` (`shared/components/ui/avatar.tsx`) — inicial sobre `bg-muted` si no hay URL o falla la carga |
| Marca en una cabecera (isotipo + wordmark) | `BrandLockup` (`shared/components/ui/brand-lockup.tsx`) — RSC-compatible, `size="md"\|"sm"`; solo el isotipo → `BrandMark` (DESIGN.md §2.2) |
| Celebración puntual (una ráfaga, no un loop) | `Confetti` + `brandCelebration` (`shared/components/ui/confetti.tsx`) — canvas-confetti en diferido, colores de `readBrandPaletteCss`, reduced-motion lo apaga; ver §6 |
| Overlay navegable | Slot paralelo `@modal`/`@form` + ruta interceptada |
| Navegación jerárquica en el sidebar | `NavItemNode` + `nav-tree` / `nav-active` (ver §9.2) |
| Pestañas, sub-navegación de sección y filtros segmentados | La pastilla de §9.3 — `NavTabs`, `Tabs variant="pill"` o `SegmentedControl` |
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

### 9.2 Navegación jerárquica del sidebar

El menú del tenant es un árbol de hasta 3 niveles (contrato y piezas en arquitectura §4.2). Reglas visuales:

| Estado | Tratamiento |
|---|---|
| **Activo** (hoja del rastro) | `bg-accent` + `text-accent-foreground` + **barra coral de 2px** a la izquierda (`before:`, `bg-brand`, `rounded-full`, 16px de alto) + `aria-current="page"` |
| **Ancestro** del activo | Sin fondo: icono en `text-brand` y label `font-medium`. Su grupo aparece desplegado |
| **Hover** | `bg-accent` en la fila; el chevron tiene su propio hover, porque es un target distinto |

- **Un icono por nivel 0 y ninguno debajo.** En los subniveles la indentación (24px por nivel: `mx-3.5` + `px-2.5` de `SidebarMenuSub`, que deja el label del hijo exactamente bajo el del padre) y la línea guía (`border-l`, atenuada a `border-border/60` en nivel ≥2) sustituyen al icono. Los nombres de icono que emite el backend deben existir en el diccionario **cerrado** de `core/lib/icons.ts` o caen a `Circle`.
- **Fila y chevron son targets separados** cuando el padre tiene página propia: la fila navega, el chevron pliega. El chevron lleva `aria-label` dinámico ("Expandir/Contraer <nombre>"), `aria-expanded`, `aria-controls` y hit-area táctil de ≥40px en móvil (`after:-inset-2 md:after:hidden`). En un **grupo puro** la fila entera es el toggle, así que es ella la que declara `aria-expanded`/`aria-controls` y la flecha queda decorativa (`aria-hidden` + `pointer-events-none`).
- **Un solo borde derecho para todas las filas, a cualquier profundidad.** La jerarquía se lee por la izquierda: el submenú anula su sangrado derecho (`mr-0 pr-0` sobre el `mx-3.5 px-2.5` del primitivo), y la fila de un grupo puro anidado lleva `w-full` porque un `<button>` no se estira con `display:flex` como sí lo hace un `<a>`. Sin las dos cosas los fondos de hover de los hijos salían más cortos que los de nivel 0 y la columna de flechas se rompía. Verificado midiendo en el navegador: un único borde derecho y una única columna de chevrons.
- **El chevron se posiciona contra SU FILA, nunca contra el `<li>`.** Es `absolute top-1/2`, y el `<li>` de los primitivos (`relative`) envuelve también el submenú: sin una caja intermedia, `top-1/2` mide la mitad de (fila + hijos) y la flecha se va fuera de su fila al desplegar — encima de un hijo, o al lado de la flecha de un subgrupo. Por eso fila y chevron comparten un `div.relative` propio. Las dos variantes usan además **una sola constante de geometría** (`CHEVRON_BOX`/`CHEVRON_ICON` en `nav-item.tsx`): con offsets escritos por separado las flechas de filas hermanas no alinean.
- **Movimiento:** despliegue con `spring.snappy` (§6) sobre `height`/`opacity` y `overflow-hidden`; el chevron rota 200ms. Todo se anula con `useReducedMotion`. Se anima altura solo porque los grupos son de ≤8 filas — en listas grandes sigue prohibido (§6).
- **Modo icono:** un grupo colapsado abre un flyout (`Popover`, glass + `rounded-lg` + `shadow-float`, `side="right"`) con sus descendientes; los ítems hoja usan la prop `tooltip` de `SidebarMenuButton`. Sin esto la fila de un grupo sería un click muerto, porque los subniveles llevan `group-data-[collapsible=icon]:hidden`.
- **El control de plegado vive en la cabecera del sidebar** (`SidebarCollapseButton`), no solo en el header de página: es donde está lo que controla, y colapsado queda centrado bajo el isotipo porque es el único camino de vuelta. **Icono y `aria-label` cambian con el estado** (`PanelLeftClose` / «Colapsar menú» ↔ `PanelLeftOpen` / «Expandir menú»); un control de plegado que se pinta igual en ambos estados no dice en qué estado está. El tooltip incluye el atajo (`⌘B` o `Ctrl+B` según plataforma). En móvil el sidebar es un `Sheet` con su cierre nativo oculto, así que ahí el mismo botón es el cierre (`X`, «Cerrar menú»). El `SidebarTrigger` del header de página **se conserva**: con el sheet cerrado no hay sidebar donde alojar nada.
- **Modo icono no pierde funciones, las reencaja.** La cabecera usa `px-2` en modo icono (48 − 16 = 32px, el ancho del isotipo, alineado con las filas del menú); con el `px-3` de expandido la caja interior quedaba en 24px y el logo se desbordaba. Y el control de tema pasa a su variante `compact` (un icono + `Popover` con las tres opciones) en vez de ocultarse: el segmentado mide ~84px y no cabe en el rail, pero ocultarlo dejaba el tema inaccesible hasta volver a expandir. Regla general: **en el rail se cambia la presentación, no se elimina el control**.
- **Sin secciones con etiqueta:** la agrupación la dan exclusivamente los padres colapsables. No se mezclan dos mecanismos de agrupación en el mismo menú.

---

### 9.3 Pestañas, sub-navegación y segmentados — una pastilla, tres semánticas

Todas las pestañas del panel comparten **un solo recetario visual**
(`shared/components/ui/segmented.tsx`) y **tres semánticas distintas**. Antes
había tres lenguajes para la misma idea, repartidos en 23 copias: subrayado en
las navegaciones de sección, rectángulo gris de shadcn en los `Tabs` de Radix y
pill coral en once copias de un `SegmentedToggle` pegado a mano.

| Si el control… | Es | Componente | Semántica |
|---|---|---|---|
| cambia de **ruta** | navegación | `NavTabs` (`layout/nav-tabs.tsx`) | `<nav>` + `<ul>` + `Link` + `aria-current="page"` |
| cambia de **vista con panel** en la misma página | pestañas | `Tabs` (`variant="pill"`, por defecto) | `role="tab"` + `tabpanel` (Radix) |
| **elige entre opciones, sin panel** | filtro | `SegmentedControl` | `role="radiogroup"` + `aria-checked` + roving tabindex |

**La semántica no es decorativa.** Once de las copias declaraban `role="tab"`
sin `tabpanel`: eso anuncia al lector de pantalla una pestaña cuyo contenido no
existe. Regla: **si no hay panel, no es una pestaña.** Y si cambia de URL,
tampoco: es navegación.

**El activo es `bg-accent` + `text-accent-foreground` + icono `text-brand`**, no
coral sólido. Razón dura: blanco sobre `--axi-brand` da ~3.1:1 y **no pasa AA**
para texto pequeño, y estas etiquetas miden 12–13px. Es además el mismo
tratamiento del ítem activo del sidebar (§9.2), así que el producto entero
navega con un solo lenguaje.

**Etiquetas (`labels`)**: `always` (todas), `active` (solo la del activo, el
resto queda como icono) y `auto` — `active` por debajo de `md` y `always` a
partir de ahí. La etiqueta oculta **colapsa su caja, nunca sale del DOM**: el
lector de pantalla sigue leyéndola.

**La pastilla se posiciona midiendo el DOM**, no el estado de React: busca
`[data-state="active"]`, `[data-active="true"]` o `[aria-current="page"]` con un
`MutationObserver` + `ResizeObserver`, y escribe `transform`/`width`
directamente en el nodo. Tres consecuencias buscadas: sirve para las tres
familias sin duplicar cuál es el ítem activo (Radix escribe `data-state` sin
avisar a React), medir no re-renderiza la barra, y solo se animan propiedades de
compositor. Se anula con `motion-reduce:` desde CSS, sin JS.

**Tamaños y superficies:** `size="default"` en barras de cabecera, `sm` dentro
de una card; `surface="raised"` cuando la barra flota sobre el contenido,
`inline` cuando ya vive dentro de una superficie elevada (para no elevar dos
veces). Cuando no cabe, la barra scrollea **dentro de sí misma**: el body de la
vista nunca scrollea en horizontal (§4.2).

**Fuera de este sistema** quedan a propósito los `aria-pressed` que no eligen
entre opciones excluyentes: el rail vertical del inbox, los popovers de ajuste,
la galería de proveedores y el constructor de recurrencia. Son interruptores, no
pestañas.

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
- [ ] ¿Ningún `GlassGlyph` usa `backdrop-filter`, ni va bajo texto, ni pasa de 176px (§7)?
- [ ] ¿Tipografía de la escala §3.2 — Poppins en cuerpo/UI, Nexa en headings?
- [ ] ¿Estados cargando/vacío/error cubiertos?
- [ ] ¿Focus visible, contraste AA, `aria-label` en icon-buttons?
- [ ] ¿Animaciones con presets §6 y `prefers-reduced-motion`?
- [ ] ¿Iconos lucide (salvo logos de terceros)?
- [ ] ¿Destructivo usa `destructive`, nunca el coral?
