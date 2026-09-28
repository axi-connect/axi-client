# /configurar/{token} (Alba): inventario de paridad para el upgrade premium

Vista: `src/modules/intake/ui/SetupView.tsx` (ruta `app/configurar/[token]/page.tsx`).
Regla: el upgrade no quita ninguna función ni dato de esta lista. Se marca ✅ al implementar.
Invariantes: la misma cara que Axel con la diadema fija, un solo avatar vivo, cero timers en reposo, la ficha editable sin turno ni IA, el cierre en solo lectura y el saludo guionizado.

## Estados de página
- [ ] `SetupBlocked`: enlace inválido o caducado, con Alba dormida, título y detalle del servidor, sin culpar a quien lo lee
- [ ] `SetupSkeleton`: Alba quieta y ocupada, con «Abriendo tu conversación…»
- [ ] `SetupDone`: Alba orgullosa, «Listo, {empresa} ya tiene lo suyo», el cierre del servidor (o el texto de respaldo), `SetupNextSteps`, «Revisar lo que anoté» (abre la ficha en solo lectura) y la nota «Puedes volver a este enlace…»

## Conversación
- [ ] Dock con Alba viva (escucha cuando la persona escribe) y la meta «Poniendo a punto {empresa}»
- [ ] El hilo es `role="log"`. Los mensajes con id local (`pending-*`, `assistant-*`) entran animados; los del historial, no
- [ ] `UserBubble` con pendiente, fallido + Reintentar y marca de voz
- [ ] Línea «✓ Anotado · campo · campo» bajo la respuesta de Alba
- [ ] `AssistantQuestion`: solo la última está viva, con los textos «Elige una», «Ya respondida» y «Prefiero contarlo yo» (enfoca el compositor y cierra la hoja)
- [ ] `AssistantThinking` mientras piensa
- [ ] Compositor: «Escribe o dicta…», Enter, busy, deshabilitado sin turnos, dictado solo con `voice_enabled`, y el texto transcrito vuelve para revisarlo
- [ ] Pie del compositor: «Nada se aplica sin que alguien de tu equipo lo revise.» o, sin turnos, «Se acabaron los turnos… Puedes corregir desde la ficha.»

## Ficha («Lo que ya sabemos»)
- [ ] Encabezado: «{filled} de {total} datos · N no aplica(n) · toca cualquiera para corregirlo» o, terminada, «la conversación ya terminó»
- [ ] Progreso en palabras (`progressLabel`) + «X de Y temas» + cápsulas por tema (hecho, en curso, aplazado, pendiente). Un tema aplazado no cuenta
- [ ] Aviso de pendientes: lo que salió de la web (derived) y lo que se propuso por nicho (proposed), en frases separadas
- [ ] Secciones por tema, con la marca «para después» en los aplazados
- [ ] Fila: etiqueta, punto ámbar si es obligatoria y falta, valor o «Sin contestar» o motivo del salto en cursiva, nota del salto, sello de procedencia (violeta derived, coral proposed)
- [ ] Editar en línea: elegir entre opciones, texto largo, lista separada por comas, texto; Enter guarda; Cancelar y Guardar; «No pude entender ese valor» y «No se pudo guardar…»
- [ ] Un dato que no se edita en línea lleva al chat: «Quiero corregir «X».»
- [ ] `SetupListEditor` para las listas estructuradas propuestas (reordenar, nota de handoff, confirmar sin cambios)
- [ ] «Así es» (confirmar), o «Revisar» si lo propuesto es una lista
- [ ] «No aplica», al pasar el ratón en escritorio y siempre en móvil
- [ ] «Sí aplica» (salto por nicho) y «Contestar» (salto de la persona): reabren el dato y, si se puede, entran a editar
- [ ] En solo lectura: sin chevron, sin acciones y sin `<button disabled>`
- [ ] Lista «Temas» con «Luego» y «Retomar»

## Maquetación
- [ ] Escritorio (lg): la ficha siempre a la vista, 380 px a la derecha
- [ ] Móvil: botón `filled/total` en las acciones, que abre la ficha en una hoja con asa y cerrar. **Nuevo:** foco atrapado y devuelto (H7)
- [ ] Aura `.assistant-field` en toda la pantalla

## Cierre (`SetupNextSteps`)
- [ ] Grupos «Ya está en tu cuenta» / «Lo deja aplicado axi», «Tu meta del mes» (meta, ventas necesarias, antes), «Lo pones tú» (dónde) y «Para que atienda de verdad» (paso + dónde). Un grupo vacío no se pinta y las filas no llevan botones

## Endpoints (sin cambios)
Los del adapter `intake-service.adapter.ts`: resolver sesión, turno, guardar, saltar y reabrir campo, aplazar y retomar tema, y transcribir voz.
