# Plantillas de Meta en Configuración — inventario y vocabulario (F7, 2026-09-28)

> Regla del dueño: un rediseño no quita funciones. La vista `MetaTemplatesView` se mueve de
> `/marketing/settings/meta-templates` a `/settings/meta-templates` SIN cambiar por dentro;
> la ruta vieja redirige. Lo que cambia es dónde está, cómo se llama la cosa en toda la app y
> con qué regla se elige.

## Paridad de la vista (se mueve entera, sin tocar)
- [x] Selector de canal Cloud, sincronizar con Meta, nueva plantilla, editar/corregir, borrar.
- [x] Fichas de resumen, «Lo próximo», tabla con estado/calidad, sondeo mientras haya en revisión.
- [x] Vacío sin canal Cloud (ahora enlaza a `/settings/channels`, no a `/workspace`).
- [x] `loading.tsx` propio en la ruta nueva; la vieja redirige con `redirect()`.
- [x] Entrada del sidebar bajo Configuración (`meta_templates`, `badge-check`, `marketing:read`) en el seeder del servidor; la pestaña sale de `MarketingSettingsNav`.

## Enlaces corregidos
- [x] «Ir a canales» → `/settings/channels` (antes `/workspace`, página vacía).
- [x] «Ver conversación» del detalle de campaña → `/workspace/inbox/[id]` (antes `/inbox?conversation=`, ruta inexistente).
- [x] Vacío de la bandeja en modo plantillas → `/settings/meta-templates` (antes acciones rápidas).
- [x] Todos los `href` a `/marketing/settings/meta-templates` → `META_TEMPLATES_HREF` (next-up, ajustes de tareas, seguimiento individual y en lote, resumen de marketing).

## Vocabulario único (`src/core/lib/hsm-copy.ts`)
| Antes (seis versiones) | Ahora |
|---|---|
| Plantilla de Meta · Plantillas de WhatsApp · plantilla HSM aprobada · Plantilla aprobada de Meta · Plantilla de respaldo · plantilla de apertura | **plantilla de Meta** (con adjetivo de uso cuando hace falta) |
| «Pasaron más de 24 h y no había plantilla…» · «Fuera de la ventana de 24 h de WhatsApp» · «…y sin plantilla aprobada» · «…se requiere plantilla» | **«Pasaron más de 24 h desde su último mensaje: hace falta una plantilla de Meta»** (`HSM_WINDOW_REASON`; variante `…y no había plantilla de Meta` cuando el envío no la tenía) |
| «24 h» / «24 horas» | siempre **«24 h»** |
| «Cupo de Meta hoy · se renueva cada 24 h» | **«Cupo diario de Meta · se renueva cada día»** (nunca «24 h») |
| «Meta cobra cada plantilla enviada» · «solo se cobra la que Meta entregue» · «esos mensajes sí tienen costo» | **«Meta cobra solo las que entrega.»** |
| Utility / utility / Utilidad / utilidad | `HSM_CATEGORY_LABELS`: **Marketing · Utilidad · Autenticación** |

Sitios tocados: route-skip-reasons, error-messages, crm/task-execution, marketing/skip-reasons,
collections (RemindersTab, ReminderThread), documents (DocumentAutomationForm), channels
(ChannelHealthCard, CoexistenceImportCard, channel-providers), inbox (QuickActionsMenu),
quick-actions (quick-action.ts), marketing (HsmTemplatePicker, CreateHsmTemplateModal,
overview-tiles, MetaTemplatesView), crm (ScheduleFollowUpFields).

Sin tocar a propósito: «plantilla» para los mensajes guardados del tenant («Mensajes»), los
moldes de secuencia y de recorrido y los textos de pedido siguen con su nombre; donde
conviven con una plantilla de Meta, esta va siempre calificada.

## Elegibilidad única (`isUsableAs(template, purpose)`)
| Uso | Regla |
|---|---|
| `campaign` | aprobada y **Marketing** |
| `automation` | aprobada, **no Autenticación**, **sin variables** |
| `opening` (seguimiento individual y en lote) | aprobada, no Autenticación |
| `quick_action`, `document`, `collections` | aprobada, no Autenticación |

Aplicada en: campañas (`isUsableForMarketing`), automatizaciones (`automation.config`),
aperturas (`isUsableAsOpening`). Deuda: acciones rápidas, cobros y documentos escriben el
NOMBRE de la plantilla en un campo de texto (no eligen de la lista), así que no pueden
comprobarla hasta que ese campo sea un selector; queda para otra tanda.

## Deuda documentada
- Acciones rápidas, cobros y documentos: pasar el nombre libre a un selector con `isUsableAs`.
- «24 h» de la importación de coexistencia (CoexistenceImportCard) es OTRA ventana (desde la
  conexión): se deja en «24 h» por formato, con su propia frase.
