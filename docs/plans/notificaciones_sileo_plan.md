# Notificaciones con sileo — plan

> Rama `feat/sileo-notifications` (cliente). Estado: **F0 entregada; D1–D5 aprobadas por el dueño el 2026-09-23**, con un ajuste de espaciado de la píldora compacta pedido antes de aprobar la F0.
> Mockup: `docs/design/mockups/notificaciones-sileo.html` (build `notificaciones-sileo.build.py`,
> adaptador `notificaciones-sileo.adapter.js`), con sileo 0.1.5 real incrustado.

## Objetivo

Sustituir los avisos flotantes de la plataforma por la píldora de [sileo](https://sileo.aaryan.design/docs)
y dejar escrito en el Design System cuándo se usa un aviso, un aviso en línea, una confirmación o un
banner, para que ningún módulo vuelva a inventar el suyo. Aprovechar para corregir el
`DESIGN-SYSTEM.md`, que anuncia deudas ya pagadas.

## Lo que hay hoy (medido sobre `main` `b48c8ba`)

- `useAlert().showAlert` → `StatusAlert` (`shared/components/ui/notice.tsx`) pintado por
  `core/providers/alert-provider.tsx`: **384 llamadas en 118 archivos**; tonos: error 216 (191 con
  `errorMessage(err)` como título), success 147, warning 11, info 7.
- `FloatingAlert` (`shared/components/ui/floating-alert.tsx`), receta paralela con estado local: **10
  páginas** de Ajustes (roles, usuarios) y Catálogo (productos, tipos, catálogos, categorías).
- `StatusAlert` usado como aviso en línea en **3 sitios** (`FlowToolbar`, `FormsSection`,
  `CalendarView`); su caja es `fixed top-4 z-[9999]`, así que flotan sobre la vista.
- Defectos: un aviso a la vez (`setAlert` reemplaza), `w-2xl` sin tope (se sale en un teléfono),
  `aria-label="Dismiss"` en inglés, dos recetas visuales.

## Hechos de sileo 0.1.5 que condicionan el diseño (leídos del `dist`, no de la web)

- MIT, peer `react >=18`; depende de `motion ^12.34` (que trae `framer-motion`). Tenemos
  `framer-motion ^12.23` → subir a `^12.34` en el mismo commit para no cargar dos copias.
- Inyecta su CSS en `<head>`; se estiliza por `[data-sileo-*]` y variables `--sileo-*`.
- **Una ranura por defecto**: sin `id`, todo aviso usa `"sileo-default"` y se transforma sobre el
  anterior. Con `id` propio (clave aceptada en runtime pero **no tipada**) se apilan.
- `theme: "light"` pinta la píldora **oscura** (`#1a1a1a`) y viceversa; `fill` la sobrescribe.
- El título es `string` en una línea (`nowrap`) con `text-transform: capitalize`; el cuerpo
  (`description`) es `ReactNode` y se expande al pasar el ratón.
- Cuerpo al 50 % de opacidad: 3,3:1 sobre la píldora clara → **no pasa AA**.
- `aria-live="polite"` fijo; con `prefers-reduced-motion` anula duraciones.
- Duración por defecto 6000 ms; `null` = no se cierra; swipe para descartar.

## Decisiones (aprobadas 2026-09-23, tal cual la recomendación)

| # | Decisión | Recomendación | Alternativa |
|---|---|---|---|
| D1 | Posición | Arriba al centro, 12 px bajo el borde | Abajo a la derecha |
| D2 | Material | Tinta invertida (`fill = --foreground`) | Superficie del tema |
| D3 | Varios avisos | Éxito/info en una ranura; error/advertencia apilan | Una ranura · apilar todo |
| D4 | Título largo | > 34 car.: «cabeza — cola» / «cabeza: cola» se parte; si no, título por tono y todo al cuerpo | — |
| D5 | Duración | éxito 4 s · info 5 s · advertencia 7 s · error 8 s · con botón ∞ | 6 s para todo |

## Fases

- **F0 — Mockup + DS propuesto** (esta entrega). Sin código.
- **F1 — Núcleo** (`core/notifications/`): `notify.ts` (única importación de `sileo`),
  `to-options.ts` (traducción `showAlert` → `SileoOptions`, con jest), `toaster.tsx` (tema de
  next-themes, `fill` desde `--toast-fill`). `AlertProvider.showAlert` delega en `notify`
  conservando identidad estable. Tokens `--toast-*` y overrides `[data-sileo-*]` en `globals.css`.
  `[data-sileo-header]{padding-inline:14px 4px}`: el filtro «gooey» se come ~6 px del extremo
  (medido: con los 8 px de sileo el icono quedaba a 2 px del borde y a 0 px en la curva, y el
  título a 21 px por la derecha); con 14/4 el icono queda concéntrico a 8 px y el título a ~16 px.
  Regla `no-restricted-imports` para `sileo` fuera de `core/notifications`. `framer-motion ^12.34`.
- **F2 — Migración de los 13 sitios**: 10 páginas de `FloatingAlert` → `showAlert`; 3
  `StatusAlert` en línea → `Alert`. Borrar `floating-alert.tsx` y la variante flotante de
  `notice.tsx`. `LAYERS.alert` pasa a documentar el viewport de sileo.
- **F3 — `notify.promise`** en los «Guardar» que tardan (opt-in, lista a acordar).
- **F4 — Design System**: aplicar §9.4 y las 12 correcciones que muestra la vista 4 del mockup.

Verja por fase: `npm run lint` acotado + jest de `core/notifications` + `next build` (lo corre el
dueño/auditora). Verificación visual en claro y oscuro, escritorio y teléfono, en `/crm`, `/platform`
y `/configurar`.

## Riesgos

- `id` no tipado: se pasa con un tipo propio en `notify.ts` y un test que falla si sileo deja de
  apilar con `id` distinto (sube de versión con cuidado; sileo está en 0.x).
- El `<svg><title>Sileo Notification</title>` puede leerse en algunos lectores: vigilar en la
  verificación con VoiceOver/NVDA.
- Errores asertivos: sileo no ofrece `aria-live="assertive"`; la regla del DS lo compensa
  (lo que exige actuar ya, no es aviso).
