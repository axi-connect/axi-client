# Plan — Capa pública / GTM de axi connect

## Contexto

El producto está muy por delante del relato: 16 fases construidas, 191 endpoints, 4 aplicaciones de IA, 3 pilotos reales — y una capa pública que no lo comunica. El síntoma medible son **15 rutas internas rotas** en navbar y footer, `/precios` en 404 y un marketplace cuyos dos únicos botones no llevan a ninguna parte.

**Corrección importante del diagnóstico de partida:** la landing **ya fue reconstruida** según `docs/business/landing-copy.md`. Existe `src/modules/landing/` (36 archivos, ~3.500 líneas) con las 12 secciones §1–§11 montadas, copy centralizado en `ui/content/landing.content.ts`, **cero violaciones del design system y 0 warnings de lint**. Los precios ancla en COP ya están puestos (`landing.content.ts:497,514`).

Lo que está roto es **todo lo que rodea a la home**: el header y el footer siguen siendo la plantilla original, no existen las páginas a las que apuntan, y el árbol legacy `layout/site/{hero,sections,components,legacy}` concentra el 100% de los hex sueltos y de la falta de `prefers-reduced-motion` de la capa pública.

`docs/business/knowledge-base.md §17.2` y `axi-client/docs/modules/public-site.md` describen un estado anterior al de la landing actual: se corrigen al final (Fase 9).

**Resultado esperado:** un visitante anónimo puede descubrir axi, entender qué hace, ver cuánto cuesta, profundizar en el producto y pedir una demo — sin un solo enlace roto y sin hablar con nadie del equipo.

---

## Decisiones tomadas (2026-08-03)

| Decisión | Elegido |
|---|---|
| Alcance | Núcleo de conversión **+ `/productos` como fase propia** |
| Home (12 secciones existentes) | **Intacta.** No se toca hero (kicker sigue comentado), prueba social, casos ni ninguna sección. Solo se **añaden** dos piezas nuevas |
| `/precios` | Redirect a `/#planes` (la sección ya tiene los precios ancla) |
| `/demo` | Redirect a `/contacto` |
| Captura de leads | **Nada de backend.** El form sigue simulado + `wa.me`. Se entrega el contrato del endpoint como requerimiento para axi-server |
| Navbar | Se conserva la estructura actual (Productos▾ · Soluciones▾ · Marketplace · Precios) con destinos reales, accesible por teclado/táctil, y **más blur para legibilidad** |
| Soluciones | Una página `/soluciones` con 4 anclas (califica · cierra · retiene · agenda) |
| Árbol legacy | **No se borra.** Es la plantilla visual de `/productos` (fondo estrellado). Se sanea: colores, lint, reduced-motion |
| Marketplace | Se mantiene con badge "Pronto"; CTAs a `/contacto?origen=marketplace` |
| Secciones nuevas en la home | Comparativa vs competidores · Barra de CTA fija en móvil |
| Footer | Podado + páginas legales + contacto + **bloque "Fundado y soportado por Kodecol"** |

---

## Mapa de rutas objetivo

| Ruta | Estado hoy | Acción |
|---|---|---|
| `/` | ✅ landing completa | **Intacta** + 2 secciones nuevas |
| `/productos` | ❌ 404 (`/products`) | **Nueva** — fondo estrellado, capacidades del producto |
| `/soluciones` | ❌ 404 (`/solutions`) | **Nueva** — 4 trabajos con anclas |
| `/contacto` | ❌ 404 | **Nueva** — form + WhatsApp del agente + datos |
| `/legal/terminos` · `/legal/privacidad` | ❌ 404 (`/legal`) | **Nuevas** |
| `/precios` | ❌ 404 | **Redirect** → `/#planes` |
| `/demo` | — | **Redirect** → `/contacto` |
| `/marketplace` | ⚠️ hero con 2 CTAs 404 | Badge "Pronto" + CTAs reales + bugs |
| `not-found.tsx` | ❌ no existe | **Nuevo** — 404 de marca |
| `/blog` `/ayuda` `/about` `/seguridad` `/casos` `/soluciones`(footer) `/login` `/signup` `/marketplace/browse` `/products` `/solutions` `/recursos` | ❌ 404 | **Se eliminan del navbar y del footer** |

> ⚠️ **Bloqueante absoluto:** `PUBLIC_PATHS` en `src/core/config/routes.ts:5` solo exime `/` y `/marketplace`. Sin añadir las rutas nuevas, el middleware (`src/middleware.ts:9-17`) **redirige al login a todo visitante anónimo** — peor que un 404: parece un muro de pago. Va en la Fase 1.

---

## Plan general — 9 fases, 9 PRs

```
F1 Cimientos ──┬─→ F2 Navbar ──→ F3 Footer + Kodecol
   (bloquea      ├─→ F4 /contacto + legal
    todo)        ├─→ F5 /soluciones
                 ├─→ F6 /productos  (sanea el legacy)
                 ├─→ F7 Home: comparativa + CTA móvil
                 └─→ F8 Marketplace "Pronto"
                                        └─→ F9 SEO + QA + docs
```

F1 crea **stubs navegables** de `/productos`, `/soluciones`, `/contacto` y `/legal/*` (heading + CTA a demo) para que **ningún PR intermedio deje un enlace roto**. F2–F8 son independientes entre sí y pueden ir en cualquier orden tras F1.

### Gobernanza de las fases (decidido el 2026-08-03)

**Este documento es el plan general y el contrato de alcance, no la especificación de cada vista.**

| Fases | Estado | Cómo se ejecutan |
|---|---|---|
| **F1 – F4** | ✅ **IMPLEMENTADAS** (2026-08-03) | Eran transversales (cimientos, navbar, footer, contacto/legal): la especificación de este documento bastó |
| **F5 – F9** | **Requieren su propio plan de fase** | Cada una se profundiza en un documento aparte antes de escribir código |

**Verificación de F1–F4 (ejecutada):** `tsc --noEmit` limpio · `eslint` 0 errores en todo
lo tocado · `npm run build` verde · los 7 redirects devuelven 308 al destino correcto ·
las 8 rutas públicas devuelven 200 **sin cookies** (y `/dashboard` sigue devolviendo 307 al
login, o sea el guard no se debilitó) · los 21 `href` de navbar y footer resuelven 200 ·
las 15 anclas referenciadas existen en el DOM.

