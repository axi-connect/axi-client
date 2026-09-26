# Inbox premium: upgrade de diseño fase por fase

> Plan del 2026-09-26, pedido por la dueña: «planificar el upgrade de diseño del módulo de Inbox, de forma
> profesional, optimizada y eficiente, mejorando el UX y la UI de forma ultra-premium». Rama `feat/inbox-premium`
> (worktree `.claude/worktrees/inbox-premium`), sobre `main` 8dd36c94. Mismo lenguaje que CRM premium, Cobros premium,
> Calidad y la entrega de bienvenida (DESIGN-SYSTEM §9.5–§9.8). Coordinado con `audit-agent`: nadie más tiene trabajo
> abierto en `src/modules/inbox`, `src/modules/workspace` ni `src/app/(private)/workspace`.
>
> | Fase | Qué | Lienzo | Estado |
> |---|---|---|---|
> | F1 | La bandeja: shell del workspace, lista, vistas y el panel sin conversación («Tu día») | https://claude.ai/artifact/WrEnSotKFPTjsQsgjP3WMd | Aprobado el 2026-09-26, en implementación |
> | F2 | La conversación: cabecera, hilo, eventos de handoff en el hilo, «Por qué está aquí», pie cerrado | https://claude.ai/artifact/C3eXTy2imH6Qv7eGRWMMgc | Lienzo publicado, por aprobar (con la D1) |
> | F3 | Escribir y medios: composer, adjuntos, nota de voz, acciones rápidas, burbujas de media, visor | — | — |
> | F4 | El contexto: rail y paneles (Contacto, Adjuntos, Historial, Llamadas) | — | — |
>
> Cada fase sigue la regla de la casa: lienzo publicado → aprobación explícita de la dueña → implementación → render
> medido → verja del auditor. Fuentes de cada lienzo: `docs/design/mockups/inbox-premium/<fase>/`.

## 0. Reglas que mandan

Se heredan todas las de `crm_premium_plan.md` §0, que la dueña pidió de forma expresa al aprobar CRM F1:
- **Nada se desborda:** `min-w-0` en cada hijo con texto, `truncate` + `title`, resúmenes «a · b» que cortan entre
  piezas y el body nunca scrollea en horizontal.
- **Scroll con la barra de Axi** (`.sidebar-scroll` / `axi-scroll`): un scroller por área, de bloque (no
  `flex flex-col`), con `overscroll-contain` y sin `scrollbar-width`/`scrollbar-color`.
- **Piezas del sistema, nunca copias:** `InkIsland`, `Island`, `StatePill`, `Kicker`, `BentoTile`, `BentoFigure`,
  `SegmentedControl`, `Modal`, `Button variant="contrast" | "glass"`, `EmptyState`, `GlassGlyph`.
- **Continuidad, no otro vocabulario:** el coral solo como acción, el estado en su punto con el texto en `foreground`,
  y el violeta solo en lo que dijo o hizo Axi. Nada de cristal ni degradados en superficies de trabajo.

Propias del inbox:
- **Es una vista de APLICACIÓN** (DESIGN-SYSTEM §4.2), no documental. La cadena `data-app-view` → `flex min-h-0 flex-1`
  no se toca: nunca `h-full`, `calc(100svh…)` ni un wrapper de altura en las `page.tsx`. Los scrollers son la lista, el
  hilo, los canales y el cuerpo de cada panel del rail, y ninguno más.
- **Superficies de contenido sólidas** (DESIGN §5.1): lista, hilo, composer y paneles del rail. El cristal queda para
  lo que flota: el aviso «Mensajes nuevos», los menús, el visor de medios y el drawer de canales.
- **La isla, una por pantalla.** En la bandeja es «Lo próximo» (cola), en cristal por defecto. En la conversación, el
  motivo del handoff lleva `glow="ai"`, porque lo dice el agente. La tinta queda para las barras de acción pegadas
  abajo.
- **Tiempo real sin regresiones de rendimiento.** Se conservan los selectores de primitivos del store, el `memo` de
  `ConversationListItem`, el tick de un minuto compartido y el ancla del prepend del hilo. Una pieza nueva que lea
  el store se suscribe solo a lo que pinta, nunca a `conversations` entero.
