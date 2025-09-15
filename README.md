## Axi Connect — CRM + Marketplace de Influencia

Plataforma moderna que integra CRM, automatización de marketing y un marketplace de influencia para conectar empresas con creadores de contenido de forma ágil, estratégica y medible. Construida con Next.js (App Router), React y TypeScript, y un sistema de diseño modular basado en Tailwind CSS, shadcn/ui y Radix UI.

- **Propósito**: potenciar la conexión estratégica entre empresas, creadores y clientes con resultados medibles.
- **Visión**: ser la plataforma CRM más accesible, intuitiva y adaptable de Latinoamérica, reconocida por integrar tecnología, automatización y experiencia de usuario para acelerar el crecimiento de las empresas; a la vez, liderar la gestión de relaciones comerciales y de influencia en LATAM.
- **Valores**: innovación, confianza, claridad, agilidad y resultados.
- **Slogan**: EL FUTURO DEL SERVICIO AL CLIENTE.

### Propuesta de valor
- Un CRM ligero, intuitivo y adaptable al contexto latinoamericano.
- Integración nativa con canales de comunicación (email, chat, WhatsApp, redes sociales).
- Data centralizada en tableros fáciles de usar, con inteligencia para priorizar clientes y oportunidades.
- Modularidad: crece con el negocio, desde el primer usuario hasta equipos completos.
- UX/UI moderna: no se siente “pesado” como otros CRM.
- Impulsado por IA: automatización de la atención al cliente en canales digitales a través de agentes y flujos inteligentes.

### Enfoque para PyMEs
Ofrecemos a pequeñas y medianas empresas una herramienta centralizada para gestionar relaciones, ventas, soporte y marketing, con un diseño moderno, escalable y más efectivo.

## Tabla de contenidos
- Visión general del stack
- Arquitectura de carpetas y rutas
- Theming y tipografías
- Componentes compartidos (Design System)
- DataTable: tabla dinámica con paginado/orden/búsqueda
- DynamicForm: formularios dinámicos tipados
- Módulos de dominio (ej. Companies)
- Servicios HTTP y configuración de entorno
- Guías de desarrollo (scripts, buenas prácticas)
 - Automatización y agentes de IA

---

## Visión general del stack
- **Next.js 15 (App Router)** con React 19 y TypeScript
- **Tailwind CSS 4** con tokens semánticos de tema
- **shadcn/ui + Radix UI** (Button, Dialog, DropdownMenu, Pagination, Table, Tooltip, Sidebar, etc.)
- **framer-motion** para animaciones
- **next-themes** para tema claro/oscuro
- **Iconos**: `lucide-react` y `@heroicons/react`
- **Gestión de formularios**: `react-hook-form` + `zod`
 - **Automatización**: arquitectura preparada para orquestar flujos omnicanal (email, chat, WhatsApp, redes sociales)
 - **IA**: agentes impulsados por IA para atención al cliente y priorización de oportunidades (capacidad planificada/iterativa)

## Arquitectura de carpetas y rutas

Rutas basadas en App Router con grupos de rutas para layouts dedicados.

```text
src/
  app/
    (public)/            # Rutas públicas (landing, marketing)
      layout.tsx         # Layout público (header/footer)
      page.tsx           # Home pública
      marketplace/
        page.tsx         # Página Marketplace (hero)
    (private)/           # Rutas privadas (pos-login)
      layout.tsx         # Layout privado (sidebar, header app)
      dashboard/page.tsx
      companies/
        page.tsx         # Lista de empresas con DataTable
        model.ts         # Modelos/contratos del dominio
        service.ts       # Servicios HTTP del módulo
        form/            # Formulario modular de empresa
          CompanyForm.tsx
          form.config.tsx
        table/
          table.config.tsx
```

- **Layouts**: `src/app/(public)/layout.tsx` y `src/app/(private)/layout.tsx` definen experiencias separadas.
- **SPA navigation**: usamos `next/link` para navegación fluida.

## Theming y tipografías