**Matiz del 404 de marca:** `not-found.tsx` se renderiza en rutas bajo un prefijo de
`PUBLIC_PATHS` (`/legal/xyz`, `/productos/nada`, y el antiguo `/marketplace/browse`), pero
un path desconocido de primer nivel (`/blog`) lo intercepta antes el middleware y va al
login. Es el diseño fail-closed de `architecture.md` §8: invertirlo a fail-open para ganar
el 404 haría que una ruta privada nueva sin registrar quedase pública. No se toca aquí —
es una decisión de seguridad, no de GTM.

Para F5–F9, lo que hay en este documento (mockup ASCII + dirección de UX/UI) es el **punto de partida**, no el entregable. Cada fase abre su propio `docs/plans/public-gtm-f<N>-<nombre>.md` con mockup detallado, copy definitivo, inventario de componentes a reutilizar vs construir, y sus decisiones cerradas — y se aprueba antes de implementar. Es el mismo flujo de phase-gate del CRM (`crm_frontend_plan.md`).

Orden sugerido de profundización: **F6 `/productos`** (la de mayor superficie y la que más producto comunica) → **F5 `/soluciones`** → **F7 home** → **F8 marketplace** → **F9 cierre**.

---

## F1 — Cimientos (bloquea todo lo demás)

**Archivos:** `src/core/config/routes.ts`, `src/middleware.ts`, `src/app/(public)/layout.tsx:16`, `src/app/layout.tsx:60`, `src/shared/components/ui/button.tsx:13`, `src/app/globals.css`, `package.json`, `next.config.ts`, + stubs y redirects nuevos.

1. **`PUBLIC_PATHS`** → añadir `/productos`, `/soluciones`, `/contacto`, `/legal`, `/precios`, `/demo`. Es la línea que decide si la capa pública existe para un anónimo.
2. **Redirects** en `next.config.ts` (`redirects()`): `/precios` → `/#planes` (permanente), `/demo` → `/contacto` (permanente), y los legacy `/products` → `/productos`, `/solutions` → `/soluciones`, `/login` → `/auth/login`.
3. **Stubs** de `/productos`, `/soluciones`, `/contacto`, `/legal/terminos`, `/legal/privacidad` — RSC mínimo con `metadata` + `<h1>` + CTA a demo.
4. **`not-found.tsx`** de marca en `src/app/` — `BrandMark` + "Esta página no existe" + botones a `/` y `/contacto`.
5. **`tw-animate-css`** — instalar y añadir `@import "tw-animate-css";` a `globals.css`. Sin él, `ui/popover.tsx:33`, `ui/sheet.tsx:39,61`, `ui/tooltip.tsx:49` y `ui/select.tsx:64` **no animan nada** (las clases `animate-in`/`fade-in-0`/`slide-in-from-*` no existen en el proyecto). Bloquea la calidad percibida de cualquier overlay.
6. **`w-screen` → `w-full`** en `(public)/layout.tsx:16`. `100vw` incluye la barra de scroll → hoy hay ~15px de **scroll horizontal en toda la landing**.
7. **`button.tsx:13`** — la variante `default` combina `bg-brand-gradient` (background-image) con `hover:bg-primary/90` (background-color): el `background-image` lo tapa y **el botón primario no tiene hover visible en toda la app**. Cambiar el hover a un filtro (`hover:brightness-110`) o a un gradiente de hover.
8. **`<html lang="en">` → `lang="es"`** en `app/layout.tsx:60`. El sitio es íntegramente español y el propio metadata declara `locale: "es_CO"` (`layout.tsx:47`).
9. **Assets locales:** mover el isotipo a `public/images/brand/` y dejar de servirlo desde Cloudinary en `SiteHeader.tsx:146`, `SiteFooter.tsx:31` y `auth/login/page.tsx:5` — hoy es un request externo en el critical path del LCP. **Debe ir bajo `images/`**, no bajo `public/brand/`: el matcher del middleware (`middleware.ts:22`) solo exime `_next|api|favicon.ico|assets|fonts|images`, así que `public/brand/*` es inservible para un visitante anónimo.

**Verificación:** en `npm run dev`, visitar cada ruta nueva **sin cookies** (ventana privada) y comprobar que no redirige a `/auth/login`; `curl -I localhost:3001/precios` devuelve 308 a `/#planes`; abrir un `Select` y ver que anima; DevTools sin scroll horizontal en `/`.

---

## F2 — Navbar (`SiteHeader.tsx`)

> ⚠️ **SUPERADO el 2026-08-24 por `navigation_standardization_plan.md`.** Lo que
> sigue describe el saneamiento de F2, que se ejecutó y sigue siendo la razón de
> ser de los destinos actuales — pero **la decisión de no instalar
> `navigation-menu` de Radix quedó revertida**: el nav es ahora un mega-menú
> sobre ese primitivo, con tres paneles (Producto, Soluciones, Integraciones) y
> `/precios`, `/casos` e `/integraciones` como páginas propias. Se conservó
> íntegro lo que F2 ganó: apertura por hover **y** por click/teclado, cierre con
> `Escape`, `glass-overlay` en el panel, CTA sensible a la sesión con
> `splash.start()`, badge «Pronto» y bloqueo de scroll en móvil (ahora lo aporta
> el `Sheet`). El redirect `/precios → /#planes` se retiró de `next.config.ts`.


**Archivo:** `src/shared/components/layout/site/SiteHeader.tsx` (304 líneas). Se conserva la estructura, el gradiente del logo, el comportamiento de scroll con `.glass` y las animaciones — solo cambian destinos, accesibilidad y opacidad del material.

### Qué está mal hoy

