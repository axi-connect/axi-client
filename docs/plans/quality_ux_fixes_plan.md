# Plan: correcciones de UX del módulo quality y de «Entrar como soporte»

## Contexto
El dueño revisó en producción el upgrade premium de quality y encontró cinco fallos:
1. los scrolls del chat del simulacro no usan el estilo de marca;
2. el auto-scroll al enviar un mensaje mueve toda la página;
3. «Entrar como soporte» no sirve;
4. en pantallas bajas se corta la parte superior del simulacro;
5. la tabla de escenarios se desborda.

Los cambios de quality son solo del cliente. El punto 3 se detalla en su sección.

Se trabaja en un worktree `fix/quality-ux` (cliente y, si hace falta, servidor), con el plan en `docs/plans/quality_ux_fixes_plan.md`, igual que en fases anteriores.

---

## 1. Scrollbar de marca como regla del DS
**Hallazgo:** el estilo existe, pero se llama `.sidebar-scroll` (`src/app/globals.css:1061-1073`). Solo funciona en WebKit y no tiene respaldo para Firefox. No está documentado en `docs/design/DESIGN-SYSTEM.md`. El simulacro no lo aplica en ninguno de sus scrollers.

**Cambio:**
- En `globals.css`, crear la clase **`axi-scroll`** con el mismo tratamiento mejorado:
  - pulgar de 6 px con el degradado radial `--axi-brand` actual;
  - riel transparente;
  - en hover, el pulgar se hace más visible (`color-mix` con `--axi-brand`);
  - respaldo estándar `scrollbar-width: thin; scrollbar-color: color-mix(in oklab, var(--axi-brand) 55%, transparent) transparent` dentro de `@supports not selector(::-webkit-scrollbar)`, para que Chrome no pierda el degradado.
- Dejar `.sidebar-scroll` como alias del mismo selector, para no tocar sus usos actuales (PlatformShell, dialog, AssistantChatShell, sidebars).
- Aplicar `axi-scroll` en todo scroller del simulacro:
  - `SessionTranscript.tsx:58`;
  - el `<ol>` de `SessionsRail.tsx:56`;
  - los `TabsContent` de `SessionInspector.tsx:39,42`;
  - el envoltorio de nueva sesión `SimulatorView.tsx:44`;
  - la lista de `ItemsRail` del etiquetado.
- Añadir una sección nueva en DESIGN-SYSTEM, **§4.3 «Scroll de marca»**, con estas reglas:
  - todo contenedor `overflow-*-auto` lleva `axi-scroll`;
  - excepción: las tiras horizontales que ocultan su scrollbar, como `segmented.tsx`;
  - el auto-scroll de un chat se hace en su propio contenedor, nunca con `scrollIntoView` (ver el punto 2).

## 2. Auto-scroll del chat dentro de su contenedor
**Causa:** `src/core/hooks/use-auto-scroll.ts:45-52` usa `bottomRef.scrollIntoView()`, que desplaza también el scroller del panel (`div[data-app-scroll]`). Por eso la página sube o baja y la cabecera del chat queda bajo el header sticky. Además, `SessionTranscript.tsx:42-47` repite el scroll en un segundo `useEffect`.

**Cambio en el hook compartido:** `scrollToBottom` hará `containerRef.current.scrollTo({ top: scrollHeight, behavior })`.
- Si no hay contenedor, se mantiene `scrollIntoView` como respaldo.
- Se conserva la firma, así que `AssistantChatShell` (Axel y Alba), que tiene la misma exposición, también queda corregido.
- En `SessionTranscript`, quitar el `useEffect` duplicado y dejar que el hook decida con `deps` e `isNearBottom`.
- Al enviar un mensaje propio, el scroll va al fondo aunque el operador no estuviera cerca del final (patrón de mensajería). Si llega una respuesta del agente y el operador está leyendo más arriba, no se le mueve.
- Un test unitario del hook comprueba que llama a `scrollTo` del contenedor y no a `scrollIntoView`.

## 4. Responsive del simulacro en pantallas bajas
**Causas:**
- (a) `SimulatorView.tsx:44` centra con `lg:items-center` dentro de una caja con `overflow-y-auto`. Cuando el formulario es más alto que la celda, el excedente superior queda fuera de alcance. Por eso se ve cortado «Nueva sesión» en la captura.
- (b) La rejilla usa `xl:h-[calc(100dvh-16rem)]` más `min-h-[620px]`, y a nivel lg una fila fija de 640 px. Esa resta del header a mano la prohíbe el DS en §4.2 (l.172).
- (c) El `scrollIntoView` del punto 2.

