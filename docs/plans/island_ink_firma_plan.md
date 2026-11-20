# Isla de tinta «Firma» — plan (2026-11-20)

## Por qué

La isla de contenido (`InkIsland`, ~60 usos: «Lo próximo», «Axi propone», «Así le llega»…) era
**cristal blanco** con halo violeta y brillo coral (`ISLAND_DEFAULTS.material = "glass"`, plan
`island_surface_plan.md`). En tema oscuro el halo se leía como neón. El dueño: «se ve muy neón,
muy inserio, muy videojuego o IA; quiero que sea más elegante y más premium». Le gustaba la tinta
plana de las barras de acción.

## Decisión

Mockup con la isla actual y cuatro tintas (A Obsidiana, B Grafito, C Titanio, D Firma), en sus
tres usos y dentro del Panel, claro y oscuro: `docs/design/mockups/isla-tinta-premium/`
(https://claude.ai/artifact/KxbiQrMwYB7ovaDaP7725P). **El dueño eligió la D.**

**D · Firma:** tinta casi negra, sombra corta y un hilo de 1,5 px coral → violeta en el borde
superior, desvanecido en las puntas (la cinta corta del isotipo, DESIGN §3.2). En IA el hilo es
solo violeta. Sin halos ni luz de color.

## Cambios

| Dónde | Qué |
|---|---|
| `shared/components/features/island/Island.tsx` | `ISLAND_DEFAULTS.material`: `"glass"` → `"ink"`. Todas las islas que no piden material pasan a tinta sin tocar las vistas |
| `globals.css`, bloque ISLAS | `.island-ink`: fondo `foreground` 4 % sobre `background` (6 % + filo en oscuro), sombra corta, hilo en `::before` desde `--island-thread`. `.island-glow-brand`/`-ai` definen el hilo (y siguen definiendo el brillo del cristal) |
| `globals.css`, `.glass-control` | `Button variant="glass"` pasa a **tonal** (velo 8 %, filo 10 %, hover 13 %). Se retiran el canto cónico giratorio y `@property --glass-control-angle`. El nombre de la variante se conserva (57 usos) |
| `LabelPanel`, `PasswordShell` | Fuera las variables `--island-glow-at/-mix`, que la tinta ya no lee |
| Pruebas | `Island.test.tsx`: el aspecto por defecto es tinta |
| Documentos | DESIGN §3.2 y §5.2.1; DESIGN-SYSTEM §9.5 (tabla) y §9.5.1 reescrito |

El cristal (`material="glass"`) queda en el sistema, sin uso por defecto.

## Verificación

- `jest` de islas, asistente, Panel, pedidos y autopilot; `tsc --noEmit`; `eslint` de lo tocado.
- Capturas de la app real (Norte Studio) en claro y oscuro: Panel, una isla de IA y una barra de
  acción, a 1440 y 390.
- Pendiente del dueño: `npm run build` y revisar en su ambiente antes de desplegar.