| Problema | Línea |
|---|---|
| `Productos` → `/products` (404); sus 3 hijos → `/blog`, `/casos`, `/ayuda` (404) y los **labels no corresponden a los hrefs** ("CRM + IA" → `/blog`) | `:24-30` |
| `Soluciones` → `/solutions` (404); 4 hijos a 3 rutas inexistentes con **descripciones copiadas de otro menú** ("Ideas y actualizaciones") | `:34-41` |
| `Precios` → `/precios` (404) | `:44` |
| CTA principal → `/workspace/inbox`: sin sesión el middleware **rebota al login**. Un visitante nuevo no tiene camino a la demo | `:220` |
| CTAs móviles **distintos y rotos**: `/login` y `/signup` | `:284,290` |
| Dropdowns **hover-only** sobre `<div>`: inaccesibles por teclado y en táctil | `:159-162` |
| Botón hamburguesa **sin `aria-label`/`aria-expanded`/`aria-controls`** — el icon-button más importante de la landing es invisible para lectores de pantalla | `:233-243` |
| Menú móvil sin `role="dialog"`, sin focus trap, sin cierre con `Escape`, sin bloqueo de scroll | `:256-262` |
| `mobileItemVariants` (`:58-61`) se aplica sin `staggerChildren` en el padre → los ítems animan todos a la vez; el `x: 20` es ruido | `:266,279` |
| Menú móvil `w-80` fijo con `right-4` → se sale en pantallas de 320px | `:257` |

### Estructura nueva

```
┌──────────────────────────────────────────────────────────────────────────┐
│  α axi connect     Productos ▾  Soluciones ▾  Precios  Marketplace·Pronto│
│                                        ☀◐☾ · Iniciar sesión · [Agenda tu demo →]│
└──────────────────────────────────────────────────────────────────────────┘

Productos ▾ (glass-overlay, w-72)          Soluciones ▾ (glass-overlay, w-72)
┌────────────────────────────────────┐     ┌──────────────────────────────────────┐
│ Agente vendedor                    │     │ Califica leads                       │
│   Cotiza y cierra en el chat       │     │   Sin perseguir a nadie              │
│ Inbox y handoff                    │     │ Cierra ventas                        │
│   Tu equipo entra sin fricción     │     │   Dentro de la conversación          │
│ CRM, leads y contactos             │     │ Retiene clientes                     │
│   El pipeline se llena solo        │     │   Y recupera lo que se enfrió        │
│ Catálogo y agenda                  │     │ Programa reuniones                   │
│   Stock real, citas reales         │     │   Sobre disponibilidad real          │
│ Medición en pesos                  │     └──────────────────────────────────────┘
│   Cuánto vendió cada chat          │      → /soluciones#califica · #cierra
└────────────────────────────────────┘        #retiene · #agenda
 → /productos#agente · #inbox · #crm
   #catalogo · #medicion

Móvil (glass-overlay, w-[min(20rem,calc(100vw-2rem))])
┌────────────────────────────────┐
│ Productos                    ▾ │  ← acordeón, no enlace plano:
│   · Agente vendedor            │    los hijos son alcanzables en móvil
│   · Inbox y handoff            │
│   · CRM, leads y contactos     │
│   · Catálogo y agenda          │
│   · Medición en pesos          │
│ Soluciones                   ▾ │
│ Precios                        │
│ Marketplace            [Pronto]│
├────────────────────────────────┤
│          ☀ ◐ ☾                 │
│ Iniciar sesión                 │  ← /auth/login (no /login)
│ [ Agenda tu demo ]             │  ← /contacto (no /signup)
└────────────────────────────────┘
```

### UX / UI

- **`Inicio` desaparece** del nav: el logo ya cumple esa función y la entrada gasta espacio.
- **`Precios` → `/#planes`** (o `/precios`, que redirige). Se mantiene la etiqueta porque es el término que la gente busca.
- **`Marketplace`** con un `Badge variant="secondary"` "Pronto" al lado — comunica ambición sin prometer.
- **CTA primario → `/contacto`**, etiqueta **"Agenda tu demo"**. Con sesión activa, se conserva el comportamiento actual: etiqueta con el nombre del usuario, destino `/workspace/inbox` y `splash.start()` (`:225`). Un visitante nuevo y un usuario logueado no quieren lo mismo.
- **Legibilidad del dropdown (petición explícita):** cambiar `glass` → **`glass-overlay`** en el panel (`:177`). Es el token que el design system ya define para "más opaco para legibilidad" (`DESIGN-SYSTEM.md §5.1`: 80% de fondo, blur 20px, frente al 65%/16px de `.glass`) — no hace falta CSS nuevo. Si tras verlo sigue insuficiente, el siguiente paso es subir los valores de `.glass` en `globals.css:147` (ojo al alcance: afecta también a header, sidebar, popovers y tooltips de toda la app — cambio deliberado, en su propio commit).
- **Accesibilidad de los dropdowns sin cambiar el aspecto:** se conserva el componente propio (instalar `navigation-menu` de Radix cambiaría el markup y el look que ya se aprobó). Se añade: el disparador pasa a `<button aria-expanded aria-haspopup="menu" aria-controls>`; abre en `hover` **y** en `click`/`focus`; cierra con `Escape` y al salir el foco del subárbol; `ArrowDown`/`ArrowUp` recorren los ítems. El padre deja de ser un `Link` navegable a una página que ya no existe.
- **Menú móvil:** acordeones para los dos ítems con hijos, `role="dialog"` + `aria-modal`, cierre con `Escape`, y **reutilizar `useBodyScrollLock`** (`src/shared/components/features/detail-sheet/hooks/useBodyScrollLock.ts`) en lugar de reimplementarlo. Ancho `min(20rem, calc(100vw - 2rem))`.
- **Botón hamburguesa:** `aria-label="Abrir menú"` / `"Cerrar menú"`, `aria-expanded`, `aria-controls`.
- **Scroll listener** (`:95`) con `{ passive: true }`.
- Presets de `core/styles/motion.ts` en todo (ya lo hace en `:126,143,182`); las `duration-200/300` sueltas de `:132,165,169,187,213,221,234,268,285,291` se dejan como están — son transiciones CSS de color, no coreografía.

---

## F3 — Footer (`SiteFooter.tsx`) + bloque Kodecol

**Archivo:** `src/shared/components/layout/site/SiteFooter.tsx` (91 líneas) + nuevo `site/content/kodecol.content.ts`.

### Qué está mal hoy

- **9 de 11 enlaces internos son 404**: `/soluciones`, `/precios`, `/about`, `/contacto`, `/casos`, `/blog`, `/ayuda`, `/seguridad`, `/legal` (`:57-81`).
- **Las 3 redes sociales apuntan a `href="#"`** (`:40,43,46`).
- `/dashboard` (`:60`) en un footer público: sin sesión rebota al login.
- `.footer-glass` con `styled-jsx global` (`:10-22`) sobre una superficie de **contenido** — glass ad-hoc fuera del sistema, con `transition: all 0.3s`. Se conserva (es identidad visual, ya renombrada tras el bug de secuestro de `.glass`) pero se acota la transición a las propiedades del material.
- Dos divs de blur comentados (`:24-25`) y un contenedor vacío (`:23-26`) — se limpian.

