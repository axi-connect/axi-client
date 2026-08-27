# Tanda 1 de UX/UI — Composición de escenarios de una suite (`/platform/quality/suites`)

## Context

El drawer «Escenarios de la suite» está roto visualmente: el nombre del escenario
desborda su caja y se pinta **encima** de los botones ↑ ↓ ✕ de cada fila y de los
botones «Añadir» del picker, el panel arrastra una barra de scroll horizontal, y el
detalle es ilegible en pantallas angostas (el screenshot es la variante *bottom sheet*,
< 768 px). No es un problema de estética: la acción «Quitar» y la acción «Añadir»
quedan tapadas por texto, así que la tarea (componer una suite) es **inoperable** en
esa vista.

La causa raíz es un solo error de CSS repetido dos veces, y el repo **ya tiene el
patrón correcto construido** para esta misma necesidad (lista ordenada donde el orden
es semántico): `src/modules/forms/ui/components/FieldMasterList.tsx`. El objetivo de
esta tanda es arreglar la primitiva compartida que deja fugar el desborde y rehacer el
cuerpo del sheet alineado a ese precedente, sin tocar el contrato del backend
(PUT de reemplazo total, 1–50 ids, sin duplicados).

Esta es la **tanda 1**. El usuario mostrará más errores de UX/UI después; las
primitivas que se toquen aquí quedan disponibles para esa segunda tanda.

---

## Diagnóstico (hallazgos, por severidad)

Convención: `[H]` rompe/bloquea la tarea o pierde datos · `[M]` fricción real y
recurrente · `[L]` pulido.

### Raíz del desborde

- **[H] `truncate` inerte sobre elementos inline** — `SuiteScenariosSheet.tsx:160-162`
  y `:222-225`. El contenedor es `<div className="min-w-0 flex-1">` con dos `<span>`
  **inline** dentro. `text-overflow: ellipsis` **solo aplica a contenedores de bloque**:
  el nombre no se corta, desborda la caja y —al no haber `overflow-hidden`— se pinta
  sobre los hermanos `shrink-0` (los iconos ↑ ↓ ✕ y el botón «Añadir»).
  *Contraste:* en `FieldMasterList.tsx:213` el mismo `truncate` sí funciona porque el
  `<span>` es un **flex item** (los flex items se blockifican).
- **[H] el body del `DetailSheet` deja fugar el desborde al eje X** —
  `DetailSheet.tsx:248` usa `overflow-auto` (ambos ejes). Es lo que convierte la fuga en
  la barra horizontal del screenshot, y afecta a **todos** los sheets de la app.

### Estructura y flujo

- **[H] las acciones primarias viven dentro del scroller** —
  `SuiteScenariosSheet.tsx:254-263` pinta «Cancelar / Guardar composición» como último
  hijo del body scrolleable, en vez de usar el slot `renderFooter` del `DetailSheet`
  (que se renderiza **fuera** del scroller, `DetailSheet.tsx:253-255`). Con 4 escenarios
  y 10 resultados de picker, el botón Guardar no se ve — en el screenshot no aparece.
- **[H] pérdida de datos silenciosa** — existe estado `dirty` (`:48`) pero **nada lo
  guarda**: Esc, clic en el overlay, la ✕ del header y «Cancelar» cierran y descartan la
  composición editada sin avisar.
- **[M] doble padding** — el body del `DetailSheet` ya trae `p-4` y el contenido añade
  otro `p-4` (`:122`): 32 px de gutter en un panel de 520 px, que es parte de por qué
  todo va apretado.
- **[M] botón deshabilitado sin explicación** — «Incluido» (`:244`) y el deshabilitado
  por tope de 50 (`:231`) son controles muertos: no dicen por qué. El precedente del
  repo resuelve esto con texto estático («Ya lo pides», `AddFieldCatalog.tsx:84`).
- **[M] tope silencioso en el picker** — `pageSize: 10` (`:81`) sin mostrar el total ni
  paginar: hay escenarios que el usuario no puede alcanzar y nada se lo dice.
- **[M] reordenar 50 escenarios a flechazos** — solo hay ↑ ↓ (`moveSuiteScenario`),
  cuando `@dnd-kit` ya está en el proyecto y el patrón sortable accesible ya está
  escrito en `FieldMasterList.tsx:92-129` (con anuncios para lector de pantalla).

### Consistencia con el design system