**Cambio:**
- En el envoltorio de nueva sesión, `items-start` con `my-auto` en el formulario (centrado seguro: si no cabe, empieza arriba y hace scroll).
- Convertir el simulacro en vista de aplicación según DS §4.2:
  - `data-app-view` en la raíz de `SimulatorView`;
  - la cadena `flex min-h-0 flex-1` desde el layout de quality hasta la rejilla, sin calc;
  - así la rejilla ocupa exactamente el alto que queda bajo el título y las tabs, y cada columna hace su propio scroll.
  - El layout de quality (`src/app/platform/(admin)/quality/layout.tsx`, hoy `space-y-6`) pasa a `flex min-h-0 flex-1 flex-col gap-6`, y la vista del simulacro lleva `flex-1`. Las demás tabs siguen como vistas de documento: sin `data-app-view`, la página hace scroll como hoy.
- Suelo de alto: `min-h-[480px]` en la rejilla para que en alturas muy bajas (menos de ~620 px) la página haga scroll en lugar de aplastar el chat.
- A nivel lg, la fila de 640 px pasa a `grid-rows-[minmax(480px,1fr)_auto]`.
- Encabezado del formulario de nueva sesión más compacto en alturas bajas: variante `[@media(max-height:760px)]:` con `p-4` y `space-y-4` en lugar de `p-6` y `space-y-5`, y texto de ayuda en una línea.
- De paso se cierran los dos puntos no bloqueantes de la auditoría:
  - el filtro «Omitidos» recortado en el rail entre 1024 y 1440 px;
  - el placeholder de sesión terminada que ocupa 4 líneas a 1280 px.
- Verificar con el arnés de render (`docs/qa/quality/premium/arnes/shoot.js`) en 1366×768, 1280×720, 1024×700, 1440×900 y 1920×1080, en claro y oscuro, midiendo que ningún panel quede cortado arriba.

## 5. Tabla de escenarios desbordada
**Causa:** en `scenarios/scenarios-table.config.tsx`, la celda «Etiquetas» es un `<span className="truncate">` en línea. `truncate` no funciona sin bloque ni ancho máximo, así que la cadena completa ensancha la tabla más allá del contenedor. El `useResponsiveColumns` del DataTable calcula con `minWidth` y no con el contenido real.

**Cambio:**
- La celda pasa a chips:
  - hasta 2 etiquetas como chips neutros (`rounded-full border bg-secondary text-xs`, mismo estilo que `TonePill` pero sin punto);
  - un chip «+N» con `title` que lista el resto;
  - contenedor `flex max-w-[240px] flex-nowrap overflow-hidden`.
- `ScenarioRow.tags` sigue siendo un string por contrato de primitivos. Se parte con `split(", ")` en la celda, o se añade `tags_count` al aplanar.
- Nombre con `block max-w-[260px] truncate` y `title`, y código `whitespace-nowrap`.
- La celda «Origen» deja el badge violeta tintado (no pasa AA en claro, según la regla de los badges tintados). Pasa a `TonePill` neutro con el texto «Sistema» o «Propio», coherente con el lenguaje premium.
- Revisar las otras tablas de quality (runs, suites, datasets, casos) buscando `truncate` en `span` en línea, y aplicar el mismo arreglo si aparece.

---

## 3. «Entrar como soporte»: la sesión de soporte toma el navegador (decisión del dueño 2026-09-26)
**Causa:** el BFF de canje (`src/app/api/auth/support/redeem/route.ts:42-44`) responde 409 `support_session_conflict` si existe la cookie `accessToken` **o** `refreshToken`. Basta la cookie de refresh, que dura 14 días (`support-session.ts:39-41`, `hasTenantSession`). La salida de «ventana privada u otro navegador» no funciona: el token de plataforma solo vive en el `sessionStorage` de la pestaña de la consola, y el código dura 60 s y se borra del hash.

**Diseño:** ya existe la regla de precedencia (`support-session.ts:7-17`): si hay `supportAccessToken`, gana sobre `accessToken` en cada petición, no se refresca, y un 401 borra solo esa cookie. Por eso se puede quitar el bloqueo sin mezclar identidades en ninguna petición. La cookie del cliente no se toca y vuelve sola al terminar.

**Cambios (cliente):**
- **Canje** (`api/auth/support/redeem/route.ts`): quitar el 409 por `hasTenantSession` y dejar solo `setSupportCookie`. Las cookies del tenant no se tocan ni se borran. Actualizar el comentario de las l.26-28 con la nueva regla.
- **Auditoría de precedencia:** revisar cada lectura de `COOKIE_NAMES.accessToken` y comprobar que pasa por `supportAccessToken || accessToken` (un helper único en `shared/auth/support-session.ts`, p. ej. `activeAccessToken(store)`). Rutas a revisar:
  - `api/proxy` (ya lo hace);
  - `api/auth/session`, `api/auth/token` (WebSocket), `api/auth/logout` y `api/auth/password/*`;
  - `core/services/http.ts:152` (RSC);
  - las descargas y exportaciones por enlace directo (`core/lib/download.ts`, `imports-service.adapter.ts`).

  La que lea `accessToken` a secas se cambia al helper.