### Estructura nueva

```
┌────────────────────────────────────────────────────────────────────────────┐
│                          (footer-glass, max-w-6xl)                          │
│  α axi connect                     Producto      Empresa       Legal        │
│  Donde la tecnología entiende      Cómo funciona  Contacto      Términos    │
│  a las personas y las empresas     Productos      Casos         Privacidad  │
│  se vuelven más humanas.           Soluciones                               │
│                                    Planes                                   │
│  [in] [ig]  ← solo las reales      Preguntas                                │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│  ·  ·  ·   fondo con puntos sutiles, acento violeta   ·  ·  ·               │
│                                                                             │
│     ┌──────┐   Fundado y soportado por                                      │
│     │ LOGO │   K O D E C O L                              [ Ver su web → ] │
│     └──────┘   Fábrica de software que construye producto,                  │
│                no proyectos.                                                │
│                                              [in] [ig] [beh]                │
└────────────────────────────────────────────────────────────────────────────┘

              © 2026 Axi Connect · Colombia · Términos · Privacidad
```

### UX / UI del bloque Kodecol

Es publicidad, así que tiene que **sentirse como una credencial, no como un banner pegado**. Dirección:

- **Banda propia bajo el footer principal**, separada por un `border-t border-border/60`, con su propio fondo: `bg-muted/40` en light y un `color-mix` sutil en dark, más un patrón de puntos muy tenue (`radial-gradient` en `background-image`, opacidad ≤6%).
- **Acento violeta** (`--color-accent-violet`), no coral: el coral es de Axi. Así el bloque se lee como una firma de otra marca sin competir con la principal, y respeta la regla de "una vista no mezcla los tres acentos" (`DESIGN.md §3.1`) porque el footer no usa ámbar.
- **Kicker en `text-xs uppercase tracking-widest text-muted-foreground`** ("Fundado y soportado por") + **nombre en Nexa grande** (`text-2xl font-heading`) — la jerarquía la hace la tipografía, no el color.
- **Logo** en `next/image` con `TiltCard`-lite (o simple `hover:scale-105` con `spring.snappy`): un guiño de movimiento, nada más.
- **Un solo CTA** (`Button variant="outline"`, `rel="noopener noreferrer"`, `target="_blank"`) — "Ver su web". No dos.
- **Redes** como icon-buttons con `aria-label`, mismo tratamiento que las de Axi.
- Todo el contenido en **`site/content/kodecol.content.ts`**, mismo patrón que `landing.content.ts`:

```ts
export const KODECOL = {
  name: "Kodecol",
  kicker: "Fundado y soportado por",
  claim: "",                                  // ← pendiente
  url: "",                                    // ← pendiente
  logoSrc: "/images/brand/kodecol.svg",       // ← pendiente el archivo
  ctaLabel: "Ver su web",
  socials: [] as { label: string; href: string; icon: "linkedin" | "instagram" | "behance" }[],
} as const;
```

Con `url` vacío el bloque **no renderiza el CTA**, y sin `logoSrc` cae a wordmark tipográfico — mismo patrón de degradación que `BrandLogo.tsx:33-44`. Así el PR entra sin datos y se activa editando un objeto.

> **Insumos que necesito de ti:** URL del sitio, claim de una línea, archivo del logo (SVG preferible) y las redes.

---

## F4 — `/contacto` + páginas legales

**Nuevos:** `src/app/(public)/contacto/page.tsx`, `src/app/(public)/legal/{terminos,privacidad}/page.tsx`, `src/app/(public)/legal/layout.tsx`.

```
/contacto                                    (RSC + form cliente)
┌────────────────────────────────────────────────────────────────┐
│  Míralo funcionando con un negocio como el tuyo                │
│  30 min · una venta completa del "hola" al pago verificado ·    │
│  sin diapositivas                                              │
├───────────────────────────────┬────────────────────────────────┤
│  Agenda tu demo               │  ¿Prefieres verlo ahora?       │
│  ┌─────────────────────────┐  │  Nuestro propio agente atiende │
│  │ Nombre                  │  │  este WhatsApp. Pregúntale lo  │
│  │ Nombre de tu negocio    │  │  que quieras — incluido el     │
│  │ WhatsApp                │  │  precio.                       │
│  │ Conversaciones al mes ▾ │  │                                │
│  │      [ Agendar ]        │  │  [ ◉ Chatear con el agente ]   │
│  └─────────────────────────┘  │                                │
│  Te escribimos por WhatsApp   │  ────────────────────────────  │
│  el mismo día.                │  Axi Connect · Colombia        │
│                               │  hola@… · +57 …                │
└───────────────────────────────┴────────────────────────────────┘
                    [ Ver los planes → /#planes ]
```

**UX / UI**

- **Reutiliza `DemoLeadForm`** (`src/modules/landing/ui/forms/DemoLeadForm.tsx`) y su config Zod (`forms/config/demo-lead.config.tsx`) sin duplicar nada. Los 4 campos y la validación ya existen.
- **Superficie sólida, no glass**: `bg-card border border-border rounded-xl`. Es un formulario — `DESIGN.md §5.1` lo prohíbe explícitamente sobre glass. (Nota relacionada: en la home, `LandingFinalCta.tsx:49` monta el mismo form sobre `.glass-overlay` encima de un canvas WebGL. Es la peor legibilidad posible del sitio, pero **la home queda intacta por decisión tomada** — se anota como deuda conocida en la Fase 9.)
- Sin `BrandGradientCanvas` aquí: la página no compite con la home, y son dos contextos WebGL menos.
- El copy sale de `landing.content.ts` (§11 ya está escrito) — se extrae a una constante compartida en lugar de copiarlo.
- **Enlace a `/legal/privacidad`** bajo el botón: el form captura datos personales y en Colombia (Ley 1581) el aviso es exigible.
- `metadata` propio con `title`, `description` y `alternates.canonical`.

