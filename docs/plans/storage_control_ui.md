# Control de almacenamiento — parte visual

> Hermano de `axi-server/docs/plans/storage_control_plan.md` (D1–D9). Nada de UI se implementa antes de que la dueña apruebe el lienzo.
> Lenguaje: continuidad premium (DESIGN.md §5.2.1, DESIGN-SYSTEM §9.5–9.8). Bento de fichas blancas, **una** isla por pantalla, tinta en barras de acción, coral como única acción, rojo semántico para eliminar.

## Voz

- Cifras con procedencia: «medido hace 3 min en el disco», «cuota del plan Crecimiento», «ampliada por soporte».
- Sin regaños: «Te quedan 1,2 GB de 15 GB», no «Has consumido el 92 %». Se dice lo que queda, se dice qué hacer.
- Al llenarse (tenant): «Tu espacio está lleno. Los mensajes de tus clientes siguen llegando completos; para subir archivos nuevos, pide más espacio a soporte.»
- Depurar (platform): «Liberarás 3,2 GB en 1.840 archivos. 12 archivos se conservan porque otro mensaje los usa.»

## Platform

### P1 · Almacenamiento (global) — `/platform/storage`, grupo Control
- Ficha **Disco del servidor** (MinIO): barra usado/libre, cifra libre en Nexa, «medido hace N min», tendencia 30 días, estado (ok / 20 % / 10 %). Estado «no disponible» con último valor y antigüedad.
- Ficha **Asignado vs real**: suma de cuotas vs capacidad (sobreventa ×1,4).
- Ficha **Por origen**: clientes / equipo / sistema.
- Isla «Lo próximo» (cristal): tenants al ≥ 80 %, alertas de disco, purgas recientes.
- Tabla de tenants: nombre, plan, usado / cuota (medidor), origen de cuota (plan/override), crecimiento 30 d, estado. Orden por % usado y crecimiento; búsqueda; clic → pestaña Almacenamiento del tenant.

### P2 · Tenant › Almacenamiento — `/platform/tenants/[id]/storage`
- Ficha principal: «Le quedan X de Y», medidor con marca 80 %, fuente de la cuota, botón «Cambiar cuota» (sheet: plan vs override, GB, margen, motivo).
- Desglose por categoría agrupado por origen (clientes, equipo, sistema), barras finas proporcionales.
- Crecimiento por mes (AreaTrend).
- **Depurar**: tarjetas por tipo (media de chats, papelera, grabaciones, imports, PDF, archivos grandes) con «recuperable ≈ X». Al elegir: filtros (tipo de archivo, más antiguos que N meses) → vista previa → barra de acción en tinta «Eliminar 3,2 GB» → diálogo de confirmación fuerte (escribir `ELIMINAR {slug}` + contraseña) → progreso del run.
- **Archivos grandes**: tabla con vista previa, categoría, referencias («usado en 2 mensajes»), selección en lote.
- **Retención**: lista de políticas (tipo · edad · activa), plantilla recomendada, «Próxima ejecución 03:30».
- Historial de purgas.

### P3 · Plan › cuota de almacenamiento
- Campo «Almacenamiento incluido» (GB) en `PlanFormSheet`, fuera del `LimitsEditor`.

## Tenant

### T1 · Mi empresa › Almacenamiento (solo owner/admin, `storage:read`)
- Ficha principal con lo que queda, medidor y procedencia («incluido en tu plan Crecimiento»).
- Desglose por origen/categoría con frases («Fotos y videos que te enviaron tus clientes · 6,1 GB»).
- Estado lleno: banda informativa + CTA «Hablar con soporte».
- Sin cuota: «Sin límite en tu plan», solo desglose.

### T2 · Avisos en subidas
- Composer, fotos de catálogo, recursos, cabecera HSM, imports: con `state = full` el adjuntar se deshabilita con tooltip y el 507 muestra el aviso (píldora de tinta, DESIGN-SYSTEM §9.4).
- Al 80 %: aviso discreto una vez por sesión para admins.

### T3 · Inbox — «Archivo eliminado»
- Burbuja del adjunto purgado: icono del tipo, «Archivo eliminado por política de almacenamiento», sin acción.

## Estados obligatorios en el lienzo
Normal · vacío (tenant nuevo) · al 80 % · lleno · sin cuota · disco no disponible · datos largos (nombres, 6 cifras) · cargando · error por ficha. Anchos 390 / 768 / 1280 / 1440, claro y oscuro.
