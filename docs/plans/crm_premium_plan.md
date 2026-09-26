# CRM premium: upgrade de diseño fase por fase

> F1 aprobado por la dueña el 2026-09-25 («perfecto, procede»). Rama `feat/crm-premium` (worktree
> `.claude/worktrees/crm-premium`), sobre `main`. Mismo lenguaje que la entrega de bienvenida, Calidad y Cobros premium
> (DESIGN-SYSTEM §9.5–§9.8).
>
> | Fase | Qué | Lienzo | Estado |
> |---|---|---|---|
> | F1 | Pipeline: tablero, detalle, ganar / perder, tabla, resumen de Axi, estados | https://claude.ai/artifact/XeAzi64SAmKKZX9fWUJKTL | Implementado y medido (2026-09-26) |
> | F2 | Contactos: lista y ficha 360 | https://claude.ai/artifact/GhDJsXcao2JY4VdHMYVukc | Implementado y medido (2026-09-26) |
> | F3 | Tareas | — | Por diseñar |
> | F4 | Configuración: pipelines, recorrido, secuencias, segmentos, etiquetas, tareas de agente, importar | — | Por diseñar |
>
> Fuentes de cada lienzo: `docs/design/mockups/crm-premium/<fase>/`.

## 0. Reglas que mandan

- **Piezas del sistema, nunca copias:** `BentoTile`, `BentoFigure`, `StatePill`, `InkIsland`, `Island`, `NavTabs`,
  `SegmentedControl`, `DataTable`, `Modal`, `Button variant="contrast"`. El lienzo es la intención; el aspecto final es
  el del componente (p. ej. la pastilla activa del segmentado es la del DS, no la tinta del lienzo).
- **La isla:** una por pantalla. «Lo próximo» (las que se enfrían) es de contenido → cristal blanco por defecto.
  Nada de estilos de isla a mano.
- **Continuidad:** diálogos sólidos, coral solo como acción, estado en el punto y texto en `foreground`, violeta solo
  en el icono de lo que hizo Axi.
- **Nada se desborda** (pedido expreso de la dueña al aprobar F1):
  - todo hijo de grid/flex con texto lleva `min-w-0`;
  - títulos, nombres y montos en `truncate` + `title` o `whitespace-nowrap`;
  - resúmenes «a · b» cortan entre piezas;
  - las tablas bajan columnas al «Ver más» de `DataTable` antes que partir una celda;
  - el body de la vista nunca scrollea en horizontal.
- **Scroll profesional con el estilo de Axi:** todo scroller propio (tablero en horizontal, cada columna, el rail,
  la fila de fichas en el celular) lleva `.sidebar-scroll` (la barra de marca de 6 px con el pulgar coral).
  - Un solo scroller por área (§4.2).
  - Scrollers de bloque (`space-y-*`), no `flex flex-col`.
  - `overscroll-contain` para que la columna no arrastre el panel.
  - `snap-x` en el tablero con `scroll-padding` para que la columna no quede cortada contra el borde.
  - No se usa `scrollbar-width`/`scrollbar-color`: en Chrome ≥ 121 anulan `::-webkit-scrollbar` y la barra de marca
    desaparece.
- **Datos:** no se inventa nada. Todo lo de F1 sale de lecturas que ya existen:
  - `stats`, `board`, `pipelines`, `events` y `users`;
  - el payload de `stage_changed` (`from_stage_id`, `to_stage_id`, `reason`);
  - el de `value_changed` (`from`, `to`);
  - el de `stalled` (`stalled_days`, `rotting_days`).
  F1 no toca el servidor.
- **Cada fase:**
  1. Verjas: `tsc`, `lint` y `jest` del módulo.
  2. Render medido (§12) a 390, 768, 1024, 1280 y 1440 px, en claro y oscuro, con datos largos.
  3. Commit.

## 1. F1 · El pipeline