**Legales:** dos páginas de prosa (`prose`-like con clases del sistema, `max-w-[720px]`, `text-base leading-relaxed`), layout compartido con título + fecha de última actualización + enlace cruzado entre ambas. Contenido de partida redactado a partir de lo que el producto realmente hace (aislamiento multi-tenant, retención 13/12/6 meses de `knowledge-base.md §15.5`, qué datos se capturan en el form). **Requiere revisión legal antes de publicar** — se marca en el propio documento.

---

## F5 — `/soluciones`

**Nuevo:** `src/app/(public)/soluciones/page.tsx` + `src/modules/landing/ui/sections/solutions/*` + contenido en `ui/content/solutions.content.ts`.

```
/soluciones
┌────────────────────────────────────────────────────────────────┐
│  Cuatro trabajos que Axi hace por ti                           │
│  El mismo producto, cuatro formas de usarlo.                   │
└────────────────────────────────────────────────────────────────┘

#califica  ┌──────────────────────────┬──────────────────────────┐
           │ Califica leads sin       │  ┌────────────────────┐  │
           │ perseguir a nadie        │  │ ChatConversation   │  │
           │                          │  │ (reutilizado)      │  │
           │ · Responde en segundos   │  │  cliente: ¿precio? │  │
           │ · Captura los datos      │  │  agente: …         │  │
           │ · Abre la oportunidad    │  └────────────────────┘  │
           │   en el pipeline solo    │                          │
           └──────────────────────────┴──────────────────────────┘

#cierra    ┌──────────────────────────┬──────────────────────────┐
           │  ┌────────────────────┐  │ Cierra ventas dentro     │
           │  │ SalePaidCard       │  │ de la conversación       │
           │  │ Venta pagada       │  │ · Cotiza con tus precios │
           │  │ $86.500            │  │ · Pedido con consecutivo │
           │  └────────────────────┘  │ · Pago verificado por ti │
           └──────────────────────────┴──────────────────────────┘

#retiene   ┌──────────────────────────┬──────────────────────────┐
           │ Retiene y recupera       │  ┌────────────────────┐  │
           │ · Contacto unificado     │  │ FunnelPreview      │  │
           │   entre canales          │  │ ▓▓▓▓▓▓░░ abandono  │  │
           │ · Ciclo de vida          │  └────────────────────┘  │
           │ · Sabemos qué se cayó    │                          │
           └──────────────────────────┴──────────────────────────┘

#agenda    ┌──────────────────────────┬──────────────────────────┐
           │  ┌────────────────────┐  │ Programa reuniones y     │
           │  │  L M M J V S D     │  │ citas sobre tu           │
           │  │  · ● · ● · · ·     │  │ disponibilidad real      │
           │  │  9:00 ✓  11:30 ✓   │  │ · Horario del negocio    │
           │  └────────────────────┘  │ · Recordatorios 24h y 1h │
           └──────────────────────────┴──────────────────────────┘

                    [ Agenda tu demo → /contacto ]
```

**UX / UI**

- **Ritmo en zigzag** (texto izquierda / visual derecha, alternando) — el patrón que ya usa `LandingTeamControl`.
- **Reutilizar los mockups existentes** de `src/modules/landing/ui/components/mockups/`: `ChatConversation`, `SalePaidCard`, `FunnelPreview`. **Solo hay que construir uno nuevo**: el mini-calendario de disponibilidad (`AvailabilityPreview`), en el mismo estilo que `FunnelPreview`.
- `SectionHeading` + `Reveal` + `TiltCard` ya existen y se reutilizan tal cual.
- **`scroll-mt-24`** en cada `id` para que las anclas del navbar no queden bajo el header fijo — mismo patrón que `landing.content.ts:32-39`.
- Sin gradiente tricolor: está reservado a hero de la home y CTA final (`DESIGN.md §3.2`). Acento de vista: **coral**, sin violeta ni ámbar.
- Un solo CTA al final, a `/contacto`.

---

## F6 — `/productos` (fondo estrellado) + saneamiento del legacy

**Nuevo:** `src/app/(public)/productos/page.tsx`.
**Se reutiliza y sanea:** `site/hero/SiteHero.tsx`, `site/sections/SiteFramework.tsx`, `site/sections/SiteInboxShowcase.tsx`, `site/sections/SiteLogoCloud.tsx`, `site/components/{particles,spotlight}.tsx`.

Esta es la página que cuenta **todo lo que el producto ya hace y hoy no se comunica**: las 16 herramientas del agente, el inbox con handoff, el CRM con leads y contactos (construido en backend, sin pantalla todavía), el catálogo nivel ERP, la agenda y la medición.

