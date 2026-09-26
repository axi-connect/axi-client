# Captación (F4) — inventario de lo que hay hoy: lista de paridad

Regla del dueño (2026-09-26): el rediseño cambia cómo se ve, **nunca lo que la pantalla hace ni lo que dice**. Cada
vista se cierra marcando esta lista; la auditoría la usa igual. Inventario sacado del código de `modules/prospecting/ui`
sobre `fc90f640`. Textos entre comillas = los de hoy (pueden pulirse, no desaparecer).

## Marco
- [ ] Sub-navegación «Secciones de captación»: Bandeja (con el contador de pendientes — hoy nunca llega, arreglarlo), Búsquedas, Calidad, Fuentes.

## 1. Bandeja
- [ ] Cabecera: «Prospectos descubiertos y a la espera de entrar a tu CRM. Nadie sale de aquí sin que tú lo promuevas.»
- [ ] Embudo: Descubiertos («en total») · En cuarentena («esperando decisión») · Calificados («listos para promover») · Promovidos al CRM («ya son contactos»); zona de cuarentena distinguida de la del CRM; nota del candado «Mientras están en cuarentena ninguna campaña puede escribirles…». Se actualiza al promover/eliminar.
- [ ] Estados: silueta; error con «Reintentar»; vacío por filtros («Ningún lead cumple estos filtros» + «Limpiar filtros») y vacío real («Todavía no ha entrado ningún lead»); sondeo cada 5 s (tope 90 s) mientras una fila busca datos.
- [ ] Barra: búsqueda spotlight («Buscar», abre el lead); acción «Buscar datos de los N que coinciden» (`leads:manage`); «Filtros» con contador; chips quitables + «Limpiar todo»; filtrar vuelve a la página 1 y limpia la selección; 25 por página.
- [ ] Columnas: casilla (solo con algún permiso; fila seleccionable solo si alguna acción aplica) · Lead (nombre → ficha; línea de contacto o «Sin datos de contacto»; «Buscando datos…») · Origen (6 fuentes con su punto) · Calidad del dato (Verificado/Con riesgo/Inválido/Sin verificar/No contactar) · Calidad (cifra o «—», 4 barras por eje de 25, tooltip por eje o «Todavía nadie ha medido este lead…») · Datos (5 puntos neutros + «N de 5», ordenable) · Puedo contactar por · Ciudad · Descubierto.
- [ ] Panel de filtros (hoja): Datos exigidos (Instagram, Teléfono, Correo, Sitio web, Dirección, Facebook; «Todos»/«Al menos uno»); Cuántos datos conocemos (≤5); Índice desde (Cualquiera/40/60/80 con su nombre) y Hasta; Calidad del dato (5, con el aviso de «Con riesgo»); Origen (6); Estado (Nuevo, Calificado, Fuera de tu cliente ideal, En el CRM, Descartado, No contactar); De dónde salió el permiso (5); Puedo escribirle por (WhatsApp/Correo/Llamada o trabajo manual); Ciudad; Descubierto (rango). Botón «Ver N leads» con conteo en vivo + «Limpiar».
- [ ] Selección: textos de página / «N seleccionados» / «Seleccionar los N que cumplen el filtro» (tope 500, ids reales, respeta la búsqueda) / «Quitar la selección» / avisos de tope y truncado. Acciones que cuentan solo sus filas elegibles: «Buscar datos de N» (`leads:manage`, no promovidos ni suprimidos; toast de que no gasta unidades), «Promover N al CRM» (`leads:promote`; confirma > 50; resultado parcial con motivos), «Eliminar N» (`leads:delete`; siempre confirma; nota de los que ya son contactos). Nota del regalo «Buscar datos usa solo las fuentes gratuitas…».
- [ ] Hoja de resultado del borrado: «N eliminados de M», «Se quedaron (K)» con motivo, los que ya no existían, «Entendido».

