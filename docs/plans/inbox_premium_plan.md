# Inbox premium: upgrade de diseño fase por fase

> Plan del 2026-09-26, pedido por la dueña: «planificar el upgrade de diseño del módulo de Inbox, de forma
> profesional, optimizada y eficiente, mejorando el UX y la UI de forma ultra-premium». Rama `feat/inbox-premium`
> (worktree `.claude/worktrees/inbox-premium`), sobre `main` 8dd36c94. Mismo lenguaje que CRM premium, Cobros premium,
> Calidad y la entrega de bienvenida (DESIGN-SYSTEM §9.5–§9.8). Coordinado con `audit-agent`: nadie más tiene trabajo
> abierto en `src/modules/inbox`, `src/modules/workspace` ni `src/app/(private)/workspace`.
>
> | Fase | Qué | Lienzo | Estado |
> |---|---|---|---|
> | F1 | La bandeja: shell del workspace, lista, vistas y el panel sin conversación («Tu día») | — | Por diseñar |
> | F2 | La conversación: cabecera, hilo, eventos de handoff en el hilo, «Por qué está aquí», pie cerrado | — | — |
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

Solo cliente.

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

### F2 · La conversación

Solo cliente.

| Pieza | Queda |
|---|---|
| `domain/conversation-events.ts` (nuevo) | Puro, con test. `describeConversationEvent(event, users)` devuelve un texto legible por tipo y por payload real: `escalated.reason` (`contact_requested_human` → «El cliente pidió hablar con una persona», `tool`, `usage_limit`, `ai_failures`, `unproductive_tools`, `no_ai_runtime`, `operator_missing`), `claimed`, `taken_over` (incluido `via: business_app` → «Respondieron desde el celular»), `returned_to_ai` + la `note` de `note_added`, `closed`/`reopened`, `sla_breached` (`sla_seconds`) y `priority_changed`. `intent_detected` no se pinta en el hilo porque es ruido para el operador. `handoffReason(events)` devuelve el último escalamiento abierto |
| Hilo (`ConversationPanel`) | Los eventos se intercalan con los mensajes como líneas del sistema: punto, texto y hora, centradas y sin burbuja. Una sola petición `events` al abrir, se refresca cuando el WS cambia el modo y pagina con el mismo cursor que los mensajes. Separadores de día en píldora sólida pegajosa. «Escribiendo…» con tres puntos (movimiento reducido: estático). «Mensajes nuevos» sigue en cristal, porque flota |
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
- **D4 · Ancho de la lista.** 288 px (hoy) o 320 px para que quepan las etiquetas de las vistas. El lienzo lo mide a
  1024 px, con canales, lista, chat y rail.

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
7. Sin push a `main` sin la orden de la dueña: push a main es despliegue. Nunca `reset --soft main`; se integra con
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
- **Los eventos no llegan por WS:** se relee `events` cuando cambia el modo. Un evento `conversation.event_added`
  ahorraría esa petición.
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