```
/productos
┌────────────────────────────────────────────────────────────────┐
│   ·  ✦   ·      ✦    ·   ·      ✦   ·    (Particles + Spotlight)│
│                                                                 │
│              ┌──────────────────────────────┐                   │
│              │ α  16 herramientas reales  → │  ← badge          │
│              └──────────────────────────────┘                   │
│                                                                 │
│           Todo lo que Axi ya hace                               │
│           por tu negocio                                        │
│                                                                 │
│     No es una promesa de roadmap. Es producto construido,       │
│     en producción, con tres negocios vendiendo hoy.             │
│                                                                 │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐                        │
│   │   16     │ │    4     │ │    9     │  ← CountUpNumber       │
│   │Herramien.│ │  IAs     │ │ métricas │     (reutilizado)      │
│   │del agente│ │distintas │ │ medidas  │                        │
│   └──────────┘ └──────────┘ └──────────┘                        │
│                                                                 │
│         [ Agenda tu demo ]   [ Ver los planes ]                 │
└────────────────────────────────────────────────────────────────┘

#agente  ── El agente vendedor ─────────────────────────────────
┌──────────────────────────────┬────────────────────────────────┐
│ Se configura, no se programa  │  ┌──────────────────────────┐  │
│                               │  │ catalog_lookup      ✓    │  │
│ Agente · Personalidad ·       │  │ quote_order         ✓    │  │
│ Intención · Playbook          │  │ create_order        ✓    │  │
│                               │  │ get_payment_methods ✓    │  │
│ Las herramientas se cargan    │  │ report_payment      ✓    │  │
│ según lo que tu negocio       │  │ book_appointment    ✓    │  │
│ tiene de verdad: sin catálogo,│  │ open_deal           ✓    │  │
│ no ofrece productos.          │  │ … 16 en total            │  │
│                               │  └──────────────────────────┘  │
└──────────────────────────────┴────────────────────────────────┘

── El framework: Conecta · Aprende · Actúa · Escala ────────────
        (SiteFramework saneado, con las 3 capturas reales)
┌───────────────────────────┬───────────────────────────────────┐
│ ● Conecta   Todo en uno   │  ┌─────────────────────────────┐  │
│ ○ Aprende   De tus datos  │  │  captura real del producto  │  │
│ ○ Actúa     Acelera       │  │  (agents-cover /            │  │
│ ○ Escala    Con confianza  │  │   conversation-cover /      │  │
│   ▓▓▓▓▓░░░░ auto 8s        │  │   notification-cover)       │  │
└───────────────────────────┴───────────────────────────────────┘

#inbox   ── Inbox y handoff ──── (InboxPreview reutilizado)
#crm     ── CRM: leads, contactos y oportunidades ──────────────
┌────────────────────────────────────────────────────────────────┐
│  El pipeline se llena mientras el agente conversa              │
│  ┌────────┬────────┬────────┬────────┐                         │
│  │Prospec.│  Lead  │Cotizado│Cliente │  ← etapas               │
│  │  ▓▓▓   │  ▓▓▓▓  │  ▓▓    │  ▓▓▓   │                         │
│  └────────┴────────┴────────┴────────┘                         │
│  · Contacto unificado entre canales, con puntuación explicable │
│  · El agente abre la oportunidad y registra la actividad solo  │
│  · Copiloto de IA para tu vendedor: resume, sugiere, redacta   │
└────────────────────────────────────────────────────────────────┘

#catalogo ── Catálogo nivel ERP + agenda ──────────────────────
#medicion ── Medición ──── (LaptopMockup + StatTile reutilizados)

                    [ Agenda tu demo → /contacto ]
```

### UX / UI

- **El fondo estrellado es la identidad de esta página** (petición explícita): `Particles` (`quantity={100}`, color por token) + `Spotlight`, solo en el hero — no en toda la página, o el scroll se vuelve pesado.
- **`SiteFramework` es la pieza más valiosa del legacy**: ya tiene las **tres únicas capturas reales del producto** que existen (`SiteFramework.tsx:16,23,8` → `agents-cover`, `conversation-cover`, `notification-cover` en Cloudinary). Se reutiliza el patrón y se reasignan las capturas a las capacidades correctas.
- **Reutilizar de `modules/landing`**: `SectionHeading`, `Reveal`, `TiltCard`, `CountUpNumber`, `InboxPreview`, `LaptopMockup`, `StatTile`, `ChatConversation`. No se construye nada que ya exista.
- **Nuevo**: el visual del pipeline de CRM (`PipelinePreview`, mismo lenguaje que `FunnelPreview`) y la lista de herramientas del agente (`ToolsChecklist`).
- **Honestidad de estado**: el CRM está construido en backend pero **sin pantalla** (`knowledge-base.md §18.1`). El copy describe lo que el sistema hace (el agente abre oportunidades, registra actividades), no una interfaz que el cliente vaya a ver mañana. Nada de Instagram/Messenger prometido como disponible sin decidirlo antes (`landing-copy.md`, checklist).
- Acento de vista: **coral**, con violeta permitido solo en la sección de medición (coherente con `LandingMetrics`).

### Saneamiento obligatorio del legacy (parte del mismo PR)

| Archivo | Arreglo |
|---|---|
| `SiteFramework.tsx:82,106,125` | **Magenta `rgb(192,15,102)` ajeno a la marca**, 3 veces → `color-mix` con `--axi-brand` |
| `SiteFramework.tsx:138` | `<img>` → `next/image` (warning de lint, LCP) |
| `SiteInboxShowcase.tsx:34,44` | **`hsl(var(--primary))`: token que no existe** (el proyecto define `--color-primary`) → los dos gradientes no pintan nada. Resto de shadcn v3 sobre Tailwind v4 |
| `SiteInboxShowcase.tsx:29,39` | `animate-gradient-x`: **clase inexistente** en el proyecto |
| `SiteInboxShowcase.tsx:100,103` | `border-neutral-100/600`, `bg-white`, `border-6` (escala inválida) → tokens semánticos |
| `SiteInboxShowcase.tsx:94` | `<img>` → `next/image` |
| `SiteHero.tsx:176` | `rgba(255,255,255,0.3)` → `color-mix` sobre `--foreground`; y `bg-gradient-to-b bg-brand-gradient` son **utilidades mutuamente excluyentes** (ambas escriben `background-image`) → dejar una |
| `SiteHero.tsx:81` | `dark:bg-gradient-to-b`: el gradiente **solo existe en dark**; en light hay `bg-clip-text text-transparent` sin `background-image` |
| `SiteHero.tsx:206-226` | `@keyframes float` en `styled-jsx global` duplicando `hero-float` de `globals.css:271` → usar el del sistema |
| `SiteHero.tsx:31-41` | Form de lista de espera **simulado** que no lleva a ningún sitio → sustituir por los dos CTA de la página |
| `particles.tsx:142,146,150` | **3 warnings de `react-hooks/exhaustive-deps`** (los únicos del proyecto junto a los 2 de `<img>`) |
| `particles.tsx` | **Sin `prefers-reduced-motion`**: es la única animación de la capa pública que lo ignora. Añadir `useReducedMotion` → un frame estático, como hace `BrandGradientCanvas.tsx:246-250` |
| `SiteFramework.tsx:52-63` | `setInterval` de 100ms con `progress` en las deps → recrea el timer 10 veces/s. Pasar a un `requestAnimationFrame` o a deps estables, y **pausar con reduced-motion** |

Al terminar F6, `npm run lint` debe salir con **0 warnings** en toda la capa pública (hoy 5).

---

## F7 — Home: dos adiciones (sin tocar las 12 secciones)

**Archivos:** `src/app/(public)/page.tsx` (solo inserta), `src/modules/landing/ui/sections/LandingComparison.tsx` (nuevo), `src/modules/landing/ui/components/MobileCtaBar.tsx` (nuevo), `ui/content/landing.content.ts` (añade constantes).

### 7.1 Comparativa vs competidores

