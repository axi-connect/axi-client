# /settings/recognition — inventario de paridad para el upgrade de DS

Vista: `src/modules/agents/ui/components/RecognitionSettingsView.tsx` (ruta `app/(private)/(content)/settings/recognition/page.tsx`).
Regla: el rediseño no quita ninguna función ni dato de esta lista. Marcar ✅ al implementar.

## Estados de página
- [x] Error de carga (mensaje real de `errorMessage`), sin controles
- [x] Esqueletos mientras carga
- [x] Encabezado: «Reconocimiento de producto» + descripción

## 1. Reconocimiento de producto
- [x] Estado Activo / En pausa (cuota agotada) / Desactivado
- [x] Switch `ai_enabled` — optimista con rollback + toast (activado/desactivado)
- [x] Consumo del ciclo `used / limit.value`, barra: aviso ≥80 %, destructivo ≥100 %
- [x] Nota «Cuota agotada» y su explicación
- [x] Sin límite: cifra sin barra

## 2. Índice del catálogo
- [x] Productos indexados / productos + nota de pendientes
- [x] Fotos indexadas / fotos, productos sin foto, fotos pendientes
- [x] «Indexar ahora» → reindex (deshabilitado si `!index.enabled`), relectura a los 4 s
- [x] Aviso «No disponible en la plataforma»; nota «Índice completo»
- [x] Tres «cómo funciona»: Foto directa · Captura de pantalla · Publicación compartida
- [x] Estado nulo: «El estado del índice no está disponible ahora»

## 3. Clasificación automática
- [x] Switch `classification_auto_enabled`
- [x] Con categoría `categorized / products` + nota de pendientes (sin resolver · en cola · sin clasificar)
- [x] Automáticas «sin confirmar», fijadas por el tenant «no se tocan», sin resolver
- [x] «Clasificar catálogo» → backfill
- [x] Estado nulo

## 4. Metadatos con IA
- [x] Estado Automático / Bajo demanda
- [x] Switch `enrichment_auto_enabled`
- [x] Select «Tipo de catálogo» (auto = «Según tu tipo de negocio (X)» + 6 tipos) **con confirmación** (hotfix 2026-09-28) y toast con nuevas/retiradas/conservadas
- [x] Listos `ready / products` + nota de pendientes; editados por el usuario; desactivados
- [x] «Enriquecer catálogo» → backfill (deshabilitado si `!stats.enabled`)
- [x] Aviso plataforma desactivada; nota tope mensual alcanzado; línea `monthly_used / monthly_cap`
- [x] Tres «cómo funciona»: Qué genera · Qué ve el agente · Qué no toca
- [x] Estado nulo

## Endpoints (sin cambios)
GET/PUT `/ai-agents/recognition-settings` · GET `/catalog/recognition/index-status` · POST `/catalog/recognition/reindex` · GET `/usage/summary` · GET `/catalog/enrichment/stats` · POST `/catalog/enrichment/backfill` · GET `/catalog/classification/stats` · POST `/catalog/classification/backfill`
