# LOADING — Estados de carga de Axi Connect

> **Guía de uso del sistema de carga.** Complementa [`DESIGN-SYSTEM.md`](./DESIGN-SYSTEM.md) §9.1 (jerarquía normativa) y §6 (movimiento). Se consulta antes de añadir cualquier estado de carga nuevo.

---

## 1. Jerarquía de decisión

| ¿Conoces la forma de lo que va a renderizar? | Usa |
|---|---|
| Sí (tabla, formulario, lista, sidebar, inbox) | **Skeleton estructural** |
| No (vista nueva, pantalla completa) | **`BrandLoader`** |
| Es una acción puntual (submit, click de navegación, "conectando") | **Spinner inline** (`LoaderCircle` de lucide + `animate-spin`) |

**Prohibido:** Lottie para loaders, spinners ad-hoc con estilos propios, y texto "Cargando..." suelto como único indicador.

---

## 2. `BrandLoader` — loader central de marca

`src/shared/components/ui/brand-loader.tsx`. Isotipo (vía `BrandMark`, SVG inline) con pulso sutil (`.animate-brand-pulse`, CSS). **RSC-compatible**: usable en `loading.tsx` sin `"use client"`.

```tsx
import { BrandLoader } from "@/shared/components/ui/brand-loader"

<BrandLoader />                            // tamaño md, sr-only "Cargando"
<BrandLoader size="lg" showLabel label="Preparando tu espacio…" />
<BrandLoader fullScreen />                 // fixed inset-0 bg-background z-50
```

| Prop | Tipo | Default | Nota |
|---|---|---|---|
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | 40/64/96 px |
| `fullScreen` | `boolean` | `false` | Cubre la vista con fondo sólido |
| `label` | `string` | `"Cargando"` | Siempre accesible (`aria-label`) |
| `showLabel` | `boolean` | `false` | Muestra el label bajo el logo |

`BrandMark` (`shared/components/ui/brand-mark.tsx`) es el isotipo SVG inline: renderiza sin fetch, escala sin pixelarse y expone `data-ribbon="coral|violet|amber"` por cinta para animaciones futuras. Su fuente de verdad es `public/brand/isologo-axi-connect.svg` — si el asset cambia, se regeneran los paths.

---

## 3. Skeletons

**Primitivo:** `Skeleton` (`shared/components/ui/skeleton.tsx`) — `bg-accent animate-pulse`, correcto en light/dark.

**Compuestos** (`shared/components/features/loading/`):

| Componente | Para | Props clave |
|---|---|---|
| `TableSkeleton` | Vistas con `DataTable` (header + toolbar + filas) | `rows` (8), `showHeader` |
| `FormSkeleton` | Vistas con `DynamicForm` (grid 2 col + acciones) | `fields` (6), `showHeader` |
| `InboxSkeleton` | Workspace (lista de conversaciones + panel de chat) | `className` |
| `SidebarNavSkeleton` | Menú del `AppSidebar` (interno del sidebar) | — |

Reglas al crear un skeleton nuevo:

1. Replicar la **silueta real** de la vista (mismas alturas de control: `h-9` inputs, `h-4` texto) para que el render final no salte.
2. Anchos **deterministas** (array fijo de porcentajes) — nunca `Math.random()`: el SSR renderiza un ancho y el cliente otro → mismatch de hidratación.
3. `role="status"` + `aria-label` + `aria-busy="true"` en el contenedor, y un `sr-only` descriptivo.
4. Solo tokens semánticos (`bg-accent`, `border-border`); verificar en light y dark.

---

## 4. `loading.tsx` por ruta (obligatorio en rutas privadas)

Toda ruta privada lleva `loading.tsx`; junto con el feedback del sidebar (§5) elimina la sensación de "click muerto". Patrón:

```tsx
// src/app/(private)/settings/users/loading.tsx
import { TableSkeleton } from "@/shared/components/features/loading"

export default function UsersLoading() {
  return <TableSkeleton />
}
```