- **[M] `IconButton` reinventado** — `SuiteScenariosSheet.tsx:271-295` duplica
  `Button variant="ghost" size="icon"` y además usa `focus-visible:outline` donde el
  sistema manda `focus-visible:ring-ring` (DESIGN-SYSTEM §10). Targets de 32 px, por
  debajo del mínimo táctil de 40 px (§10).
- **[M] callout de advertencia a mano** — `:134` es la novena copia de un callout inline
  con **cinco recetas distintas** en el repo (`bg-warning/5`, `/8`, `/[0.07]`, borde
  `/30` vs `/40`, texto `text-warning` vs `text-muted-foreground`, radio `xl` vs `lg`).
  La primitiva `Alert` (`shared/components/ui/alert.tsx`) **no tiene** variantes
  `warning`/`info`, que es exactamente por qué se copia a mano.
- **[M] contraste AA** — `text-warning` (`#D97706`) sobre fondo casi blanco da ≈ 3.0:1 y
  **no pasa AA** para texto de 12–14 px (§10, mandamiento 10). La receta correcta ya la
  usan `MergeDialog.tsx:172` y `AvailabilityPanel.tsx:91`: superficie y borde teñidos +
  **icono** en el tono + **texto en `foreground`/`muted-foreground`**.
- **[M] dos semánticas para «archivado»** — el mapa ÚNICO estado→semáforo del panel
  (`platform/ui/components/StatusBadge.tsx`) tiene `archived: neutral`, pero el sheet
  pinta un badge ámbar a mano (`:165`). El hecho («Archivado») va en el badge neutro;
  la consecuencia («no se ejecutará») va en el callout, no duplicada en el badge.
- **[L] la ✕ del `DetailSheet` es un glifo de texto** (`DetailSheet.tsx:240`), no un
  icono lucide (§7).
- **[L] el título del sheet se trunca** (`DetailSheet.tsx:222`) — el nombre de la suite
  es la identidad del panel; debe poder ocupar dos líneas.

### Copy (UX writing)

- **[H de legibilidad] frase partida por un bug de JSX** — `:133-139`: el `:` y la
  segunda oración quedaron **fuera** del ternario, así que renderiza
  «…NO se ejecutará **: una** ejecución de esta suite tendrá menos cases…» — dos puntos
  huérfanos precedidos de espacio.
- **[M] jerga sin traducir** — «cases» en una UI en español; el vocabulario del módulo
  es «casos».
- **[L] mayúsculas para enfatizar** — «NO se ejecutarán» grita; el énfasis lo da el
  callout, no las capitales (DESIGN.md §7: microcopy breve y cercano-profesional).

---

## Plan de remediación

Orden: **primitivas primero** (arreglan N pantallas), luego el sheet.

### Paso 0 — Rama de trabajo

Worktree propio según la regla del proyecto:
`git worktree add .claude/worktrees/feat-ux-hardening -b feat/ux-hardening` (desde
`/home/davela/dev/axi/axi-client`, con `main == origin/main` y árbol limpio, ya
verificado). Copiar este plan a
`axi-client/docs/plans/ux_hardening_2026-08-27.md`.

> **Cuidado documentado:** dentro del worktree hay que enlazar `node_modules`
> (symlink) y **usar solo scripts del `package.json`, nunca `npx`** — `npx` en un
> worktree con `node_modules` enlazado vacía el del checkout principal.

### Paso 1 — Primitivas compartidas

**A. `src/shared/components/features/detail-sheet/DetailSheet.tsx`**

1. Body (`:248`): `overflow-auto` → `overflow-y-auto overflow-x-hidden overscroll-contain`.
   Regla que codifica: *un sheet nunca scrollea en horizontal; el contenido ancho
   scrollea dentro de su propio contenedor* (DESIGN-SYSTEM §4.2).
   **Chequeo obligatorio antes de aplicarlo:** `grep -rn "overflow-x-auto" src` sobre los
   contenidos que se montan dentro de un `DetailSheet`, para confirmar que nada dependía
   del scroll horizontal del body. Si aparece un caso legítimo, se le pone su propio
   `overflow-x-auto` en el mismo commit.
2. Header (`:222`, `:229`): `truncate` → `line-clamp-2` en título y subtítulo.
3. Botón de cierre (`:236-242`): glifo `✕` → `<X className="size-4" />` de lucide,
   `size-9 shrink-0`, `focus-visible:ring-ring focus-visible:ring-[3px]`,
   y área táctil ampliada en móvil (`after:absolute after:-inset-1 md:after:hidden`).
   Mismo cambio en `DetailSheetHeader.tsx:18-19` para el título.