Tokens de tema globales definidos en `src/app/globals.css` (light/dark) con variables semánticas:

- `--color-background`, `--color-foreground`, `--color-border`, `--color-accent`, `--color-primary`, `--color-secondary`, `--color-ring`, `--color-input`, `--color-destructive`
- Tokens de marca: `--axi-brand`, `--axi-brand-2`, `--axi-muted`

Gestión de tema con `next-themes` en `src/app/layout.tsx` y `src/components/theme-provider.tsx`.

Tipografías en `src/app/layout.tsx`:
- **Nexa (corporativa)**: cargada con `next/font/local` (coloca los archivos en `public/fonts/nexa/`).
- **Poppins (secundaria)**: cargada con `next/font/google`.

Nota en desarrollo (Windows): si ves errores con `@vercel/turbopack-next/internal/font/google/font`, ejecuta el dev server sin Turbopack.

```bash
rm -rf .next # (PowerShell: Remove-Item -Recurse -Force .next)
npm run dev   # script sin --turbopack
```

## Componentes compartidos (Design System)

Ubicados en `src/components` y `src/components/ui`. Principales:

- `site/site-header.tsx`, `site/site-footer.tsx`: encabezado y pie de la web pública, con colores derivados del tema.
- `sections/site-section-logo-cloud.tsx`: sección “Logo Cloud” con partículas compatibles con light/dark.
- `marketplace-hero.tsx`: hero animado para el marketplace.
- `ui/dialog.tsx` y `ui/modal/`: modal accesible con animaciones (scroll interno, protección de cierre accidental).
- `ui/dropdown-menu.tsx`: menú con Radix, cierre por clic externo/Escape.
- `ui/pagination/`: paginación flexible (siblings, boundaries, variantes) con `React.memo`.
- `ui/table.tsx`: primitivos de tabla compatibles con accesibilidad.
- `ui/sidebar.tsx` + `ui/sidebar/core.tsx`: sidebar del área privada con navegación anidada.
- `ui/tooltip.tsx`, `ui/skeleton.tsx`, `ui/alert.tsx`, `ui/progress.tsx`, `ui/separator.tsx`.
- Utilidades: `lib/utils.ts` (helper `cn`).

Todas las superficies están diseñadas para:
- Compatibilidad con tema claro/oscuro via tokens CSS
- Accesibilidad (atributos `aria-*`, roles correctos, `label`/`htmlFor` en formularios)
- Rendimiento (memoización, callbacks estables, observers optimizados)

## DataTable: paginado/orden/búsqueda + responsive

Entrada principal: `src/components/ui/data-table/index.tsx` (ver también `README.md` dentro del directorio).

Características:
- Paginación, ordenamiento y búsqueda controlados desde el servidor.
- Búsqueda con disparo configurable: `debounced` o `submit`.
- Columnas responsivas por ancho disponible, con `alwaysVisible` y soporte de columna de acciones fijada a la derecha.
- Panel colapsable por fila para mostrar columnas ocultas.
- Accesibilidad: `aria-sort`, `aria-live`, estados claros.
- i18n: mensajes personalizables por props.

Uso típico en una página (ej. `src/app/(private)/companies/page.tsx`):

```tsx
<DataTable
  data={rows}
  ref={tableRef}
  columns={companyColumns}
  searchTrigger="submit"
  onSortChange={handleSortChange}
  onPageChange={(p) => load(p)}
  onSearchChange={handleSearchChange}
  pagination={{ pageSize, total }}
  search={{ field: searchField, value: searchValue }}
  sorting={{ by: sortBy as keyof CompanyRow, dir: sortDir }}
/>
```

Definición de columnas (ej. `src/app/(private)/companies/table/table.config.tsx`):

```tsx
export const companyColumns: ColumnDef<CompanyRow>[] = [
  { accessorKey: "name", header: "Empresa", sortable: true, minWidth: 160 },
  { accessorKey: "nit", header: "NIT", sortable: true },
  { accessorKey: "city", header: "Ciudad", sortable: true },
  { accessorKey: "industry", header: "Industria", sortable: true },
  { id: "actions", header: "", alwaysVisible: true, cell: ActionsCell },
];
```

