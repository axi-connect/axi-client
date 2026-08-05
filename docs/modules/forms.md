# Módulo `forms` — Formularios de captura (F10)

> Slice `src/modules/forms/`. Ruta: `/settings/forms`. Permisos: `forms:read` (ver) / `forms:manage` (configurar).

## Qué es

El tenant define **los datos que su agente de IA debe conseguir por WhatsApp antes de cerrar** una operación. El enforcement es **server-side**: `form_guard.ts` del backend bloquea `create_order` y `book_appointment` cuando falta un requerido o hay un valor inválido, y el prompt del turno inyecta una sección `## Datos requeridos` con el estado de cada campo. Este slice solo configura la definición.

Hay exactamente **3 formularios por tenant** (unique `company_id, flow` en DB), con **máximo 8 campos** cada uno:

| flow | Cuándo se exige |
|---|---|
| `contact_registration` | Al registrar al cliente **y también al crear un pedido** |
| `order_intake` | Al crear un pedido |
| `appointment_booking` | Al agendar una cita — **no hereda** los del cliente |

### La asimetría que hay que comunicar

`create_order.tool.ts` concatena `contact_registration.fields + order_intake.fields`; `book_appointment.tool.ts` usa **solo** `appointment_booking`. Es contraintuitivo en las dos direcciones, así que la UI lo dice en los tres flujos (`FLOW_NOTES` + `InheritedFieldsNotice`, que además muestra el **contador combinado** de obligatorios). El punto ciego más peligroso: un tenant con 0 campos de pedido y 3 de cliente cree que "no pide nada" cuando pide 3 — por eso el bloque de herencia se pinta también con la lista vacía.

## Contrato

`GET /forms` · `GET|PUT|DELETE /forms/{flow}` (el `flow` es la clave del recurso, no un id).

- **`GET /forms`** devuelve solo las filas **existentes** (0..3), inactivas incluidas. Un flujo sin configurar no aparece. Los faltantes se sintetizan en cliente con `synthesizeForms()` — **no se consume `GET /forms/{flow}`**: para un flujo inexistente sería un 404 garantizado (un error como control de flujo) y triplicaría las requests.
- **`PUT`** es **reemplazo total** de `fields` + `is_active`.
- **`DELETE`** devuelve 204 y es borrado físico de la definición; **no** borra los datos ya capturados (viven en `contact.custom_fields` y `order.intake_data`, sin FK).

Reglas de campo (espejo de `form_fields.schema.ts`): `code` snake_case `/^[a-z][a-z0-9_]*$/` ≤40 · `label` ≤60 · `type` ∈ `text|number|select|date|boolean|phone|email` · `options` 1–12 de ≤60, **obligatorio si `select` y prohibido si no** · `ai_prompt` ≤160 · `position` int ≥0 · máx 8 campos con `code` únicos.

### Tres trampas del contrato, cubiertas en `toUpsertDto()`

1. **`is_active` viaja SIEMPRE.** El backend hace `input.is_active ?? true`, así que omitirlo **reactivaría en silencio** un formulario pausado. Lo impide el **tipo**: `UpsertFormInput.is_active` es requerido aunque el `UpsertFormDto` generado lo declare opcional. No relajar, y **no** añadir un toggle con guardado inmediato: una sola ruta de escritura.
2. **`ai_prompt` se omite si está vacío.** El backend exige `min(1)` cuando el campo está presente → enviar `""` es un 400.
3. **`options` solo si `type === "select"`.** El estado local las conserva al cambiar de tipo (para no perderlas al volver a select) y el mapper las descarta en la frontera del wire.

Y **`position` nunca es un input**: se deriva del índice del array, así que no hay duplicados ni huecos y reordenar es solo mover en la lista.

## Estructura