- **Los tests existentes son el contrato del comportamiento:** 18 archivos y unos 181 casos en inbox y workspace. Un
  cambio de copia se refleja en su test en el mismo commit, y ningún test se borra para dejar pasar un rediseño.
- **Datos: no se inventa nada.** Todo sale de lecturas que ya existen (§6). El programa no toca el servidor. Lo que
  pediría servidor se deja anotado como deuda (§7) y no se diseña como si existiera.

## 1. Diagnóstico: el inbox de hoy

Funciona bien y tiene deuda técnica baja: scroll acotado, maestro-detalle en móvil, rail extensible por registro,
vistas, orden, filtros y lecturas optimistas. Lo que le falta es la capa premium que ya tienen CRM y Cobros:

| Zona | Hoy | Qué le falta |
|---|---|---|
| Shell de canales (`WorkspaceSidebar`) | Degradado `from-muted/50 to-muted` | Es la última superficie de trabajo con degradado: pasa a sólida, con el lenguaje del sidebar del panel |
| Cabecera de la lista | «Inbox» en `text-sm` y cinco vistas en un segmentado donde solo la activa lleva texto | Jerarquía en Nexa y lo accionable delante: cuántos esperan y desde cuándo |
| Fila de conversación | Barra lateral de prioridad, «En cola · 12 min» en ámbar y un contador coral | Estado en su punto con `StatePill`, y «Axi atiende» con el icono violeta en vez de «IA» |
| Panel sin conversación | Glifo y «Selecciona una conversación para empezar» | Es el hueco más grande de la pantalla y no dice nada. Pasa a ser «Tu día en el inbox» con `/inbox/stats` (nuevas, resueltas, cuánto resolvió Axi) y la isla «Lo próximo» |
| Cabecera del chat | Cinco badges pequeños (`text-[10px]`) que compiten | Identidad, una píldora de quién atiende y la acción principal en `contrast`. El resto va al rail |
| Hilo | Burbujas planas y eventos invisibles | Los eventos de handoff (`/inbox/conversations/:id/events`) no aparecen: el operador no sabe por qué la conversación llegó a su cola. Tampoco se distingue «lo escribió Axi» de «lo escribió una persona» |
| Composer | Textarea con borde y avisos sueltos en `text-[10px]` ámbar | Superficie de escritura de un solo bloque y el estado de la ventana de 24 h (`reachability`) antes de escribir |
| Rail de contexto | Paneles correctos pero planos | Fichas `rounded-3xl`, cabeceras en Nexa y el mismo lenguaje que la ficha 360 del CRM F2 |
| Estados | Genéricos | Carga, vacío y error con la silueta real de cada área |

## 2. Idea rectora

**Cada conversación dice quién la tiene, por qué está ahí y qué sigue.** Es la voz del progreso (DESIGN §7.1) llevada
a la atención:
- La bandeja no presume de volumen: dice cuántos esperan y quién sigue.
- La conversación no se abre muda: cuenta por qué Axi la pasó («El cliente pidió hablar con una persona») y cuánto
  lleva esperando.
- El composer no deja escribir a ciegas: dice si la ventana de WhatsApp sigue abierta o si hace falta una plantilla.

Tres materiales, con criterio (`criterio-isla-cristal-tinta`):
1. **Sólido** para todo lo que se lee y se escribe.
2. **Cristal** para lo que flota.
3. **Isla** para la única frase que manda en cada pantalla.

## 3. Fases

### F1 · La bandeja

Solo cliente. **Aprobado por la dueña el 2026-09-26** («me encanta… te apruebo todo»), con un añadido: **un botón para
plegar la columna de vistas y canales al riel de 64 px** del artboard 3, para ganar espacio a voluntad, además del
plegado automático por ancho, que también le gustó. Decisiones que cierra el lienzo:
- **D2:** contador en tinta.
- **D3:** «Lo próximo» en «Tu día» y como franja en el celular.
- **D4:** las vistas en la columna, como Mail; el segmentado queda solo por debajo de `lg`.

**La columna de vistas y canales (`WorkspaceRail`).** Tiene tres modos:
- `auto` (por defecto): riel entre `lg` y `xl` y desplegada desde `xl`;
- `expanded`;
- `compact`.