**B. `src/shared/components/ui/alert.tsx`** — añadir dos variantes que hoy faltan, con
la receta AA-segura que ya usa el repo (superficie/borde teñidos, icono en el tono,
**texto en `foreground` / `muted-foreground`**, nunca `text-warning` como color de texto):

```
warning: "border-warning/40 bg-warning/8 dark:bg-warning/10 [&>svg]:text-warning"
info:    "border-info/40 bg-info/8 dark:bg-info/10 [&>svg]:text-info"
```

Se cablea **solo este sheet** en esta tanda. Las otras 8 copias a mano
(`AvailabilityPanel`, `RecurrenceBuilder`, `MergeDialog`, `CampaignWizard` ×2,
`AutomationsView`, `TargetStep`, y los tres `Alert className="border-info/30 bg-info/5"`)
quedan anotadas para la tanda 2 — es wiring mecánico. Se anota también, sin tocar, que
las variantes `destructive`/`success` existentes tienen el mismo defecto de contraste
(texto en el tono sobre `bg-card`).

### Paso 2 — Helpers puros

`src/modules/platform/ui/features/quality/suites/suite-scenarios.helpers.ts`:
añadir `reorderSuiteScenario(list, from, to)` (semántica `arrayMove`, no-op fuera de
rango) y dejar `moveSuiteScenario` delegando en él, para que flechas y drag compartan
una sola implementación del invariante de orden. Extender
`__tests__/suite-scenarios.helpers.test.ts` con los casos del reorder (from<to, from>to,
índices fuera de rango, identidad cuando `from === to`).

### Paso 3 — `SuiteScenariosSheet.tsx` (rehacer el cuerpo)

`size="lg"` (520 px) → **`size="xl"`** (640 px) en escritorio; en móvil sigue siendo
bottom sheet, y el layout se diseña **mobile-first** (es donde se rompió).

1. **Quitar el `p-4` interno** (`:122`); queda `space-y-5`.
2. **Footer al slot correcto:** mover «Cancelar / Guardar composición» a
   `renderFooter` del `DetailSheet`, con una línea de estado a la izquierda que dice
   qué falta para poder guardar (`4 de 50 · sin cambios` / `Añade al menos un escenario`
   / `Tope de 50 alcanzado`). El botón deja de ser un control muerto: siempre se sabe
   por qué está deshabilitado.
3. **Lista de composición** — `<ol>` con `DndContext` + `SortableContext` +
   `verticalListSortingStrategy`, sensores y bloque `accessibility.announcements`
   calcados en espíritu de `FieldMasterList.tsx:92-129` (con textos propios:
   «Moviendo <código>», «<código> quedó en la posición N»). Fila:

   ```
   <li>  grip(size-9 lg:size-7, touch-none)  ·  n.º (w-5 tabular-nums)
         ·  contenido (min-w-0 flex-1)          ·  badge   ·  acciones (shrink-0)
   ```

   - **El fix de fondo:** el contenido pasa a **dos elementos de bloque**
     (`<p className="truncate font-mono text-xs">{code}</p>` y
     `<p className="truncate text-sm text-muted-foreground" title={name}>{name}</p>`)
     dentro de un `min-w-0 flex-1 overflow-hidden`. Así el `truncate` sí recorta y el
     texto no puede pintarse sobre las acciones. El `title` deja ver el nombre completo.
   - Badge: `<StatusBadge status="archived" />` del panel (neutro, mapa único),
     `shrink-0`.
   - Acciones: `Button variant="ghost" size="icon"` con `className="size-9 lg:size-7"`,
     `aria-label` con el código (`Subir crm_lead_no_close`, `Quitar … de la suite`), la
     ✕ con `hover:text-destructive`. **Se borra el `IconButton` local** (§9: componer,
     nunca reinventar).
   - Al mover un ítem al borde, su botón se deshabilita y el foco se pierde: mover el
     foco al botón opuesto de la misma fila.
4. **Picker «Añadir escenarios»** — misma fila de dos líneas y `shrink-0` en la acción:
   - ya incluido → texto estático con `Check` («En la suite»), no un botón deshabilitado.
   - no incluido → `Button variant="outline" size="sm" className="shrink-0"` con
     `<Plus/>`; la etiqueta colapsa a `sr-only` bajo `sm` y `aria-label="Añadir <code>"`
     (doctrina de etiquetas de §9.3: la etiqueta colapsa su caja, no sale del DOM).
   - tope de 50 alcanzado → **un** `<Alert variant="warning">` encima del picker
     explicando el motivo, en vez de 10 botones deshabilitados mudos.
   - `meta.total > pageSize` → línea `Mostrando 10 de N. Refina la búsqueda para ver el
     resto.` (elimina el tope silencioso).
   - vacío con búsqueda activa → `SearchX` + frase + acción «Limpiar búsqueda».