Más detalles en `src/components/ui/data-table/README.md`.

## DynamicForm: formularios dinámicos tipados

Entrada principal: `src/components/dynamic-form/`.

Características:
- Esquemas tipados y configuración declarativa por campo.
- Integración con `react-hook-form` + `zod`.
- Accesibilidad reforzada: generación de `id` únicos por input y vinculación `label` → `htmlFor` (corregido en `components/dynamic-form.fields.tsx`).
- Renderers por tipo de campo y helpers para layouts multi-columna.

Archivos clave:
- `dynamic-form.tsx`, `components/field-renderers.tsx`, `utils/dynamic-form.helpers.ts`.
- Ejemplo real en `src/app/(private)/companies/form/` (`CompanyForm.tsx`, `form.config.tsx`).

Guía rápida (fragmento de config):

```tsx
export const companyFormConfig = createFormConfig({
  fields: [
    { name: "name", label: "Nombre de la empresa", kind: "text", required: true },
    { name: "nit", label: "NIT", kind: "text" },
    { name: "city", label: "Ciudad", kind: "select", options: cities },
    // ...
  ],
});
```

## Módulos de dominio (ej. Companies)

Patrón por módulo bajo `src/app/(private)/<módulo>/`:
- `model.ts`: tipos de UI y contratos de API
- `service.ts`: capa de servicios (fetch, query params, abort)
- `table/`: configuración de DataTable
- `form/`: formulario específico con DynamicForm

Companies implementa paginado/orden/búsqueda y acciones (editar/eliminar) con alertas flotantes y modal.

## Servicios HTTP y configuración de entorno

- `src/services/http.ts`: `HttpClient` genérico (`get`, `post`, `put`, `delete`), maneja query params, headers y `AbortSignal`.
- `src/config/env.ts`: `API_BASE_URL` toma `process.env.NEXT_PUBLIC_API_BASE_URL` o `http://localhost:3001` por defecto.

Variables de entorno necesarias (ejemplo `.env.local`):

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

## Guías de desarrollo

Scripts en `package.json`:

```bash
npm run dev     # Inicia el servidor de desarrollo (sin Turbopack)
npm run build   # Compila para producción
npm run start   # Sirve la build de producción
npm run lint    # Linter
```

Recomendaciones:
- Mantener componentes puros y accesibles; evitar estados profundos, preferir `useMemo`/`useCallback`.
- Respetar los tokens de tema; no usar colores hardcodeados.
- Preferir composición sobre herencia; dividir en subcomponentes/herramientas reutilizables.
- Tipar siempre las APIs públicas y props de componentes.
- Evitar side effects en SSR; usar `"use client"` cuando corresponda.
- Para nuevas tablas, reutilizar `DataTable` y centralizar la lógica de servidor en el servicio del módulo.
- Para nuevos formularios, partir de DynamicForm y su config.

## Automatización y agentes de IA

La plataforma está diseñada para automatizar la atención al cliente y procesos comerciales a través de flujos y agentes potenciados con inteligencia artificial:
- Orquestación omnicanal: WhatsApp, Instagram, Facebook, email y chat web.
- Reglas y disparadores para enrutar, responder y escalar conversaciones.
- Priorización inteligente de clientes y oportunidades basada en datos.
- Integración progresiva con modelos/servicios de IA (etapas del roadmap), manteniendo seguridad y control en la experiencia.

## Roadmap (sugerido)
- Internacionalización (i18n) por módulo
- Testing (unit/integration) de componentes clave
- Monitoreo de rendimiento y métricas de UX
- Documentar patrones avanzados (ej. virtualización de tablas)
 - Conectores nativos a plataformas de mensajería (WhatsApp Business API, Meta, email transaccional)
 - Orquestador visual de flujos con agentes de IA

---

Hecho con Next.js, React y mucho foco en experiencia, performance y accesibilidad.