El botón «Plegar panel» / «Desplegar panel» (`aria-expanded`, `aria-controls`) fija el modo contrario al que se ve y
se recuerda por navegador en `localStorage` (`axi.workspace.rail`, con try/catch). Sin preferencia guardada, el modo
lo pinta el CSS, así que no hay salto al hidratar. En el drawer (<`lg`) siempre va desplegada y sin botón. En el riel,
cada icono lleva un tooltip a la derecha, el conteo de En cola y Contigo, y el punto de estado del canal.

| Pieza | Queda |
|---|---|
| `domain/inbox-summary.ts` (nuevo) | Puro, con test de los dos signos. `queueNextUp(counts, oldestQueued)` devuelve «N esperan · la más antigua desde hace X» o «Nadie espera». `dayStory(stats)` devuelve «Hoy entraron N; Axi resolvió el P %», con procedencia y sin porcentajes negativos. `rowState(conversation, now)` da la píldora de la fila: En cola · X / Axi atiende / Contigo / Cerrada |
| `WorkspaceSidebar` | Superficie sólida, sin el degradado. Secciones con `Kicker` y conteos `tabular-nums`. Canal con su punto de estado (conectado, desconectado, QR pendiente) y el texto en `foreground` |
| `InboxListHeader` | Título «Inbox» en Nexa con el total y un subtítulo vivo («3 esperan · la más antigua 12 min»). Buscador en píldora. Vistas en el `SegmentedControl` del DS; si 288 px no alcanzan para las etiquetas, el lienzo prueba un rail de 320 px. Orden y filtros compactos. Chips de filtro con `sidebar-scroll` horizontal |
| `ConversationListItem` | Nombre y hora, preview con icono de media, y una tercera línea con `StatePill`: «En cola · 12 min» (tono atención en el punto), «Axi atiende» (icono violeta) o «Cerrada · 24 sep». La prioridad urgente o alta sale como punto, sin barra lateral. El contador de no leídos queda como en hoy o pasa a tinta, según la decisión D2 (§4). Seleccionada: anillo neutro, como en los lienzos de Cobros |
| `InboxNextUpIsland` (nuevo) | La isla de la bandeja, en cristal: «Lo próximo · 3 esperan», la más antigua, y el botón «Atender la primera» (`contrast`), que abre y hace `claim`. Sin cola: «Nadie espera» + «Axi atiende N». Vive arriba de la lista o en el panel vacío, según el lienzo |
| `InboxDayPanel` (nuevo) | Sustituye a «Selecciona una conversación» en md+. Bento `@container` con `/inbox/stats?period=today`: «Entraron hoy» (cifra + serie por hora), «Resueltas» (N · P % Axi, P % equipo) y «Abiertas ahora», más la isla «Lo próximo». Cada ficha con su procedencia. Al fallar: «No pudimos leer tu día» + «Reintentar». El adapter del dashboard (`getConversationStats`, que ya consume `/inbox/stats`) se exporta desde `modules/dashboard/public`. Es un cambio aditivo: `public.ts` hoy no lo expone |
| Estados de la lista | Carga con la silueta de la fila nueva (`ConversationRowSkeleton` actualizado, que comparte el `loading.tsx`). Vacío por vista con su frase («Nadie espera. Axi atiende 12 conversaciones»). Sin resultados con «Limpiar filtros». Error con «Reintentar» |
| Móvil (<md) | Lista a pantalla completa, la isla como franja compacta arriba y el drawer de canales en cristal |
| Deuda que se cierra | Error de `tsc` preexistente en `ConversationPanel.test.tsx(40,3)`, pedido por el auditor: con él cerrado, `tsc` puede exigirse en 0 |

#### F1 · Render medido (§12) — 2026-09-26

Arnés `/root/axi/qa/premium/inbox-f1-render.mjs` + `inbox-f1-seed.py` (con guardia: solo `axi_render`) contra
`next dev` (:3001) y la API dist. El escenario:
- canales en los cuatro estados;
- cola con urgente, alta y 99+;
- conversaciones tuyas, del equipo y de Axi, y cerradas;
- nombres de 45+ y una preview de 300 caracteres;
- el día con 47 entradas y 32 resueltas.

