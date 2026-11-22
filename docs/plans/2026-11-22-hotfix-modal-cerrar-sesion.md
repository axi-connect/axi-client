# Hotfix A — el modal «Cerrar sesión» aparece al volver a entrar

**Estado:** plan. Espera el OK de Cristian antes de programar.
**Base:** origin/main `470a2bbb` (producción).
**Diagnóstico completo:** `axi/docs/qa/2026-11-22-hotfix-tbi-login/diagnostico.md` §A.

## Diagnóstico en una línea

Con la pestaña quieta varios minutos, abrir el modal de cierre hace que el sidebar repita los prefetch de sus 8 enlaces llevando el slot `@modal` = logout. Next guarda esa versión de `/dashboard` y, al volver a entrar en la misma pestaña, el login la usa. El modal nace abierto (`useState(true)`). Lo permite que el slot `@modal` de la raíz **no tiene catch-all**; en `/comercial/@sheet` ya se corrigió el mismo tipo de bug (C1, `3696570e`).

## Arreglo (3 cambios, sin cambio visual)

1. **Catch-all del slot `@modal`** (causa raíz, mismo patrón que C1).
   - Nuevo `src/app/@modal/[...catchAll]/page.tsx`, que devuelve `null`.
   - Así cualquier URL casa con el slot: el servidor deja de «conservar» el segmento del logout y los prefetch hechos con el modal abierto ya no lo arrastran.
   - La interceptada `(.)auth/logout` gana por especificidad.
   - Hay que comprobar que `/` también quede cubierta. `[...catchAll]` no casa con `/`: si la prueba lo pide, se usa `[[...catchAll]]` (opcional).
2. **Cerrar sesión con navegación dura**, en `(.)auth/logout/page.tsx` y en el fallback `(public)/auth/logout/page.tsx`.
   - Tras `await logout()`, `window.location.replace("/")` en vez de `router.replace("/")`.
   - Así se vacía la caché del router y **los stores de la sesión anterior**.
   - Hoy, al entrar con otra empresa en la misma pestaña, la bandeja pidió la conversación y el contacto **de la empresa anterior** (404 en producción a las 03:39:24). Eso es un resto de datos entre cuentas que este cambio también cierra.
3. **El botón «Cerrar sesión» del modal no dispara además «Cancelar».**
   - Hoy `DialogClose` (cierre por defecto desde `744206df`) llama a `onOpenChange(false)` → `router.back()` en carrera con la salida.
   - Se marca `keepOpen: true` en esa acción. La salida la decide `handleConfirm`.

Fuera de alcance: rediseñar el modal y cambiar `Modal` para el resto del panel.

## Pruebas

**Unitarias (jest):**

- El slot `@modal` tiene catch-all que devuelve `null` y la interceptada sigue al lado. Es el mismo test que `comercial/__tests__/sheet-slot.test.tsx`.
- `LogoutConfirmModal`:
  - confirmar llama a `logout` y a `location.replace("/")`, y **no** llama a `router.back()`;
  - cancelar sí llama a `router.back()`.

**Reproducción en build de producción**, con el script `docs/qa/.../evidencia/A-repro-logout.mjs` contra `next start` y la API local con Norte Studio:

| Escenario | Antes | Debe dar |
|---|---|---|
| Prefetch forzado con el modal abierto (rápido, determinista) | modal visible | sin modal |
| Natural: 5,5 min quieto en `/marketing` → cerrar → entrar | modal visible | sin modal |
| Cerrar → entrar de inmediato, ×3 | sin modal | sin modal |
| Sesión vencida → login | sin modal | sin modal |
| «Cerrar sesión» desde el sitio público con sesión | abre modal | abre modal |
| «Cancelar» en el modal | vuelve a la página | vuelve a la página |
| Entrar con otra empresa en la misma pestaña | pide datos de la anterior | sin 404 de la anterior |

**Verjas:**

- tsc con `NODE_OPTIONS=--max-old-space-size=6144`, eslint de los archivos tocados y jest de los tests relacionados.
- Un `next build` para la reproducción.
- Un proceso pesado a la vez, avisando antes.

**Vista:** el modal no cambia. Captura a 390 y 1440 px, claro y oscuro, para comprobar que abre y cierra igual.

## Riesgo y retroceso

- Riesgo bajo: es un archivo nuevo, más dos líneas en el modal y una en el fallback.
- La navegación dura al salir agrega una recarga, que ya ocurre en la sesión vencida.
- Retroceso: volver al despliegue `470a2bbb`.

## Entrega

- Rama `fix/modal-cerrar-sesion` desde main, sin push.
- SHA con tsc a axi-code-agent-2 o axi-code-agent para la auditoría. Despliega solo con el «desplegar» de Cristian.

---

## Implementación (22-nov, OK de Cristian)

Diferencias con el plan:

- El catch-all es **opcional**, `@modal/[[...catchAll]]/page.tsx`, para cubrir también `/`.
  - `next build` lo lista como ruta `ƒ /[[...catchAll]]`, pero **ninguna ruta cambia de tipo**: `/` y `/precios` siguen estáticas con ISR.
  - Con sesión iniciada, una URL inexistente sigue dando **404** «no encontrada».
- **Bug extra encontrado:** «Cancelar» tenía `onClick: handleCancel` **y** el cierre por defecto, que volvía a llamar a `handleCancel`. Hacía dos `router.back()` y retrocedía dos páginas.
  - Ahora hay un solo camino para cancelar (botón, X, Escape o clic fuera): `onOpenChange(false)` → `router.back()` una vez.
- Confirmar: `keepOpen` y botones deshabilitados mientras sale; un doble clic no hace dos cierres de sesión. Si el cierre falla por red, no navega y deja reintentar.

Resultados (build de producción del worktree + API local, Norte Studio):

| Escenario | Antes (470a2bb) | Con el arreglo |
|---|---|---|
| Prefetch forzado con el modal abierto → cerrar → entrar | modal visible | sin modal |
| Natural: 5,5 min quieto → cerrar → entrar | modal visible | sin modal (la navegación a `/dashboard` va **sin** el modal en el árbol) |
| Cerrar → entrar de inmediato | sin modal | sin modal |
| Cerrar desde el sitio → entrar | sin modal | sin modal |
| Sesión vencida → login | sin modal | sin modal |
| Cancelar desde `/marketing` → `/dashboard` → modal | (dos páginas atrás) | vuelve a `/dashboard` (390/1440, claro/oscuro) |

Verjas: jest de `src/app/@modal` **6/6**; con el código anterior fallan 4. tsc 0, eslint 0 y `next build` OK.

Evidencia en `axi/docs/qa/2026-11-22-hotfix-tbi-login/evidencia/A-arreglo-modal-*.png`.

**Fuera de alcance, anotado:** `/comercial/<ruta-inexistente>` responde 200 vacío por el catch-all de C1. Es preexistente.