Mapa actual: `dashboard` → `BrandLoader` (sin estructura estable aún) · `admin/agents`, `settings/{users,roles}` → `TableSkeleton` · `settings/company` → `FormSkeleton` · `workspace`, `workspace/inbox` → `InboxSkeleton`. Cuando el dashboard tenga estructura definitiva, migrarlo a un skeleton estructural.

---

## 5. Feedback de navegación (sidebar)

`nav-item.tsx` usa **`useLinkStatus`** (Next 15.4) dentro de cada `<Link>`: mientras la ruta destino resuelve, el ítem muestra `LoaderCircle` girando. La aparición se difiere ~150 ms con `.animate-delayed-fade-in` (CSS, `globals.css`) para no parpadear en navegaciones instantáneas.

```tsx
function NavLinkSpinner() {
  const { pending } = useLinkStatus()
  if (!pending) return null
  return (
    <span aria-hidden="true" className="ml-auto animate-delayed-fade-in">
      <LoaderCircle className="size-4 animate-spin text-muted-foreground" />
    </span>
  )
}
// … <Link href={url}><Icon /><span>{title}</span><NavLinkSpinner /></Link>
```

Reutilizar este patrón para cualquier link de navegación con destino potencialmente lento.

---

## 6. Splash de entrada a la app ("se entra por el ojo de la α")

`SplashProvider` (`src/core/providers/splash-provider.tsx`), montado en el root layout (por eso sobrevive al swap de layout público → privado). Único loader de pantalla completa por encima de los layouts.

**Puntos de entrada actuales:** el login (`LoginForm`, tras `await login()`) y el CTA del header público (`SiteHeader`, el botón con el nombre del usuario cuando hay sesión activa). Ambos llaman `useSplashOptional().start()` justo antes de navegar.

**Flujo:**

1. `start()` → el overlay cubre todo (`z-[100]`; fondo sólido + glow tricolor separados del logo) → se navega (`router.replace` o `Link`).
2. Fases (animaciones **CSS** en `globals.css`): *entrada* (`splash-in`: `scale 0.85→1` + fade, 0.45 s) → *espera* (pulso `brand-pulse` mientras la app carga) → *salida* (`splash-exit`, 1.1 s): el fondo se retira primero (transición de opacidad, 0.3 s) y el logo escala `1→80` con `transform-origin` en el **ojo de la α** (`44.57% 49.95%` del viewBox) — la app queda visible a través del agujero mientras crece; la opacidad del logo se sostiene el 82% del recorrido y solo el tramo final desvanece.
3. **Por qué CSS y no framer-motion:** `transform`/`opacity` en CSS corren en el compositor, así el zoom no se congela aunque la hidratación de la página destino bloquee el hilo principal (framer anima por rAF en el main thread y ahí el efecto se perdía). Si se ajusta la coreografía, mantener sincronizados `globals.css` y los valores documentales de `core/styles/motion.ts`.
4. `AppReadySignal` (montado en `(private)/layout.tsx`) llama `markReady()` al montar → dispara la salida. Visibilidad mínima 700 ms (la entrada no se corta); timeout de seguridad 8 s (si nadie señala ready, se autodescarta; si la ruta sigue en `/auth/*`, cierra sin animación).
5. **Reduced-motion**: sin zoom — la entrada cae a `fade-in` (media query CSS) y la salida a un crossfade de 300 ms (rama JS del provider).

**API:** `useSplash()` lanza si no hay provider; `useSplashOptional()` devuelve no-ops fuera del provider (tests, piezas compartidas). Usarlo solo para transiciones *hacia* la app (login, CTA de entrada); nunca como loader genérico de datos.

---

## 7. Checklist para una vista nueva

- [ ] ¿La ruta tiene `loading.tsx` (skeleton estructural o `BrandLoader`)?
- [ ] ¿Las acciones (submit, conectar…) muestran spinner inline + `disabled`?
- [ ] ¿El estado de carga usa tokens y se ve bien en light **y** dark?
- [ ] ¿`role="status"` + `aria-label`? ¿Anchos deterministas?
- [ ] ¿Se comporta bien con `prefers-reduced-motion`?
- [ ] ¿Estados vacío y error también cubiertos (DESIGN-SYSTEM §9)?