Escenas: bandeja, cola, todas, cerradas, plegada, asomada, desplegada, drawer y foco. En 390, 768, 1024, 1280 y
1440 px, claro y oscuro: **90 capturas sin hallazgos**. Detectores de §5, más el de «el panel scrollea», y el
guardián de memoria acordado con el auditor (pausa si hay menos de 1,5 GB). Evidencia en `D:\axi-qa\premium\inbox-f1`.

Lo que el render corrigió:
- **La columna desplegada a 1024 px** dejaba 184 px para «Tu día» y cortaba la isla. Por debajo de `xl` el botón ya
  no la despliega en su sitio: la **asoma** flotando sobre la lista (`data-peek`, sombra de overlay) y se cierra al
  elegir, con Escape o al tocar fuera. La preferencia guardada solo manda desde `xl`.
- **Clases armadas en tiempo de ejecución** (`${v}:inline-flex`), que Tailwind no genera. Ahora son literales.
- **La X del `Sheet` compartido** medía 16 px y se llamaba «Close». Ahora mide 36 px y se llama «Cerrar».
- **La frase de «Todas abiertas»** se cortaba en 320 px. Ahora ocupa hasta dos líneas.
- **Dos iconos de panel iguales en el celular:** el del menú de la app y el del drawer. El del drawer pasa al icono
  de bandeja.

Verjas locales:
- `tsc` en **0**: cerrado el preexistente de `ConversationPanel.test.tsx`.
- `eslint` con 0 errores. Queda el aviso preexistente de `ConversationPanel`.
- jest de inbox, workspace, `shared/ui` y loading: 34 suites y 309 tests.

Tests nuevos:
- de los dos signos en el dominio;
- de frescura con reloj falso, incluida la pestaña que vuelve a visible;
- del 403;
- de N+1 con 50 filas;
- de plegar, asomar y recordar;
- de «Atender a …».

La suite completa y `next build` los corre el auditor en la verja combinada.

### F2 · La conversación

Solo cliente.

| Pieza | Queda |
|---|---|
| `domain/conversation-events.ts` (nuevo) | Puro, con test. `describeConversationEvent(event, users)` devuelve un texto legible por tipo y por payload real: `escalated.reason` (`contact_requested_human` → «El cliente pidió hablar con una persona», `tool`, `usage_limit`, `ai_failures`, `unproductive_tools`, `no_ai_runtime`, `operator_missing`), `claimed`, `taken_over` (incluido `via: business_app` → «Respondieron desde el celular»), `returned_to_ai` + la `note` de `note_added`, `closed`/`reopened`, `sla_breached` (`sla_seconds`) y `priority_changed`. `intent_detected` no se pinta en el hilo porque es ruido para el operador. `handoffReason(events)` devuelve el último escalamiento abierto |
| Hilo (`ConversationPanel`) | Los eventos se intercalan con los mensajes como líneas del sistema: punto, texto y hora, centradas y sin burbuja. Una sola petición `events`, solo para el hilo activo (nunca por fila de la lista). Se invalida con los eventos WS de handoff que ya escucha `use-inbox-socket` y pagina junto con el prepend de mensajes. Separadores de día en píldora sólida pegajosa. «Escribiendo…» con tres puntos (movimiento reducido: estático). «Mensajes nuevos» sigue en cristal, porque flota |
| `HandoffReasonIsland` (nuevo) | Arriba del hilo, en `human_queued` o recién escalada: `InkIsland glow="ai"` con «Axi te la pasó · hace 12 min», el motivo en una frase y, si hay, la nota. Acción `contrast` «Atender». Se pliega a una línea cuando el operador ya respondió |
| `ConversationHeader` | Una fila con avatar, nombre truncado y «Canal · esperando X», la píldora de quién atiende («Axi atiende», «En cola · 12 min», «Contigo», «Con Laura») y a la derecha el responsable, la acción principal (Atender / Intervenir / Cerrar) en `contrast` y el menú ⋮. La etapa, el score y las etiquetas salen de la cabecera y se ven en el panel Contacto (F4); en móvil se accede con un toque en la identidad |
| `MessageBubble` | Entrante sólida (`bg-muted`). Saliente según la decisión D1 (§4). Lo que escribió Axi lleva el kicker «Axi» con el icono violeta, y lo de una persona su nombre, o «Celular» si salió de la app del negocio. Estados de entrega con iconos de 14 px y `title`. El fallo en rojo semántico con «Reintentar» como botón de 24 px, no como enlace subrayado. Los mensajes seguidos del mismo autor se agrupan (hora solo en el último del grupo). Anchos máximos por `@container` y no por `%` fijo |
| `ClosedConversationFooter` | Barra sólida con «Resuelta el 24 sep a las 3:10 p.m. · por Laura» (el actor del evento `closed`) |
| Estados | Hilo cargando con la silueta de burbujas alternadas. Error «No pudimos leer la conversación» + «Reintentar». Sin mensajes: «Aún no hay mensajes» |