- **Refresco durante soporte:** `auth.handlers.ts:104-107` ya se niega a refrescar bajo soporte. El `accessToken` del cliente puede caducar mientras tanto; al terminar, el proxy lo renueva con la `refreshToken`, que sigue viva. No se cambia nada, solo se verifica.
- **Coherencia entre pestañas:** nuevo `shared/auth/auth-channel.ts` con un `BroadcastChannel("axi-auth")` que emite `support-started` y `support-ended`.
  - `SupportRedeemFlow` emite `support-started` al canjear. `SupportSessionBar`, al terminar, y el proxy, en la respuesta `support_session_ended`, emiten `support-ended`.
  - El `auth-provider` escucha el canal y recarga la pestaña. Así ninguna pestaña del panel del cliente se queda mostrando datos del tenant propio mientras sus peticiones ya salen como soporte, ni al revés.
  - Respaldo sin BroadcastChannel: volver a pedir `/api/auth/session` en `visibilitychange` y recargar si cambió `support_session`.
- **Barra y fin:** `SupportSessionBar` ya se pinta en toda pestaña bajo soporte (depende de `MeDto.support_session`). Al terminar lleva a `/auth/soporte?fin=1`, con el texto «Sesión de soporte terminada. Tu sesión de cliente sigue activa» y un enlace «Volver a mi panel», si hay cookie de tenant.
- **Pantalla «Falta el código de soporte»:** nuevo copy y acción. Explica que se abre desde la consola **en este mismo navegador**. Si no hay token de plataforma, muestra el botón «Iniciar sesión en la consola» (`/platform/login`). Se retira el texto de «ventana privada», que ya no aplica.
- **Diálogo** (`SupportSessionDialog`): una línea de aviso: «Mientras dure, las pestañas de tu panel de cliente en este navegador pasan a la sesión de soporte».

**Servidor:** sin cambios de código. El canje nunca supo de la sesión de cliente, y el código de un solo uso, el mismo admin, la duración de 15 a 60 min, el guard y la auditoría quedan igual. Solo docs:
- `docs/plans/entrega_bienvenida_plan.md` F3, punto 4: pasa a «la sesión de soporte toma el navegador y restaura la del cliente al terminar»;
- `docs/rules/architecture.md:762`;
- el comentario desactualizado de `auth_support.controller.ts:36-37`, que ahora dice cookie y debe decir `sessionStorage` y cabecera.

La constante `support_session_conflict` se mantiene por compatibilidad, sin emisor.

**Tests:**
- route test del canje: con cookies de tenant devuelve 200, pone `supportAccessToken` y no toca `accessToken` ni `refreshToken`;
- test del helper `activeAccessToken`;
- test del canal: recibe `support-started` y recarga;
- actualizar los tests existentes de `SupportRedeemFlow` y `support-access` que esperaban el 409.

---

## Verificación
- Test unitario de `use-auto-scroll` (`scrollTo` del contenedor) y test de la celda de etiquetas (máximo 2 chips más «+N»).
- Tests de quality y del kit de asistente: `npm test -- --testPathPattern "quality|assistant|use-auto-scroll"`.
- `tsc` y lint acotado. Las suites completas se delegan a la sesión auditora.
- Arnés de render en las 5 resoluciones, en claro y oscuro:
  - simulacro: nueva sesión, chat vivo con más de 20 mensajes (enviar y comprobar que `data-app-scroll.scrollTop` no cambia) y sesión terminada;
  - escenarios: sin scroll horizontal del documento ni de la tabla a 1280 px.
- Soporte, recorrido manual en local (next dev):
  1. cliente logueado en una pestaña y consola en otra;
  2. «Entrar como soporte»: la pestaña nueva entra y la del cliente se recarga con la barra de soporte;
  3. escribir en la ficha del tenant soportado: en la auditoría queda como `imp`;
  4. «Terminar»: las dos pestañas vuelven a la sesión de cliente sin volver a iniciar sesión;
  5. dejar que expire la sesión: 401, `/auth/soporte?fin=1`, y el cliente intacto.
- Entrega a audit-upgrade-design para certificar, con evidencias en `docs/qa/quality/`, y fusión en main según el flujo habitual.
