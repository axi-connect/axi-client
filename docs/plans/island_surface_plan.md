# Isla de tinta: tinta o cristal (blanco o negro), centralizada

Aprobado por el dueño el 2026-09-25, sobre el canvas del upgrade de Comercial
(https://claude.ai/artifact/JpZ7pzwdf8emGMH7WjLcZu, tablero 8). Rama `feat/island-glass`.

## Qué pidió

- La isla de tinta (DESIGN-SYSTEM §9.5) puede ser **tinta** o **cristal**, y el cristal **blanco** o **negro**.
- La barra de acción pegada abajo (Preparar entrega, la hoja de una acción) **sigue en tinta**.
- El efecto vive en **un solo lugar**: cambiarlo cambia Bienvenida, Quality y lo que venga, sin código repetido.
- Rendimiento: nada de JS, nada de nodos extra y el desenfoque solo donde hay cristal.

## Diseño

1. **Superficies con esquema propio** (`globals.css`, capa 1).
   - `.surface-dark` y `.surface-light` redefinen los primitivos del tema (`--background`, `--foreground`,
     `--axi-*`) en su subárbol, igual que `.dark`. El selector se agrupa con los bloques existentes, así que no se
     repite ningún valor.
   - Todo lo que va dentro de la isla (`text-muted-foreground`, `bg-muted`, `Button`, `StatePill`) usa los tokens de
     siempre y se ve bien sobre la superficie. Se acaban el `text-background` y los `dark:` dentro de las islas.
   - En tema oscuro, `.dark .surface-light` toma el esquema oscuro: una isla blanca sobre negro grita (§9.5).
2. **Material de la isla** (`globals.css`, capa 3, `@layer components` para que las utilidades de la vista la
   puedan ajustar).
   - `.island`: la forma y la base.
   - `.island-ink`: tinta plana.
   - `.island-glass`: cuerpo translúcido con `backdrop-filter`, canto de luz (máscara sobre `::before`), reflejo
     (`::after`) y halo. Sus valores son variables `--glass-*`, que cambian con el tono.
   - Brillo: `--island-glow` es una capa más del `background` (`.island-glow-brand` o `.island-glow-ai`), no un
     nodo.
   - Degradación: sin `backdrop-filter`, o con `prefers-reduced-transparency`, el cuerpo pasa a casi opaco.
3. **Primitivo React** `shared/components/features/island`.
   - `Island` (polimórfico, sin estado, apto para Server Components), `islandClassName()` e `ISLAND_DEFAULTS`: el
     **único** lugar que decide el aspecto por defecto de todas las islas.
   - `InkIsland` (bento) pasa a envolverlo y acepta `material`, `tone` y `glow`.
4. **Botón `contrast`**: `bg-foreground text-background`. Dentro de una isla es el botón fuerte (blanco sobre tinta,
   tinta sobre cristal blanco). Sustituye al `secondary` que usaban las islas.

## Consumidores migrados

- Bienvenida: `SummaryTiles` («Lo próximo»). Usa el aspecto por defecto; sus botones pasan a `contrast`.
- Quality: `InkPanel` (Capacidades, Ejecuciones, el detalle del probe y el inspector del simulador). Por defecto;
  botones a `contrast`; las barras de `RunsOverview` pasan de `bg-background` y `dark:` a tokens.
- La barra de envío de `DeliveryWorkspace`: `Island material="ink"`.
- El panel de marca de `PasswordShell`: `Island material="ink"` con el brillo abajo a la izquierda.

## Verificación

- tsc, lint y jest acotados a lo tocado; `next build`. Todo de uno en uno y con `flock`.
- Render: Resumen del tenant, Calidad y Preparar entrega, con el arnés de entrega-premium. Claro y oscuro, a 390 y
  1440 px. Contraste del texto apagado ≥ 4,5:1.