### F3 · Escribir y medios

Solo cliente.

| Pieza | Queda |
|---|---|
| `domain/reply-window.ts` (nuevo) | Puro, con test. A partir de `GET /conversations/contacts/:id/reachability` (hoy sin uso en el cliente) da «Ventana abierta · quedan 3 h», «La ventana de 24 h se cerró: envía una plantilla» o «Canal desconectado», con el tono del punto |
| `Composer` | Un solo bloque `rounded-2xl` con adjuntar, acciones rápidas y voz dentro y el envío en coral. Crece hasta 8 líneas con scroll de marca. Cuando no se puede escribir (Axi atiende o está en cola) muestra una línea con la acción: «Axi está atendiendo · Intervenir». Encima, la línea de la ventana de 24 h (solo WhatsApp) y «Sin tiempo real: se envía por HTTP», en `StatePill` y no en `text-[10px]` ámbar |
| `AttachmentTray` | Miniaturas de 56 px con progreso, error y quitar, todo con objetivos de 24 px |
| `VoiceRecorderBar` | Onda o nivel, tiempo `tabular-nums` y descartar / enviar |
| `QuickActionsMenu` | Popover en cristal (flota) con buscador y vista previa de lo que se va a enviar |
| Burbujas de media | Imagen y video con esquinas continuas y relación fija (sin salto al cargar). Audio con reproductor propio y la transcripción plegable. Documento como ficha con icono, nombre truncado y peso. Ubicación con mapa estático o ficha. `ProductRecognitionChip` con el lenguaje del chip del catálogo |
| `MediaLightbox` | Cristal oscuro a pantalla completa, flechas, descarga y Escape |

### F4 · El contexto

Solo cliente.

| Pieza | Queda |
|---|---|
| `ContextRail` | Iconos de 36 px con la píldora activa del DS y tooltip a la izquierda |
| `ContextPanel` | Cabecera con `Kicker` + título en Nexa y cierre de 36 px. Mismo comportamiento responsive (xl en línea, <xl flotante con scrim, <md a pantalla completa) |
| `ContactPanel` | Ficha como la 360 del CRM F2 en pequeño: identidad, etapa en `StatePill`, «Qué tan cerca está» (tramos, reutilizando `scoreProgress` del CRM F2, que se exporta desde `crm/public` como cambio aditivo), datos del cliente y etiquetas con su color (aquí sí hay sitio). Pie fijo con «Programar seguimiento» y «Ver ficha completa» |
| `AttachmentsPanel` | Rejilla por categoría con `SegmentedControl` y miniaturas uniformes |
| `HistoryPanel` / `CallsPanel` | Línea de tiempo (DESIGN-SYSTEM §9.6) con el mismo `describe*` del CRM y de Llamadas |

## 4. Decisiones que se muestran en el lienzo para que decida la dueña

- **D1 · Burbuja saliente.** Hoy la burbuja saliente es coral sólida: es la mayor mancha de coral del producto y el
  coral es el color de acción (DESIGN §3.1). Variantes en el lienzo de F2:
  - (a) coral, como hoy;
  - (b) tinta (`foreground` / `background`);
  - (c) sólida neutra con borde.
  Recomendación: (b), porque separa escribir de actuar y deja el coral para Enviar, Atender e Intervenir.
- **D2 · Contador de no leídos.** Coral (convención de mensajería) o tinta. Recomendación: seguir la D1.
- **D3 · Dónde vive «Lo próximo».** Arriba de la lista (siempre visible) o solo en el panel vacío (más limpio).
  Recomendación: en el panel vacío en md+ y como franja compacta en móvil.