```
domain/form.ts                  # TS puro: alias de Schemas, topes, diccionarios de copy,
                                #   FlowForm, synthesizeForms, promptLine, effectiveFields,
                                #   CONTACT_COLUMN_CODES, RECOMMENDED_FIELDS
infrastructure/services/form-service.adapter.ts   # listForms / upsertForm / deleteForm
ui/FormsSection.tsx             # el useForm raíz con los 3 flujos
ui/components/                  # FlowTabs, FlowToolbar, InheritedFieldsNotice,
                                #   FieldMasterList, FieldDetailPanel, FieldReadOnlyPanel,
                                #   FlowEmptyState, DirtyActionBar, FormsEditorSkeleton,
                                #   FieldTypeIcon, AddFieldCatalog, AiPromptPreview,
                                #   ConversationPreview
ui/forms/config/form-definition.config.ts  # Zod + fromDto / toUpsertDto / flowIssues
```

Sin `application/` (regla de escape de arquitectura §3.2: CRUD sin lógica de dominio propia) y sin `public.ts` (cero consumidores externos; nacerá si se pinta `order.intake_data` en el rail del pedido).

## Estado: un `useForm`, tres flujos

Los tres flujos viven en un único `useForm<FormsValues>` (`Record<FormFlow, { is_active, fields }>`). Consecuencias:

- **Cambiar de pestaña no pierde el borrador** → no hace falta guard de navegación (que el App Router no permite implementar bien).
- **Dirty por flujo** (`formState.dirtyFields[flow]`) para el punto en la pestaña.
- **Lecturas cruzadas gratis**: la herencia de `order_intake` lee `getValues("contact_registration")`.

La escritura es **por flujo**, así que:

- **No hay `zodResolver` en la raíz.** Un resolver raíz bloquearía guardar el flujo activo por un error en otro flujo. Se valida con **`flowIssues(values, flow)`**, que devuelve los issues con el path ya prefijado (`order_intake.fields.2.code`) listo para `form.setError`.
- **Tras guardar se usa `resetField(flow, { defaultValue })`, no `reset`**: resetear todo marcaría como limpios los borradores sin guardar de los otros dos flujos.

Los flujos son **pestañas de cliente**, no rutas: `GET /forms` trae los tres de una vez, así que cambiar de pestaña es instantáneo y sin refetch. El deep-link se conserva leyendo `?flow=` una vez y sincronizando la URL con `history.replaceState`.

## UX

- **Split maestra/detalle** (`lg:grid-cols-[300px_minmax(0,1fr)]`): el usuario razona a la vez sobre *qué* pide cada dato y *en qué orden*. Debajo de `lg`, el detalle se abre en `DetailSheet`. La lista es un resumen **no editable** — toda la edición vive en el panel, así que hay un solo lugar donde está la verdad.
- **Reordenar**: drag con @dnd-kit (**grip como activador exclusivo**, para que el clic en la fila siga seleccionando) + botones ↑/↓. Anuncios de dnd-kit traducidos y un `aria-live` propio tras cada movimiento (los botones de flecha no anuncian nada solos).
- **`is_active`** es un campo del formulario dirty. Pausar **relaja** la validación (`getActiveForms` solo ve los activos → el guard deja de bloquear): contraintuitivo, así que el copy lo dice.
- **Acento secundario: violeta** (es una vista de IA). **Ámbar prohibido**: los avisos de riesgo van en `bg-secondary` neutro. Coral solo para acción; destructivo con `variant="destructive"`.
- **Sin `forms:manage`**: el panel derecho renderiza un `FieldList` (`<dl>`), no inputs deshabilitados — ocho inputs grises se leen como un formulario roto.
- **404 en DELETE no es error**: es convergencia (otra pestaña lo borró). Se trata como éxito idempotente.

`OptionsInput` vive en `shared/components/features/options-input/` y lo comparten este slice (60 caracteres, máx 12) y el attribute set del catálogo (120, sin tope).

## Las tres piezas que enseñan la feature

