# /cmo (Axel): inventario de paridad para el rediseño

Vistas: `src/modules/cmo/ui/CmoView.tsx`, `components/AxelChat.tsx`, `BriefingHero.tsx`, `CmoBoardRail.tsx`, `ProposalCard.tsx`, `CmoActions.tsx`, `ThreadSwitcher.tsx` y `CmoBlockedState.tsx`, más las rutas `app/(private)/cmo/**`.
Regla: la dirección que se elija no quita ninguna función ni dato de esta lista. Puede cambiar dónde vive cada cosa. Se marca ✅ al implementar.

## Barra y acciones
- [ ] Dock sticky «Axel» + avatar vivo (tocar = guiño, 3 toques = saludo; mirada; humor) + fecha de hoy; se acopla al bajar
- [ ] «Conversaciones»: popover con grupos Hoy / Ayer / Antes, «Nueva conversación» arriba y archivar al pasar el ratón; deshabilitado mientras Axel piensa
- [ ] «Nueva conversación», deshabilitada sin mensajes o mientras piensa; el hilo nace en el servidor con el primer mensaje
- [ ] Ajustes → `/cmo/settings`

## Informe (hero)
- [ ] «Hola, {nombre de pila}»
- [ ] Error: «No pude cargar el informe.» + Reintentar
- [ ] Cargando: esqueleto
- [ ] Sin informe (estado normal): «Soy Axel, tu director de mercadeo», «Miro tus números y te dejo propuestas.» y el chip «Primer informe mañana · {hora}»
- [ ] Con informe: h1 = `summary`, «N por decidir» o «Hoy no hay nada que proponer.», el chip «Meta · X %» (enlace a comercial) y hasta 3 highlights con su tono (up/down/warn/neutral)

## Propuestas
- [ ] Tarjeta completa: tipo con icono y tono, estado decidido (aprobada en verde; el resto neutro) o vencimiento (alarma solo < 48 h), título, cifra (headline), por qué (rationale), «Revisar» o «Ver qué quedó» y «N borradores · apagados»
- [ ] `fresh`: anillo cometa, tres vueltas, solo si nació en esta sesión
- [ ] Anclada bajo el mensaje que la anuncia; una decidida se pide por id (`resolveSettled`) y baja de tono
- [ ] Hasta 2 del informe en el hilo, las no ancladas
- [ ] Las propuestas comerciales enlazan a `/comercial/acciones/:id`; el resto al detalle `/cmo/proposals/[id]`, que se abre en una hoja interceptada con URL compartible
- [ ] Panel «Por decidir»: contador, compactas con vencimiento, esqueleto, error + Reintentar y «Estás al día.»
- [ ] Bajo xl: botón flotante con badge de `unseen` (9+), overlay con Escape y `markSeen` al abrir
- [ ] Detalle (`ProposalDetail`): bloques, evidencia, riesgos, borradores, `PlaybookDiff`, aprobar, rechazar con motivo y «guardar como directriz», `ApprovalOutcome`

## Conversación
- [ ] Estado vacío: el conjunto va centrado, con las píldoras «¿Cómo vamos?», «Clientes calientes» y «Ármame una campaña»; el compositor baja y se ancla al primer mensaje (FLIP, sin viaje con reduced-motion)
- [ ] Compositor: «Pregúntale a Axel…» con 4 frases rotando (typewriter), busy, deshabilitado y atenuado si hay bloqueo
- [ ] Pies del compositor: «Nada sale sin tu aprobación.», con candado «Sin análisis hasta el próximo ciclo.» y «Axel está apagado.»
- [ ] `UserBubble`: pendiente y fallido + Reintentar (el texto no se pierde)
- [ ] `AssistantBubble` con el chip «N fuentes» y `fresh`
- [ ] `AssistantQuestion`: solo la del último mensaje está viva, y tiene «escribir en su lugar»
- [ ] `SystemNote`, sin la identidad de Axel
- [ ] Pensando: los pasos en vivo o las frases «Revisando tus números…», «Armando la recomendación…» y «Ya casi…»
- [ ] Streaming: burbuja «escribiendo…» con cursor, fuera del `role="log"` (A2)
- [ ] Autoscroll que solo sigue si ya estabas abajo

## Bloqueos
- [ ] `disabled`: «Axel está apagado» / «Enciéndelo para recibir propuestas.» + «Encender a Axel» (con `cmo:approve`) o «Pídeselo a un administrador.»
- [ ] `quota`: «Axel agotó sus análisis» / «Vuelve el próximo ciclo. Tus agentes siguen atendiendo.» + «Ver ajustes»
- [ ] El bloqueo se pinta dentro del mismo campo, sin dock ni acciones

## Ajustes (`/cmo/settings`): solo cambia el marco
- [ ] El interruptor de Axel, Apariencia (Diadema), Topes del negocio (descuento máximo, audiencia máxima, tope de propuestas, hora del informe, aviso en la app) y Tus directrices (crear, desactivar, origen)

## Realtime y contrato (sin cambios)
Socket `/inbox`: `cmo.turn_started|turn_step|turn_delta|turn_completed|turn_failed`, `briefing_ready` y `proposal_created|decided`; `load()` al reconectar. REST: ask, answer, approve, reject, threads y settings.