- **D4 · Dónde viven las vistas.** El lienzo de F1 propone sacarlas del segmentado y llevarlas a la columna de
  canales, como los buzones de Mail: cada una con su nombre, su conteo y su icono. La lista gana su título («En
  cola») y la frase viva. Un control del lienzo compara con el segmentado de hoy. Con eso la lista queda en 320 px.
  En 1024 px la columna pasa a riel de 64 px (iconos, conteo y punto de estado) para que el panel quepa. En el
  celular, el segmentado se queda en la lista y las vistas y canales viven en el drawer.

## 5. Render medido y verjas (cada fase)

1. `tsc` en 0. Tras F1 ya no queda el error preexistente.
2. `next lint` con 0 errores.
3. `jest` de inbox, workspace y shared.
4. Render medido (DESIGN-SYSTEM §12) a 390, 768, 1024, 1280 y 1440 px, en claro y oscuro. Arnés
   `/root/axi/qa/premium/inbox-f<N>-render.mjs` + `inbox-f<N>-seed.py`, sobre la base aparte `axi_render` (nunca
   `axi_connect`). La siembra cubre:
   - nombres de 45 caracteres;
   - una preview de 300 caracteres;
   - una cola de 99+;
   - una conversación urgente y una cerrada;
   - todos los tipos de media;
   - un mensaje fallido;
   - eventos de cada tipo;
   - la ventana de 24 h vencida.

   Detectores:
   - desbordes;
   - objetivos menores de 24 px;
   - texto recortado sin «…»;
   - scroller sin la barra de marca;
   - texto partido;
   - **scroll del panel** (el hilo debe ser el único scroller: la regresión histórica de §4.2).
5. Commit en `feat/inbox-premium` y el SHA al `audit-agent` para la verja combinada (jest + next build + tsc).
   Aviso antes de lanzar trabajo pesado: una sola tarea pesada a la vez (9,9 GB).
6. Evidencia en `/root/axi/qa/evidencia/premium/inbox-f<N>/` (D:).
7. **Añadidos por el auditor (2026-09-26):**
   - **Contrato:** los tipos de `events`, `reachability` y `stats` salen SOLO de `src/core/api/schema.d.ts`, nunca
     escritos a mano. El auditor regenera el esquema desde el openapi de `origin/main` y exige un diff vacío: si un
     endpoint no está en el openapi, la fase no es «solo cliente».
   - **Suite completa si se toca `src/shared`:** el subconjunto de jest no alcanza, y el auditor corre la suite entera
     en la verja combinada.
   - **Accesibilidad en los detectores:**
     - foco visible en la lista y el composer;
     - `aria-live` en los mensajes entrantes (sin anunciar el historial al hacer prepend);
     - `prefers-reduced-motion` en las píldoras, en «Escribiendo…» y en el panel vacío.
   - **Guardia de base en la siembra:** el script se niega a correr si la base no es exactamente `axi_render`. Ni
     `axi_connect` ni `axi_qa`.
   - **Integración:** merge contra un merge-base fijo, y antes de mandar el SHA,
     `git diff --name-only <merge-base> <tip>`. Solo debe listar archivos de inbox o workspace, y los de shared
     acordados.
8. Sin push a `main` sin la orden de la dueña: push a main es despliegue. Nunca `reset --soft main`; se integra con
   merge y se verifica el diff contra otras sesiones.

## 6. Lecturas que usa el programa (todas existen)

| Lectura | Hoy en el cliente | Uso |
|---|---|---|
| `GET /inbox/conversations`, `/inbox/counts` | Sí | Lista, vistas y subtítulo vivo |
| `GET /inbox/stats?period=today` | Solo el dashboard | «Tu día» (F1) |
| `GET /inbox/conversations/:id/events` | No | Eventos en el hilo e isla del motivo (F2) |
| `GET /conversations/contacts/:id/reachability` | No | Ventana de 24 h en el composer (F3) |
| WS `/inbox` (mensajes, modo, typing, leídos) | Sí | Sin cambios de contrato |
| Contexto del contacto (`crm/public`) | Sí | Panel Contacto (F4) |

## 7. Deuda de servidor anotada (no se diseña como si existiera)