| Pieza | Hoy | Queda |
|---|---|---|
| `domain/pipeline-summary.ts` (nuevo) | — | Derivaciones puras con test de los dos signos: `weightedCents`, `stallInfo` (días y límite), `coolingDeals` (las que se enfrían, ordenadas por exceso), `closeRate` (ganadas de cerradas, `null` sin cierres), `stageRoute` (posición de la etapa en el pipeline), `describeDealEvent` (texto del historial desde el payload) |
| `PipelineHeader` | Selects + segmentado + botones | Título «Pipeline» + selector de pipeline en píldora + subtítulo «N abiertas · $ X en juego». A la derecha: vista Tablero/Tabla, «Resumen de Axi» y «Nueva oportunidad». Debajo, «Cierres de» + `SegmentedControl` del período |
| `DealStatsTiles` → `PipelineSummary` | 4 cajas | Bento: «Pronóstico ponderado» (cifra, «de $ X», medidor, «Valor × probabilidad de cada etapa»), «Ganadas · período» (cifra + valor, ciclo medio), «Tasa de cierre · período» (%, «N de M cerradas», o «Aún sin cierres»). Isla «Lo próximo»: «N se enfrían · $ X», la primera y «Ver la primera»; sin ninguna, «Todo en movimiento». En el celular y hasta `xl` es una fila que scrollea dentro de sí misma |
| `StageColumn` | Barra de color + mayúsculas | Punto del color + nombre + probabilidad + conteo y valor. Cuerpo como scroller de bloque con la barra de Axi, «Nada en esta etapa · arrastra una aquí», «Ver N más» |
| `DealCard` | Badge IA + aviso ámbar | Título truncado + icono violeta «La abrió Axi», contacto, monto en Nexa + «cierra 30 sep», y abajo `StatePill` «N días quieta · aguanta M», «Axi no la mueve» (`ai_moves_paused`) o «N días en la etapa». Menú ⋮ al pasar o con el foco |
| `PipelineBoard` | Scroll horizontal sin estilo | Scroller con `.sidebar-scroll`, `snap-x`, padding derecho cuando el rail está abierto y la tarjeta abierta se desliza a la vista |
| `DealDetailRail` / `DealDetailRoute` | Rail que encoge el tablero | Panel flotante (`lg`: 440 px a la derecha, sombra de overlay; celular: pantalla completa). Kicker, título, píldoras (estado, «La abrió Axi»), cifra + «Editar», «Pesa $ X en el pronóstico · N % de Etapa», recorrido de etapas (§9.6) con «Etapa N de M» y «Se enfría», datos (cierre, responsable, contacto, origen), seguimiento (humano / Axi), historial legible, notas y barra de pie fija con «Marcar perdida» / «Marcar ganada» (o «Reabrir») |
| `WinLoseDialog` | Campo suelto | Ganar: «Valor final» + «Al confirmar» (pasa a Cliente, suma a Ganadas, se puede reabrir). Perder: motivos rápidos (`radiogroup`) + detalle + «Así queda el motivo». Avisos sin emoji |
| `PipelineSummaryDialog` | Lista con viñetas | Kicker «Resumen de Axi», «Así va {pipeline}», dos grupos «Lo que puede caerse» / «Lo que puedes ganar», píldora de caché |
| `DealsTable` | Botones sueltos | `SegmentedControl` de estado, buscador en píldora, etapa con punto, «Pondera», «En la etapa» con `StatePill`, «Responsable», todo truncado con `title` |
| `loading.tsx` y estados | Genéricos | Esqueleto del mismo alto (bento + columnas); vacío con «Nueva oportunidad»; error «No pudimos leer el pipeline» + «Reintentar» |

Fuera de F1: el create modal (`DynamicForm`) se queda como está.

### 1.1 Render medido (§12) — 2026-09-26

Arnés `/root/axi/qa/premium/crm-f1-render.mjs` contra `next dev` (:3001) y la API sobre una base aparte,
`axi_render`, migrada y sembrada desde cero. La base de desarrollo `axi_connect` tiene deriva de migraciones y no se
tocó. El escenario sale de `crm-f1-seed.py`:
- datos largos: nombres de 40+ y títulos largos;
- montos de 8 cifras, sin valor y sin fecha;
- una pausada, tres quietas y un segundo pipeline de nombre largo;
- ganadas y perdidas.

Cinco escenas × 390/768/1024/1280/1440 × claro/oscuro: **50 capturas sin hallazgos**.

Además de los detectores de §12, dos nuevos, pedidos por la dueña:
- texto recortado sin «…»;
- scroller sin la barra de marca.

Lo que el render corrigió:
- **El bento a 1280 px** partía la cifra, porque se dimensionaba por viewport. Ahora es un `@container`: la rejilla
  entra desde 66 rem de contenido y, por debajo, es una fila que scrollea dentro de sí misma.
- **Botones del panel truncados** («Agendar seguimiento», «Marcar perdida»). El seguimiento se apila en dos filas y
  las dos decisiones reparten el ancho por igual.
- **Etiqueta y pie del pronóstico truncados** por la píldora de abiertas. El conteo pasa al pie, en dos líneas.
- **«Ciclo medio de hoy»**: con 0 días dice «Se ganan el mismo día en que se abren».
- **La X de 16 px de Ganar/Perder** se quita: «Cancelar» y Escape ya cierran. El `Modal` compartido no se toca.
- **La tabla prometía de más.**
  - Ordenar «las más quietas primero» y buscar por contacto no existen en el servidor: `sort=stage_entered_at` es
    descendente y `q` busca solo en el título.
  - Se quitó el orden y el buscador dice «Buscar por nombre de la oportunidad».
  - Queda como deuda de servidor, si se quiere: `sort` ascendente y búsqueda por contacto.