5. **Guarda de cambios sin guardar** — un único `handleOpenChange(next)`: si
   `next === false && dirty`, `showModal` de `useAlert()` («¿Descartar los cambios?» /
   «Descartar» · «Seguir editando»). Cubre los cuatro caminos de cierre (Esc, overlay,
   ✕ y Cancelar) porque todos pasan por `onOpenChange`. Es el patrón que ya usan
   `ChannelDetailView.tsx:81` y `FormsSection.tsx:223`.
6. **Copy** — reescribir el callout de archivados como `<Alert variant="warning">` con
   `TriangleAlert`, arreglando el `:` huérfano, la jerga y las mayúsculas:
   > **1 escenario archivado no se ejecutará.** La ejecución de esta suite tendrá menos
   > casos que escenarios listados.
   (plural: «N escenarios archivados no se ejecutarán.»)

### Paso 4 — Tests

Nuevo `__tests__/SuiteScenariosSheet.test.tsx` (RTL, mockeando los hooks de query como
ya hace `ScenarioFormSheet.test.tsx`), asertando el **mecanismo**, no el pixel:

- un nombre largo no desborda: el nodo del nombre lleva la clase de truncado y la fila
  no crece (aserción sobre estructura/clases, que es lo que el DOM de jsdom permite);
- «Guardar composición» está en el footer del sheet, fuera del contenedor scrolleable;
- cerrar con `dirty === true` invoca `showModal` y **no** cierra hasta confirmar;
- un escenario ya incluido muestra «En la suite» y **no** un botón;
- con la lista en 50, aparece el aviso de tope y ningún botón «Añadir»;
- reorder por flechas y por teclado del sortable produce el orden esperado.

---

## Verificación

Comandos (los corre el usuario; el agente no levanta ni mata servidores):

```bash
cd /home/davela/dev/axi/axi-client/.claude/worktrees/feat-ux-hardening
npm test -- suite-scenarios SuiteScenariosSheet DetailSheet   # lote acotado
npm test                                                       # suite completa (≈1473)
npm run lint                                                   # solo rutas tocadas
npm run build                                                  # typecheck + build
```

**Verificación visual, obligatoria** (es un cambio visual; DESIGN-SYSTEM §11 y la regla
de no marcar «listo» sin verlo corriendo):

1. `/platform/quality/suites` → fila de una suite → «Escenarios».
2. Comprobar los cuatro casos que fallaban, **en light y dark**:
   - ventana angosta (< 768 px, bottom sheet) — sin barra horizontal, nombres con
     elipsis, ✕ y «Añadir» siempre alcanzables;
   - escritorio (≥ 1280 px) — 640 px de panel, footer fijo con «Guardar composición»
     visible sin scrollear;
   - una suite con escenarios archivados — callout con la frase nueva y badge neutro;
   - una suite de sistema (`is_system`) — modo solo lectura sin grip ni acciones.
3. Editar y cerrar con Esc → debe aparecer la confirmación de descarte.
4. Guardar y confirmar que el orden persiste al reabrir (el PUT es de reemplazo total,
   el índice del array es la `position`).

**Métrica del fix** (para abrir la tanda 2 con el delta): la tarea «componer una suite»
pasa de **imposible** en viewport angosto (acciones tapadas) a completable; en
escritorio el conteo de interacción baja de *N-1 pares de clics por posición* (flechas)
a **un arrastre** por escenario reubicado.

---

## Fuera de alcance (deliberado)

- Cablear el `Alert warning/info` en las otras 8 copias del callout y corregir el
  contraste de las variantes `destructive`/`success` → tanda 2 (wiring mecánico).
- Paginación real del picker (hoy: búsqueda + aviso del total). Requiere decidir
  «cargar más» vs paginador dentro de un sheet; no bloquea la tarea.
- Cualquier cambio de contrato del backend de quality: no se toca.
- Los demás errores de UX/UI que el usuario mostrará después: se auditan como tanda 2
  sobre esta misma rama, reutilizando las primitivas de esta.