**`AddFieldCatalog`** — el alta pasa por un catálogo, no por un formulario en blanco. El `code` no es un detalle técnico: `form_guard.ts` resuelve el valor como `contact[code] ?? contact.custom_fields[code] ?? collected[code]`, así que un campo llamado `address` aterriza en la ficha del CRM y **la IA no lo vuelve a preguntar** en conversaciones siguientes, mientras `direccion_entrega` va a `custom_fields` y nunca se auto-satisface. `RECOMMENDED_FIELDS` ofrece los 10 codes de la whitelist de `save_contact_data.tool.ts` con label, tipo y `ai_prompt` de partida; los ya usados salen como "Ya lo pides". **`document_type` está excluido**: la columna es un enum `cc|ce|ti|pp|nit` y un `select` exige coincidencia exacta con sus `options`, así que la IA le ofrecería «cc | ce | ti | pp | nit» al cliente por WhatsApp.

**`AiPromptPreview`** («Así lo lee tu agente») — la línea **exacta** que inyecta `prompt_composer.service.ts`, en vivo, vía `promptLine()` del domain. Es el antídoto contra el malentendido central: que `ai_prompt` es la pregunta literal. Viendo el `code`, el `[opcional]` y las opciones como piezas separadas se entiende que lo escrito es una **pista**.

**`ConversationPreview`** — burbujas con el vocabulario de `MessageBubble`. Su valor no es mostrar cómo suena una pregunta (no sabemos qué dirá el LLM: de ahí el disclaimer), es el **efecto acumulado**: con ≥5 obligatorios avisa en neutro de que son 5 preguntas antes de poder cobrar. Para `order_intake` muestra la **concatenación** con `contact_registration` vía `effectiveFields()`, y corre sobre el borrador sin guardar.

## Entrada de sidebar

El menú se construye 100% desde `GET /me/navigation`, así que la entrada vive en `UI_MODULE_TREE` de `axi-server/prisma/seeders/security.seeder.ts`, dentro del grupo **Configuración › Automatización** (junto a Acciones rápidas y Avisos automáticos):

```ts
{ code: 'intake_forms', name: 'Formularios de captura', path: '/settings/forms',
  icon: 'clipboard-list', required_permission_code: 'forms:manage' }
```

- `sort_order` **no se declara**: `flattenUiModuleTree` lo deriva de la posición entre hermanos en pasos de 10 (aquí, 30).
- `forms:manage` y no `forms:read` — es una página de configuración, y `forms:read` lo tiene también el operador. Aun así el editor renderiza read-only con solo `forms:read`, porque la URL es alcanzable a mano.
- `path` calza exacto con la carpeta ⇒ **cero entradas nuevas en `NAV_PATH_ALIASES`**, y no está en `UNIMPLEMENTED_NAV_PATHS`.
- `"clipboard-list"` está en el diccionario cerrado `NAV_ICONS` (`src/core/lib/icons.ts`) para mantener el invariante seeder↔frontend, **aunque hoy no se pinte**: `mapNavigation` resuelve el icono solo en profundidad 0 y esta entrada va en profundidad 2.
- Cubierto por `sidebar/__tests__/nav-tree.test.ts` ("emite la entrada de formularios de captura anidada en Automatización").

**Para materializarla en un entorno**: sembrar el RBAC. Ojo con `npm run seed`, que corre el seed COMPLETO — su `seedSalesDemo` hace upsert del formulario `order_intake` del tenant demo y sobrescribiría lo configurado ahí. Para solo el RBAC basta un script que llame a `seedRbac(prisma)`.

## Pendiente

- **Verificación visual**: pendiente de ojo humano (light/dark, layout del split, drag con ratón, y el ítem en el menú). Los 27 tests de componente cubren el mecanismo.
- **Gap del backend**: `book_appointment.tool.ts` valida con el guard pero **no persiste** `scheduling_appointment.intake_data` (la columna existe; `create_order` sí lo hace vía `collectFormData`). El copy de `appointment_booking` no promete "verás estos datos en la cita".
