# Calidad · upgrade premium de UI

> Rama `feat/quality-premium` (cliente), sale de `origin/main` dfbcb038, que ya trae el upgrade funcional de quality (F1–F5).
> Mockup aprobado por el dueño el 2026-09-25: canvas https://claude.ai/artifact/Kqy7MJXKUJNSR5BFLvQHQQ;
> copia en `/home/davela/dev/axi/docs/design/mockups/quality-premium/`.
> Lenguaje heredado del upgrade de «Entrega y bienvenida» (`feat/entrega-premium`, `entrega_premium_plan.md`).
> Solo cliente: no cambia ningún contrato del servidor.

## Lenguaje (adaptado a `docs/design/DESIGN-SYSTEM.md`, sin tokens nuevos)

- **Bento.** Cada tarjeta trata un solo tema: `rounded-3xl border border-border bg-card`, con la etiqueta pequeña en
  muted, una cifra grande en `font-heading` con `tabular-nums` y una línea secundaria. Sin sombras, salvo en lo flotante.
- **Una isla de tinta por pantalla,** para lo más accionable: `bg-foreground text-background`. En oscuro, `bg-card`
  con borde. Lleva un brillo coral radial hecho con `color-mix(var(--axi-brand))`.
- **Estado.** `StatusBadge appearance="dot"`: el tono va en el punto y el texto en foreground (§10). Así se retiran
  de quality los badges tintados que no pasaban AA.
- **Pestañas.** `NavTabs` y `Tabs variant="pill"` con el activo en `bg-accent` (§9.3). Los filtros sin panel usan
  `SegmentedControl`.
- **Progreso.** En tramos o barras lineales, nunca anillos (§9).
- **Escala.** Grids de 2 columnas en `md`, 3 en `xl` y 4 solo desde `min-[1400px]`. `min-w-0` en todo hijo de grid.
  Resúmenes «a · b · c» con cada pieza en `whitespace-nowrap`.

Piezas nuevas en `features/quality/shared/premium.tsx`: `QualityTile`, `BigFigure`, `InkPanel`, `Kicker`, `Meter`,
`QualityStatus`. Son equivalentes de `SummaryTile`/`StatePill` de `feat/entrega-premium`: cuando esa rama se fusione,
se unifican y se suben a `shared/components/features`.

## Fases

| Fase | Pantalla | Qué cambia |
|---|---|---|
| F1 | Piezas + estado AA | `premium.tsx`; `StatusBadge` de plataforma acepta `appearance`; todo quality pasa a punto |
| F2 | Simulacro | Rail, cabecera del chat, compositor en píldora; inspector con la isla «Ahora», métricas en bento, lista de la conversación; traza como línea de tiempo |
| F3 | Capacidades | Cabecera del tenant, 4 cifras + isla «Lo más urgente», lista agrupada por familia con medidor y umbrales 0,7/0,9 |
| F4 | Ejecuciones y probe | Lista con isla «En curso» y cifras de 7 días (solo con datos que ya trae la API); detalle de probe con cifra héroe, distribución de rank e isla «Siguiente paso» |
| F5 | Mesa de etiquetado | Progreso del dataset, candidatos como tarjetas seleccionables y barra de acción flotante (la isla de esta pantalla) |
| F6 | Escenario | Criterios agrupados por familia, cada uno en lenguaje natural con su kind debajo |

Regla: solo se pinta lo que el contrato trae. Si un dato del mockup no existe en la API, se omite o se dice que falta;
nunca se inventa.

## Verjas por fase

`npm run lint` acotado a quality, `npm test -- --testPathPattern quality` y, al cerrar, `tsc` (con heap manual) y
`next build`, de uno en uno. Antes de dar por cerrada cada pantalla, renderizarla y medir desbordes a 390, 768, 1024,
1280 y 1440 px, en claro y en oscuro.