Se inserta **entre §6 Medición y §7 Tu equipo en control**: llega justo después de la prueba de la promesa, cuando el lector ya entendió el diferenciador y está comparando.

```
──────────────────────────────────────────────────────────────────
        Lo que ninguna otra plataforma hace por ti

                          Axi      Inbox      Bots de
                                  con IA     WhatsApp
  ─────────────────────────────────────────────────────────
  Cierra la venta en el chat   ✓       —          —
  Catálogo con stock real      ✓       —       parcial
  Precios que no se inventan   ✓       —          —
  Pago verificado por tu equipo ✓      —          —
  Ventas medidas en pesos      ✓       —          —
  Qué corregir mañana          ✓       —          —
  Tu número actual en minutos  ✓       —          —
  ─────────────────────────────────────────────────────────

  Las demás plataformas te dicen cuántos mensajes respondiste.
  Axi te dice cuánto vendiste, quién lo vendió y qué corregir mañana.

Móvil: la tabla se convierte en 3 tarjetas apiladas por columna,
       con la fila como etiqueta — nunca scroll horizontal.
```

**UX / UI**

- **Categorías, no marcas.** "Inbox con IA" y "Bots de WhatsApp" en vez de respond.io y Manychat: el comparativo del estudio de mercado es **una foto del 2026-08-03** (`docs/scraping/README.md`) y nombrar competidores obliga a mantenerlo al día y expone a reclamos. El argumento gana igual.
- Se construye sobre **`Table` de `shared/components/ui/table.tsx`**, que ya existe.
- **La columna de Axi es la que destaca**: fondo `bg-brand/6`, borde coral, `✓` en `text-success`. Las otras en `text-muted-foreground` con `—`. Nada de rojos ni ✗ — regodearse resta credibilidad.
- Fondo neutro, sin gradiente. Es una sección que se lee.
- Filas ≤ 7. Una tabla de 30 filas no la lee nadie.
- Contenido en `landing.content.ts` como `COMPARISON`.

### 7.2 Barra de CTA fija en móvil

```
│  … scroll de la página …                    │
├─────────────────────────────────────────────┤
│  [ Agenda tu demo ]      [ ◉ WhatsApp ]     │  ← fixed bottom, glass
└─────────────────────────────────────────────┘
   aparece al pasar el hero · se oculta al llegar al CTA final
```

**UX / UI**

- Solo `lg:hidden`. El ICP lee desde el celular llegando de WhatsApp (`landing-copy.md`, guía §6) y hoy tiene que hacer scroll hasta el final para convertir.
- Aparece cuando el hero sale del viewport (`useInView` sobre un sentinel) y **se oculta cuando `#demo` entra**, para no tapar el formulario al que lleva.
- Material `.glass` con `border-t`, `pb-[env(safe-area-inset-bottom)]` para el notch. Entrada con `spring.soft`, y sin animación con reduced-motion.
- Escucha el scroll del contenedor `[data-app-scroll]`, no de `window` — **reutilizar `use-scroll-container.ts`** (`src/modules/landing/ui/components/use-scroll-container.ts`). Éste es exactamente el bug que tiene `marketplace-hero.tsx:76`.
- Targets ≥ 44px, `aria-label` en el de WhatsApp.

---

## F8 — Marketplace con badge "Pronto"

**Archivo:** `src/shared/components/layout/marketplace-hero.tsx` (265 líneas) + `src/app/(public)/marketplace/page.tsx`.

```
┌────────────────────────────────────────────────────────────────┐
│  ─ ─ ─ ─  rejilla SVG + puntos (se conserva)  ─ ─ ─ ─          │
│                                                                 │
│                    ┌──────────────────┐                         │
│                    │  Próximamente    │  ← Badge               │
│                    └──────────────────┘                         │
│                                                                 │
│         Marketplace de Influencia                               │
│         Conecta marcas e influencers de alto impacto            │
│                                                                 │
│   Filtra por industria, alcance y audiencia. Gestiona la        │
│   relación de principio a fin y mide el retorno.               │
│                                                                 │
│   [ Quiero saber cuándo esté listo ]  [ Conoce Axi Connect ]    │
│        → /contacto?origen=marketplace      → /                  │
└────────────────────────────────────────────────────────────────┘
```

**Arreglos obligatorios**

| Problema | Línea | Arreglo |
|---|---|---|
| `/signup` y `/marketplace/browse`: los **dos únicos CTA dan 404** | `:252,253` | `/contacto?origen=marketplace` y `/` |
| Animación palabra-a-palabra hasta **6.900 ms**: el usuario espera ~7s a que aparezcan los botones | `:251` | Comprimir a ≤1.200 ms total |
| `window.addEventListener('scroll')`: el scroll ocurre en `[data-app-scroll]`, **el listener nunca dispara** → los `.floating-element` quedan `paused` para siempre | `:76` | `useScrollContainer()` |
| Ripple global en `document`: **cualquier clic en cualquier parte de la app** inyecta un `<div>` fuera de React | `:45-60` | Acotar al contenedor del hero o eliminar |
| `styled-jsx` sin `prefers-reduced-motion` | `:94-144` | Guard de reduced-motion |
| Sin `metadata` → hereda `"axi connect"` | — | `metadata` propio |
| Propuesta de valor desalineada con la landing | — | El badge "Próximamente" resuelve la disonancia: se lee como ambición, no como otro producto |

---

## F9 — SEO, QA y documentación — ✅ **COMPLETADA (agosto 2026)**

> Ejecutada y ampliada. El detalle vive en **`docs/plans/seo-plan.md`**; aquí queda el
> resumen y las desviaciones respecto de lo que esta fase preveía.

**SEO — hecho**
- ✅ **`src/app/robots.ts`** y **`src/app/sitemap.ts`**, este último derivado de
  `INDEXABLE_ROUTES` (`core/seo/routes.ts`) para que añadir una página no exija tocarlo.
- ✅ `alternates.canonical` en todas las públicas vía `pageMetadata()` (`core/seo/metadata.ts`),
  `metadata` propio en `/marketplace` y `noindex` en `/auth/*` (desde su layout: `/auth/logout`
  es `"use client"` y no puede exportar `metadata`).
- ✅ **JSON-LD**: `Organization` + `WebSite` + `FAQPage` en la home, `SoftwareApplication` con
  las ofertas reales + `FAQPage` + migas en `/precios`, `ContactPage` en `/contacto`, migas en
  el resto. **No** en el layout público: es `"use client"` y el JSON acabaría en el bundle.
