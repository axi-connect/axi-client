# DetailSheet (Axi Connect)

Componente de detalle tipo Notion con comportamiento responsive: bottom sheet en mobile y anclado a la derecha en desktop. Incluye animaciones suaves (entrada/salida), bloqueo de scroll del body, focus-trap (Radix Dialog) y soporte de carga diferida (skeleton).

## Características

- Responsive: `bottom` en mobile, `right` en desktop (por defecto con `side="auto"`).
- Cierres: swipe-down (mobile), backdrop, botón cerrar y tecla `Esc`.
- Accesible: `role="dialog"`, `aria-modal="true"`, `Dialog.Title` y `Dialog.Description`, focus-trap automático.
- Animaciones: variantes para `bottom` y `right`; respeta `prefers-reduced-motion`.
- Performante: body scroll lock, render controlado, `fetchDetail` + `skeleton`.

## API

```ts
export type DetailSheetSize = 'xs'|'sm'|'md'|'lg'|'xl'|number

export interface DetailSheetProps<Id extends string | number = string | number> {
  open: boolean
  onOpenChange: (open: boolean) => void
  id?: Id
  title?: React.ReactNode
  subtitle?: React.ReactNode
  side?: 'auto' | 'left' | 'right' | 'bottom'
  responsiveBreakpoint?: number
  size?: DetailSheetSize
  closeOnOverlayClick?: boolean
  closeOnEsc?: boolean
  disableScrollLock?: boolean
  portalTarget?: Element | string | null
  initialFocusRef?: React.RefObject<HTMLElement>
  className?: string
  children?: React.ReactNode
  renderHeader?: () => React.ReactNode
  renderFooter?: () => React.ReactNode
  fetchDetail?: (id: Id) => Promise<any>
  skeleton?: React.ReactNode
}
```

- Breakpoint por defecto: 1024 px
- Desktop ancho por defecto: 420 px
- Mobile altura por defecto: `min(85vh, 760px)`

## Uso básico

```tsx
'use client'
import { useState } from 'react'
import { DetailSheet } from '@/components/detail-sheet'

export function Example() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={()=>setOpen(true)}>Abrir detalle</button>
      <DetailSheet open={open} onOpenChange={setOpen} title="Cliente" subtitle="#123" />
    </>
  )
}
```

## Carga diferida

```tsx
<DetailSheet
  open={open}
  onOpenChange={setOpen}
  id={selectedId}
  fetchDetail={async (id)=>fetch(`/api/customers/${id}`).then(r=>r.json())}
  skeleton={<div className="animate-pulse h-32 bg-secondary rounded" />}
>
  {content}
</DetailSheet>
```

## Accesibilidad

- Usa Radix Dialog para focus-trap y roles ARIA.
- Cierra con ESC, backdrop, botón y swipe-down en mobile.

Si no se pasan `title` o `subtitle`, el componente incluye títulos/descripciones invisibles (`sr-only`) para cumplir con lectores de pantalla.

## Theming

- Usa variables corporativas: `--axi-brand`, `--axi-muted`, `--axi-brand-2` y tokens derivados (`--color-*`).

## Ejemplos

### Básico
```tsx
'use client'
import { useState } from 'react'
import { DetailSheet } from '@/components/detail-sheet'

export function Example() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={()=>setOpen(true)}>Abrir detalle</button>
      <DetailSheet open={open} onOpenChange={setOpen} title="Cliente" subtitle="#123">
        <div>Contenido del detalle…</div>
      </DetailSheet>
    </>
  )
}
```

### Forzar lado en desktop
```tsx
<DetailSheet open={open} onOpenChange={setOpen} side="right" size="lg" />
```

### Portal personalizado
```tsx
<DetailSheet open={open} onOpenChange={setOpen} portalTarget="#portal-root" />
```

### Cambiar `id` sin cerrar
```tsx
// Mantén `open` true y cambia `id`; se volverá a llamar fetchDetail(id) y se verá el skeleton.
```

## Pruebas
- Stack: Jest + React Testing Library + jsdom.
- Casos sugeridos: cierre por backdrop, cierre por `Esc`, skeleton visible al cargar, (opcional e2e) gesto drag en mobile.