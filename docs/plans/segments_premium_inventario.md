# Segmentos premium + MultiSelect — lista de paridad

> Regla del dueño: un rediseño no quita funciones. Todo lo que `/crm/settings/segments`
> y `MultiSelect` hacen hoy (main `498b0f93`) sigue haciéndose. ✅ = conservado en la
> implementación; se marca al cerrar F2.

## Formulario «Nuevo / Editar segmento» (`SegmentsManager.tsx` › `SegmentBuilder`)
- [x] Título «Nuevo segmento» / «Editar «nombre»» (truncado).
- [x] Nombre (obligatorio; vacío → alerta «Ponle un nombre al segmento»).
- [x] Descripción opcional (vacía → `null`).
- [x] Guardar (`createSegment` / `updateSegment`), «Guardando…», alerta de éxito, recarga la lista.
- [x] Cancelar cierra sin guardar.
- [x] Filtros compactados con `compactSegmentFilters` antes de enviar.

## Constructor de audiencia (`AudienceFilterBuilder.tsx`, compartido con el wizard de campañas)
Las once claves del DSL:
- [x] `lifecycle_stage` — Etapas (múltiple, orden `CONTACT_STAGE_ORDER`).
- [x] `source` — Fuentes (múltiple).
- [x] `tag_ids.any` — Con alguna etiqueta (solo si hay etiquetas).
- [x] `tag_ids.all` — Con todas las etiquetas (solo si hay etiquetas).
- [x] `city` — Ciudad (texto).
- [x] `min_score` — Score mínimo (Cualquiera / ≥25 / ≥50 / ≥75).
- [x] `has_open_deal` — Oportunidad abierta (Indiferente / Con / Sin).
- [x] `last_activity_before` — Sin actividad desde (contactos fríos).
- [x] `created_after` — Creados desde.
- [x] `created_before` — Creados hasta.
- [x] `q` — sin control; se conserva al editar (viaja en `value`).
- [x] Resumen legible de lo que filtra (hoy la frase `describeSegmentFilters`).
- [x] Props `value`, `onChange`, `tags`, `idPrefix`, `disabled` sin cambios (CampaignWizard).

## Tarjeta de segmento (`SegmentCard`)
- [x] Nombre + descripción truncados con `title`.
- [x] Total de contactos hoy (skeleton mientras carga, singular/plural).
- [x] Exportar CSV (solo `contacts:export`) + alerta de auditoría.
- [x] Editar, Eliminar (modal de confirmación, alerta).
- [x] Chips de filtros (`segmentFilterChips`) o «Todos los contactos».
- [x] Poner al agente a trabajar (`BulkFollowUpButton`), Inscribir en secuencia.
- [x] Ver contactos: vista previa de 5 (vacía → «Ningún contacto cumple los filtros.»).

## Página
- [x] Contador «N segmentos · se recalculan solos…».
- [x] Estado vacío con la explicación.
- [x] Panel «Nuevo segmento» con botón; formulario sticky en ≥60rem.
- [x] Skeleton de carga.

## `MultiSelect` (`shared/components/features/multi-select.tsx`) — lo que usan sus consumidores
Consumidores: AudienceFilterBuilder (×4), ZoneFormSheet, ContactImportWizard, TagsEditor, quality ConfigStep.
- [x] `options` planas y agrupadas (`heading`); opciones `disabled`; `icon`.
- [x] `defaultValue` + reinicio cuando cambia (`resetOnDefaultValueChange`).
- [x] `onValueChange`, `placeholder`, `maxCount` (+N), `searchable`, `hideSelectAll`, `id`.
- [x] `closeOnSelect`, `emptyIndicator`, `popoverClassName`, `modalPopover`, `deduplicateOptions`, `disabled`, `className`.
- [x] Quitar una ficha sin abrir el popover (clic y teclado).
- [x] Limpiar todo; quitar las que exceden +N.
- [x] Popover: búsqueda, Seleccionar todas, Limpiar, Cerrar; Backspace en la búsqueda quita la última.
- [x] `ref` imperativo: `reset`, `getSelectedValues`, `setSelectedValues`, `clear`, `focus`.
- [x] Anuncios `aria-live` (hoy mitad en inglés → todo en español).

Se retira (ningún consumidor lo usa, tsc lo prueba): `variant`, `animation`,
`animationConfig`, la varita, `responsive`, `singleLine`, `autoSize`, `minWidth`,
`maxWidth`, `asChild`.