- ✅ `next.config.ts`: `images.formats` ya estaba; se añadió `minimumCacheTTL`.

**Tres cosas que esta fase no había detectado, y eran las importantes**
1. **`metadataBase` apuntaba a `localhost:3001` en producción.** `NEXT_PUBLIC_APP_URL` no
   estaba declarada en el `Dockerfile` ni en el workflow, así que el fallback ganaba siempre.
   Todos los `canonical` que esta fase pedía escribir habrían apuntado a localhost.
2. **El middleware devolvía 307 al login en las rutas de metadata.** `/opengraph-image.png`,
   `/icon.svg` y `/apple-icon.png` no estaban en `PUBLIC_PATHS`: la imagen de enlace existía en
   el repo y **ningún scraper podía verla**. `/robots.txt` y `/sitemap.xml` habrían caído igual.
3. **Cinco páginas sin `<h1>`** (`/precios`, `/casos`, `/integraciones`, `/productos`,
   `/soluciones`), porque `SectionHeading` emitía `<h2>` sin excepción, y **ningún `<main>`** en
   toda la capa pública.

**Fuera del alcance original, añadido:** analítica GA4 + píxel de Meta con consentimiento
(`core/analytics/`), Open Graph y Twitter Card por página, y Nexa convertida a WOFF2
(287 KB → 102 KB, −64 %, y es la fuente del `<h1>`).

**QA (recorrido completo, light + dark + móvil)**
- Cada ruta del mapa, **en ventana privada sin cookies**: ninguna debe rebotar a `/auth/login`.
- **Cero enlaces internos rotos**: recorrer navbar, footer, dropdowns, menú móvil y CTAs de cada página.
- Navegación **solo con teclado** por el navbar y sus dos dropdowns; `Escape` cierra; el foco no se escapa del menú móvil.
- `prefers-reduced-motion` activado: partículas estáticas, sin marquee, sin typing, sin barra deslizando.
- Sin scroll horizontal en ninguna página, a 320px de ancho.
- `npm run lint` **0 warnings** en la capa pública · `npm run build` verde · `npm test` verde.

**Documentación a corregir (está desactualizada y confunde)**
- `axi-client/docs/modules/public-site.md` — describe la landing anterior ("3 secciones", `SiteHero`+`SiteFramework`+`SiteInboxShowcase` montados) y un gap analysis que este trabajo cierra. Reescribir con el mapa de rutas real.
- `docs/business/knowledge-base.md §17.2` — la brecha "sin captura de leads / ~10 enlaces roto / prueba social desactivada" ya no describe el estado. Actualizar y **mantener** lo que sigue siendo cierto (los leads no persisten).
- `axi-client/docs/design/{DESIGN,DESIGN-SYSTEM}.md` — sincronizar lo que la auditoría encontró obsoleto: `gradients.ts` ya eliminado, `--color-destructive` ya corregido, `!important` de headings ya quitado, `--radius-full` documentado pero inexistente, y **la contradicción del gradiente corto** (`DESIGN.md:87` dice coral→violeta; `DESIGN-SYSTEM.md:73` y `globals.css:150` dicen coral→coral profundo — hay que decidir cuál manda).
- `docs/business/landing-copy.md` — marcar como implementado y anotar las dos secciones nuevas (comparativa, barra móvil) que no estaban en el documento.

**Deuda conocida que se deja anotada, no resuelta** (por la decisión de no tocar la home)
- `LandingFinalCta.tsx:49` — el formulario sobre `.glass-overlay` encima de un canvas WebGL viola `DESIGN.md §5.1`.
- `LandingFinalCta.tsx:30` — `colorVars` como array literal inline: nueva referencia en cada render → **recompila el shader WebGL completo**.
- `LandingHero.tsx:33-37` — `blur-2xl` sobre 640px con tres `radial-gradient` **más** el canvas WebGL: el mayor riesgo de LCP del sitio.
- `LandingHero.tsx:51` — `text-2xl` (24px) para el h1 del hero en móvil, salta a `sm:text-5xl`.
- `VaultRevealCard.tsx:64` — string de 2.200 caracteres construido en cada `pointermove`, sin throttle.
- Prueba social con 2 de 3 logos en `null` y las 3 cifras de casos publicando el badge "CIFRA PENDIENTE".
- `auth/login/form.tsx:102,104` — `text-secondary` en el icono de ojo (es un color de superficie): **prácticamente invisible**. Y los `<label>` de `:81,91,111` sin `htmlFor`.

---

## Requerimiento para axi-server (handoff, no se implementa aquí)

El formulario seguirá simulado (`lead-service.adapter.ts:17-21` es un `setTimeout`; hoy **ningún lead se guarda en ninguna parte** y la conversión depende de que el usuario pulse enviar en WhatsApp). Contrato a pasar al backend:

```
POST /api/v1/public/leads          (sin autenticación)
Body: { name, business_name, whatsapp, monthly_conversations, origin? }
      monthly_conversations ∈ lt_300 | 300_1000 | 1000_3000 | gt_3000 | unknown
      origin: 'home' | 'contacto' | 'marketplace' | 'productos' | 'soluciones'
201 → { id }
Requisitos: rate limit por IP, honeypot/captcha, notificación al equipo comercial,
            consentimiento de tratamiento de datos (Ley 1581 CO) persistido.
```

Cuando exista, el único cambio en el frontend es el cuerpo de `createDemoLead()`:
`http.post<void>("/public/leads", payload, { authenticate: false })` — el TODO ya está escrito en `lead-service.adapter.ts:6-15`.

---

## Insumos que necesito de ti

1. **Kodecol**: URL, claim de una línea, logo (SVG), redes.
2. **WhatsApp del agente de Axi**: confirmar que `+57 322 497 0950` (`landing.content.ts:644-657`) es el número definitivo y que está atendido por un agente configurado con los planes.
3. **Correo y datos de empresa** para `/contacto`.
4. **Instagram y Messenger**: ¿los prometemos en `/productos` y `/soluciones`? Están integrados pero su **puesta en producción figura como pospuesta** (`knowledge-base.md §18.4`). Por defecto los describo como disponibles solo si me lo confirmas.