## 2. Ficha del lead
- [ ] Estados: carga; error (hoy redirige con toast → añadir estado propio con Reintentar); tiempo real (sala del lead, progreso y fin de la búsqueda de datos con sus dos toasts); sondeo de respaldo.
- [ ] Cabecera: «Volver a la bandeja»; nombre (con sus caídas); insignia de calidad del dato y de ciclo de vida; base legal; Puedo contactar por; «{Origen} · descubierto el {fecha}»; «Buscar datos» (`leads:manage`, «Buscando…»), «Volver a revisar» (`leads:manage`, puntaje nuevo), «Descartar» (hoy sin permiso ni confirmación → exigir `leads:manage`).
- [ ] Puedo contactar por: WhatsApp · Correo · Llamada o trabajo manual, cada uno usable / falta el dato / no permitido, con su explicación (tooltip hoy) y nombre accesible.
- [ ] Identidad y contacto: Dirección, NIT, Correo, Teléfono, Sitio web, cada uno con «Copiar»; Perfiles (Instagram, Facebook, LinkedIn, TikTok, WhatsApp) enlazados; aviso de WhatsApp publicado sin permiso; **mapa** (OSM, pin, dirección y coordenadas, ampliar/reducir, atribución); «Datos completados {fecha}».
- [ ] Última búsqueda de datos: nunca buscada (texto de fuentes gratuitas); resumen «N fuentes · X datos nuevos»; estado (Consultando fuentes… / Encontramos N datos / No encontramos nada nuevo); un paso por fuente con los 8 estados (En espera, Consultando…, Encontró datos, Nada que aportar, No respondió, Sin cuenta configurada, No se consultó, Ya la habíamos consultado), campos hallados, detalle y latencia; costo en unidades; «Los datos aparecen arriba en cuanto llegan».
- [ ] Índice de calidad: cifra de 100 o sin puntuar; por eje (Contactabilidad, Identidad, Ajuste a tu cliente ideal, Procedencia) puntos/medibles, barra, «Sobre X de 25 puntos medibles», evidencias pasa/aviso/falla/sin medir.
- [ ] Datos y de dónde salió cada uno: Nombre, Razón social, NIT, Correo, Teléfono, Sitio web, Dirección, Ciudad, Categoría + atributos extra, cada uno con su fuente y «Traído el {fecha}».
- [ ] Promover al CRM (`leads:promote`): texto; lista (base legal, tiene con qué contactarse, WhatsApp permitido o bloqueado con su porqué); botón deshabilitado sin teléfono ni correo; «Quedará con origen «Captación».»; toasts.
- [ ] Ya promovido: «Ya es un contacto de tu CRM», «Ver en el CRM», «Poner al agente a trabajar».
- [ ] Historia del dato: 8 tipos de evento con fuente o actor y fecha; vacío.

## 3. Búsquedas
- [ ] Cabecera y «Nueva búsqueda» (`leads:manage` + alguna fuente disponible); vacío con categorías sugeridas (con y sin permiso); sondeo y tiempo real del progreso.
- [ ] Cada búsqueda: título (etiqueta o consulta), «{consulta} · hasta {tope}», costo (gratis / N unidades), estado (En cola, Buscando, Terminada, Parcial, Falló, Cancelada), barra de avance, «Trajo N · X nuevos (o X de L admitidos) · fuera del filtro · que ya tenías · fuera de tu cliente ideal», fecha; aviso del error o del resultado parcial.
- [ ] Acciones: Detener (en vivo), Repetir (abre la hoja con todo, mapa incluido), Eliminar (`leads:delete`, con vista previa: cuántos se lleva, cuántos se quedan por ser contactos, si está corriendo; resultado o la hoja de resultado).
- [ ] Hoja «Buscar negocios»: Dónde buscar (todas las fuentes; gratis; motivo de las no disponibles); forma de mapa (Qué negocios, Dónde con buscador de lugares, Cuánto a la redonda 1/3/8/20 km con su nombre, **mapa con el radio**); forma web (Qué buscas, «¿No sabes qué escribir?», Ciudad).
- [ ] Opciones avanzadas: Calidad mínima; Datos mínimos (Ninguno, 1–5, aviso de OSM); Y obligatoriamente (6 datos); Solo verificados (necesita verificador de pago); Techo de gasto; frase resumen; aviso de que filtrar no abarata.
- [ ] Cuántos como máximo / Cuántos que cumplan (25/50/100/200/500); nota de canales; «Buscar · gratis» o «Buscar · hasta N unidades»; validaciones; toast.

## 4. Calidad
- [ ] Distribución: Sin puntuar · Verificados · Con riesgo · Inválidos · Sin verificar (cuenta y % de los puntuados); puntaje promedio.
- [ ] Tu cliente ideal: Sectores, Ciudades, Señales buenas, Descartar si mencionan (chips con «Quitar», añadir con Enter o «Añadir», «Sin definir: este criterio no se evalúa»).
- [ ] Cuánto pesa cada cosa: un deslizador 0–60 (paso 5) por eje; «No hace falta que sumen 100».
- [ ] «Guardar y volver a puntuar» + toasts; solo lectura sin `leads:manage`; estado de error (hoy cargador eterno → arreglar).
- [ ] Qué se verifica hoy (5 activas, 2 «sin proveedor») y su nota; leyenda de los cuatro ejes.

## 5. Fuentes
- [ ] «De dónde traemos leads» + texto de las llaves; por fuente: marca, título, subtítulo, Gratis / Consume unidades / No disponible, texto, canales permitidos, motivo de no disponible, atribución (ODbL de OSM). Solo lectura.