- **El valor en los campos de edición** aparece con miles («8.900.000») y no crudo.

Verjas:
- `tsc`: solo el error preexistente de `ConversationPanel.test.tsx`, que viene de `main`.
- `next lint`: 0 errores.
- `jest`: 483 suites y 3852 tests.
- `next build`: OK.

## 2. F2 · Contactos

Aprobado el 2026-09-26 («aprobado, procede a implementar F2»). Solo cliente: no toca el servidor.

| Pieza | Hoy | Queda |
|---|---|---|
| `domain/contact-summary.ts` (nuevo) | — | Puro, con test de los dos signos: `scoreProgress` (el score en 5 tramos y la frase «Habló… Falta: …»), `newContactsSplit` (cómo llegan los nuevos), `contactNextUp` (se enfría → saldo → próxima insistencia → al día) |
| `domain/contact.ts` | — | `primaryChannel`: el canal de la última vez que escribió, para la columna «Canal» y la cabecera |
| Lista (`contacts/page.tsx`) | Título pequeño y tarjeta | Título en Nexa, «N personas · las de WhatsApp e Instagram llegan solas» y el bento `ContactsSummary`: «Nuevos» (`/contacts/stats` con período), «Cómo llegan los nuevos» (`by_stage`, monocromo) y la isla «Lo próximo: N posibles duplicados» (`/contacts/duplicates`). Error por ficha con «Reintentar»; `@container` (grid desde 56 rem, fila con scroll de marca debajo) |
| Columnas | Badges tintados | Etapa en `StatePill` (Lead con el tono nuevo `info`), columna «Canal» (`ChannelKindIcon` + última vez), nombre y correo con ancho máximo por tramo (en una tabla un texto sin saltos ensancha la celda) |
| Ficha 360 | Dos columnas de tarjetas | Cabecera nueva (nombre truncado, píldoras de copiar, contexto «ciudad · canal · desde»), bento `@container` (4 columnas desde 68 rem) con Recorrido, «Qué tan cerca está» (tramos, sin anillo), «Con nosotros» (solo con `orders:read`) y la isla «Lo próximo»; cuerpo en dos columnas desde `xl` |
| `ContactJourneyCard` | Card con filas | Ficha del bento con los mismos textos (sus 9 tests intactos) y `onLoaded` para la isla: una sola petición del recorrido |
| `CopilotPanel` | Superficie violeta | Tarjeta sólida «Axi»; el violeta solo en el icono; modos «Resumen / Siguiente paso / Borrador»; el motivo de «Regenerar» deshabilitado se dice, no va en un `title` |
| Duplicados y fusión | Lista y diálogo | Parejas con motivo y confianza en tinta; diálogo sin la X de 16 px, columnas apiladas en el celular, «Escribe «X» para confirmar» |
| `StatePill` (DS) | 4 tonos | + `info` (aditivo) |
| `DataTable` (DS) | Casilla de 16 px | Cada casilla dentro de un `<label>` de 32 px: el objetivo es la etiqueta (el `::after` de `touchTarget` no pinta en un `<input>`) |

### 2.1 Render medido (§12) — 2026-09-26

Arnés `/root/axi/qa/premium/crm-f2-render.mjs` + `crm-f2-seed.py` sobre `axi_render`: la contacta de nombre de 45
caracteres y correo de 49, 4 pedidos (pagados y con saldo), oportunidad quieta en Propuesta y una pareja de duplicados.
Lista, ficha (1900 px de alto), duplicados y fusión × 390/768/1024/1280/1440 × claro/oscuro: **40 capturas sin
hallazgos** (evidencia en `D:\axi-qa\premium\crm-f2`).

Lo que el render corrigió: la tabla y la ficha a 390 (437/453 px de ancho), el bloque del nombre aplastado a 0 px por
las acciones (base 0 en una fila que se parte), la cifra de «Con nosotros» empujando su unidad, títulos partidos
(«Saldo pendiente», «Con saldo primero»), los selectores de filtro truncados, la silueta de datos con `1fr`, el diálogo
de fusión desbordado a 768 px y las casillas de 16 px.

Verjas: `tsc` (solo el preexistente de `ConversationPanel.test.tsx`), `next lint` 0 errores, `jest` 490 suites / 3900
tests, `next build` OK.

## 3. F3–F4

Se diseñan después, cada una con su lienzo y su aprobación antes de tocar código.