- **`conversation.message_status` no se emite:** entregado y leído siguen siendo best-effort. El lienzo no promete
  el doble check azul como dato firme.
- **Solo parte de los eventos llega por WS.** El socket ya emite `conversation.escalated`, `claimed`, `taken_over`,
  `returned_to_ai`, `sla_breached` y `status_changed`, y con ellos se invalida `events`. `note_added` y
  `priority_changed` no tienen evento WS. Por eso `events` de la conversación ACTIVA se relee al abrirla y con el tick de un minuto mientras la pestaña está visible (`visibilityState === "visible"`); en una pestaña oculta no se relee, y al volver a visible se relee en el acto (`visibilitychange`), sin esperar al tick. Un test lo fija: con reloj falso, abrir hace 1 petición, cada minuto visible suma 1 una pestaña oculta no suma ninguna y pasar de oculta a visible suma 1 de inmediato. Nadie debe leer esas dos líneas como en vivo. Un `conversation.event_added` genérico cerraría ese
  hueco.
- **El motivo libre del handoff por herramienta se pierde.** El tool `human_handoff` recibe `args.reason` (la razón
  que escribe el agente), pero el evento `escalated` guarda solo `reason: 'tool'`
  (`conversation_processing.processor.ts`). La isla de F2 dice entonces «Axi decidió que esta la atienda el equipo».
  Si el servidor guardara `detail: args.reason` en el payload, la isla contaría la razón real. Es un cambio pequeño
  y opcional.
- **`reopened` no lo emite nadie.** El tipo existe en el DTO, pero ningún caso de uso lo escribe, así que el pie de
  una conversación cerrada no promete que «se reabre sola».
- **La prioridad no se puede cambiar desde el cliente** (no hay endpoint), así que queda de solo lectura.
- **La tarea anotada por Cobros** (el panel `orders` del rail, medios de WhatsApp Web y `delivered`) se contrasta con
  el código al abrir F3/F4. No se hereda sin verificarla.

## 8. Riesgos

| Riesgo | Mitigación |
|---|---|
| Regresión del scroll acotado (§4.2) | Detector de «scroll del panel» en el arnés y test de la cadena de alturas |
| Re-render por mensaje en la lista | Selectores de primitivos y `memo`; las píldoras nuevas son puras sobre la fila |
| El ancla del prepend del hilo se rompe al intercalar eventos | Los eventos entran en el mismo `groupMessagesByDay` con clave estable y el ancla mide antes y después igual que hoy |
| Tests de copia | La copia nueva se actualiza en su test en el mismo commit |
| **Permisos de «Tu día».** `/inbox/stats` exige `conversations:read`, verificado en `inbox.controller.ts` (el mismo permiso que la lista), así que un agente con acceso al inbox lo lee | El arnés entra también con el rol de agente. La UI tiene respaldo: con 403 o error, el panel se queda con la isla «Lo próximo» (sale de `counts`) y esconde el bento en vez de pintar un error |
| **N+1.** `reachability` es por contacto y `events` por conversación | Las dos se cargan solo para la conversación abierta, nunca por fila. Hay un test que cuenta las peticiones al pintar una lista de 50 |
| **Frescura.** `stats`, `events` y `reachability` pueden quedarse viejos | `stats` se refresca cuando cambian los `counts` (los mismos eventos WS que ya los actualizan), con un mínimo de 60 s. `events` se invalida con los eventos WS de handoff (§7). `reachability` se relee con cada mensaje entrante del contacto (abre la ventana) y el tick de un minuto recalcula lo que queda, sin volver a pedirla. Con tests que simulan el evento WS |
| **Zona horaria.** «Hoy», la ventana de 24 h y los separadores de día | Se calculan en la zona del negocio con `core/lib/business-time.ts` (`businessDayKey`, `todayKey`), nunca con la del navegador. Tests cerca de la medianoche (23:30 y 00:30 del negocio) por los dos lados: Cobros tuvo un error UTC/`daysUntilService` exactamente así |
| **URLs firmadas de medios** (TTL 300 s) | Se mantiene `use-attachment-url`: caché de módulo con renovación a 30 s del vencimiento y `refresh()` en el `onError` de `<img>/<audio>/<video>`. Las burbujas nuevas de F3 no guardan la URL en su estado |
