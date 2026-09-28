# /cmo (Axel): inventario de paridad para el rediseño

Vistas: `src/modules/cmo/ui/CmoView.tsx`, `components/AxelChat.tsx`, `BriefingHero.tsx`, `CmoBoardRail.tsx`, `ProposalCard.tsx`, `CmoActions.tsx`, `ThreadSwitcher.tsx` y `CmoBlockedState.tsx`, más las rutas `app/(private)/cmo/**`.
Regla: la dirección que se elija no quita ninguna función ni dato de esta lista. Puede cambiar dónde vive cada cosa. Se marca ✅ al implementar.

## Barra y acciones
- [x] Isla de tinta sticky «Axel» + avatar vivo (tocar = guiño, 3 toques = saludo; mirada; humor) + fecha de hoy. **Cambio aprobado:** ya no se acopla al bajar; es el escenario L en el vacío y la píldora S con conversación (M mientras trabaja)
- [x] «Conversaciones»: popover con grupos Hoy / Ayer / Antes, «Nueva conversación» arriba y archivar al pasar el ratón; deshabilitado mientras Axel piensa
- [x] «Nueva conversación», deshabilitada sin mensajes o mientras piensa; el hilo nace en el servidor con el primer mensaje
- [x] Ajustes → `/cmo/settings`

## Informe (hero)
- [x] «Hola, {nombre de pila}»
- [x] Error: «No pude cargar el informe.» + Reintentar
- [x] Cargando: esqueleto
- [x] Sin informe (estado normal): «Soy Axel, tu director de mercadeo», «Miro tus números y te dejo propuestas.» y el chip «Primer informe mañana · {hora}»
- [x] Con informe: h1 = `summary`, «N por decidir» o «Hoy no hay nada que proponer.», el chip «Meta · X %» (enlace a comercial) y hasta 3 highlights con su tono (up/down/warn/neutral)

## Propuestas
- [x] Tarjeta completa (lenguaje de /comercial, monocroma, `contrast` + `glass`; **nuevo:** «¿Por qué ahora?» pregunta a Axel): tipo con icono y tono, estado decidido (aprobada en verde; el resto neutro) o vencimiento (alarma solo < 48 h), título, cifra (headline), por qué (rationale), «Revisar» o «Ver qué quedó» y «N borradores · apagados»
- [x] `fresh`: anillo cometa en tinta, tres vueltas, solo si nació en esta sesión
- [x] Anclada bajo el mensaje que la anuncia; una decidida se pide por id (`resolveSettled`) y baja de tono
- [x] ~~Hasta 2 del informe en el hilo~~ **Cambio aprobado (dirección A):** las del informe viven solo en el panel; el hero las cuenta
- [x] Las propuestas comerciales enlazan a `/comercial/acciones/:id`; el resto al detalle `/cmo/proposals/[id]`, que se abre en una hoja interceptada con URL compartible
- [x] Panel «Por decidir»: contador, compactas con vencimiento, esqueleto, error + Reintentar y «Estás al día.»
- [x] Bajo xl: botón flotante con badge de `unseen` (9+), overlay con Escape y `markSeen` al abrir
- [x] Detalle (`ProposalDetail`): bloques, evidencia, riesgos, borradores, `PlaybookDiff`, aprobar, rechazar con motivo y «guardar como directriz», `ApprovalOutcome`

## Conversación
- [x] Estado vacío: el conjunto va centrado, con las píldoras «¿Cómo vamos?», «Clientes calientes» y «Ármame una campaña»; el compositor baja y se ancla al primer mensaje (FLIP, sin viaje con reduced-motion)
- [x] Compositor: «Pregúntale a Axel…» con 4 frases rotando (typewriter), busy, deshabilitado y atenuado si hay bloqueo
- [x] Pies del compositor: «Nada sale sin tu aprobación.», con candado «Sin análisis hasta el próximo ciclo.» y «Axel está apagado.»
- [x] `UserBubble`: pendiente y fallido + Reintentar (el texto no se pierde)
- [x] `AssistantBubble` con el chip «N fuentes» y `fresh`
- [x] `AssistantQuestion`: solo la del último mensaje está viva, y tiene «escribir en su lugar»
- [x] `SystemNote`, sin la identidad de Axel
- [x] Pensando: los pasos en vivo (el anterior con su duración, el actual y «Trabajando · N lecturas») o las frases, **en la isla M**; en el hilo, tres puntos
- [x] Streaming: burbuja «escribiendo…» con cursor, fuera del `role="log"` (A2)
- [x] Autoscroll que solo sigue si ya estabas abajo

## Bloqueos
- [x] `disabled`: «Axel está apagado» / «Enciéndelo para recibir propuestas.» + «Encender a Axel» (con `cmo:approve`) o «Pídeselo a un administrador.»
- [x] `quota`: «Axel agotó sus análisis» / «Vuelve el próximo ciclo. Tus agentes siguen atendiendo.» + «Ver ajustes»
- [x] El bloqueo se pinta dentro del mismo campo, sin dock ni acciones

## Ajustes (`/cmo/settings`): solo cambia el marco
- [x] El interruptor de Axel, Apariencia (Diadema), Topes del negocio (descuento máximo, audiencia máxima, tope de propuestas, hora del informe, aviso en la app) y Tus directrices (crear, desactivar, origen)

## Realtime y contrato (sin cambios)
Socket `/inbox`: `cmo.turn_started|turn_step|turn_delta|turn_completed|turn_failed`, `briefing_ready` y `proposal_created|decided`; `load()` al reconectar. REST: ask, answer, approve, reject, threads y settings.
