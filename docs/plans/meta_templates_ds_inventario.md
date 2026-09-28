# Plantillas de Meta (`/marketing/settings/meta-templates`) — inventario de paridad

Este inventario recoge lo que la vista hace hoy, **después** del hotfix `b0429aa8`, con los textos literales.
Sirve de lista de paridad del rediseño (lienzo «Plantillas de Meta premium»): cada fila se cierra en
`meta_templates_ds_paridad.md` como **se conserva**, **cambia** (con el motivo) o **se corrige**. Nada se quita sin
decirlo.

Archivos:
- Ruta: `app/(private)/(content)/marketing/settings/{layout,loading}.tsx` y `meta-templates/page.tsx`.
- Vista: `modules/marketing/ui/MetaTemplatesView.tsx`.
- Componentes: `ui/components/{CreateHsmTemplateModal,TemplateButtonsEditor,premium,MarketingSettingsNav,MarketingHeader}.tsx`.
- Dominio: `domain/{template-catalog,template-pieces,enums}.ts`.
- Adapter: `infrastructure/services/templates-service.adapter.ts`.

## A. Marco (layout compartido de Configuración)

| # | Hoy |
|---|---|
| A1 | `MarketingHeader`: título «Configuración» y descripción «Los límites que protegen a tus clientes y a tus números de WhatsApp, tus mensajes y tus plantillas de Meta.», con las pestañas del módulo |
| A2 | `MarketingSettingsNav` (`NavTabs surface="inline"`): Ajustes · Mensajes · Plantillas de Meta · Bajas. Acepta `optOutCount`, pero el layout nunca se lo pasa |
| A3 | `loading.tsx`: `FormSkeleton fields={6}`, que no es la forma de la vista |

## B. Vista

| # | Hoy |
|---|---|
| B1 | Intro: «Pasadas 24 h desde el último mensaje del cliente, WhatsApp solo deja escribir con una plantilla aprobada por Meta. Meta suele decidir en minutos (hasta 48 h); mientras haya alguna en revisión, esta pantalla se refresca sola.» |
| B2 | Acciones con `marketing:manage`: «Sincronizar con Meta» (con «Sincronizando…», icono girando y deshabilitado mientras corre) y «Nueva plantilla» |
| B3 | Ficha «Canal»: `Select` con solo los canales `whatsapp_cloud`, cada uno como «{nombre} · {número}». El trigger lleva `aria-label` «Canal de WhatsApp» y `title`; se elige el primero por defecto |
| B4 | Ficha «Aprobadas»: cifra de las aprobadas de marketing, unidad «sirve/sirven para promociones», y debajo «N abre/abren seguimientos del agente» (aprobadas que no son de autenticación) |
| B5 | Ficha «Costo por mensaje entregado»: «≈ US$0,0200» y «Marketing · utilidad ≈ US$0,0008 · tarifa de Colombia» (`TEMPLATE_COST_CO_USD`) |
| B6 | Sondeo: con alguna `pending`, recarga cada 15 s. No lo hace con la pestaña oculta, para a las 80 vueltas (20 min), se cancela al cambiar de canal y calla los errores. **Al parar no se dice** |
| B7 | Tabla (`TableCard`, `@container`, caption sr-only «Plantillas de Meta del canal»):<br>• «Plantilla»: nombre mono truncado con `title`, y «{Categoría} · {idioma} · N variable(s)», o «Meta no la aceptaría».<br>• «Contenido»: `@6xl`, dos líneas.<br>• «Estado en Meta».<br>• «Costo»: `@3xl`.<br>• Acciones: `@xl`; bajo `@xl` bajan a la primera celda.<br>La fila rechazada va tintada en rojo. |
| B8 | Estados (`StatusBadge dot`, `HSM_STATUS_MAP`): «Pendiente» (aviso, transitorio), «Aprobada», «Rechazada», «Pausada», «Deshabilitada» |
| B9 | Nota bajo el estado:<br>• pending: «Meta suele decidir en minutos; puede tardar hasta 48 h.»<br>• rejected: el motivo traducido (seis enums de Meta), o por defecto «Corrige el texto y envíala como plantilla nueva: el nombre queda bloqueado 30 días.»<br>• paused: «Varios destinatarios la marcaron como no deseada. Se reactiva si mejora la calidad.»<br>• disabled: «Meta la deshabilitó por reportes repetidos o una violación de política.»<br>• approved: `whyUnusable` («Solo las de categoría Marketing sirven para promociones» / «Sirve para abrir seguimientos del agente.») |
| B10 | Calidad distinta de GREEN: «Calidad {x}: si baja más, Meta la pausa.» |
| B11 | «Editar», deshabilitado si `!editable`, con `title` = `edit_blocked_reason` (o «Meta no deja editarla ahora») y «. Podrás el {fecha es-CO}.». El mismo texto va en un `<p>` bajo las acciones |
| B12 | Papelera con `aria-label` «Borrar {nombre}», deshabilitada en `disabled` y mientras se borra. Editar y Borrar solo aparecen con `marketing:manage` |
| B13 | Confirmación de borrar, titulada «¿Borrar «{nombre}»?»:<br>• si estaba aprobada: «Estaba aprobada, así que Meta bloqueará ese nombre durante 30 días: no podrás crear otra que se llame igual. Las campañas y reglas que la usen dejarán de alcanzar a los contactos fríos.»<br>• si no: «Se borra en Meta y aquí. Las campañas y reglas que la usen dejarán de alcanzar a los contactos fríos.»<br>Botones «Conservarla» / «Borrar». Avisos: «Plantilla borrada», o el error con «Meta no dejó borrarla» por defecto |
| B14 | Sincronizar: aviso «Meta no devolvió plantillas nuevas» / «N plantilla(s) sincronizada(s)» y recarga. Error por defecto: «Meta rechazó la sincronización» |
| B15 | Carga de canales: `TableSkeleton rows=4`. Si `listChannels` falla, se traga el error y cae en B16 |
| B16 | Sin canal Cloud: `EmptyState glyph="connections"`, «No tienes ningún canal de WhatsApp Cloud» / «Las plantillas de Meta viven en la cuenta de WhatsApp Business de un canal Cloud. Conecta uno para poder escribirle a tus clientes pasadas las 24 horas.», con «Ir a canales» → `/workspace` |
| B17 | Error de la lista: `LoadError` «No pudimos cargar las plantillas de Meta» (o el error mapeado), con «Reintentar» |
| B18 | Carga de la lista: `TableSkeleton` |
| B19 | Lista vacía: «Este canal no tiene plantillas» / «Sin una plantilla aprobada, el agente no puede escribirle a quien lleve más de 24 h sin responder.», con «Crear la primera» (`canManage`) |
| B20 | No hay buscador, filtros ni paginación: el endpoint devuelve todas |

## C. Modal de crear y editar

| # | Hoy |
|---|---|
| C1 | Crear: título «Nueva plantilla de Meta», descripción «Un texto fijo con huecos que se rellenan con datos del contacto. Meta la revisa antes de que puedas usarla.»<br>Editar: título «Editar «{nombre}»», descripción «Meta la revisa otra vez. El nombre y el idioma no se pueden cambiar: son suyos desde que la creaste.»<br>Ancho `sm:max-w-2xl` |
| C2 | Pie: «Cancelar» y «Enviar a revisión de Meta» / «Guardar y reenviar a revisión», con «Enviando…». Guarda síncrona contra el doble envío (hotfix) |
| C3 | Solo al crear, «Empieza con una sugerida» con tres tarjetas: «Retomar conversación», «Recordar cotización», «Confirmar interés». Rellenan nombre, texto y ejemplos, y ponen la categoría en utility |
| C4 | Cabecera: «Cabecera», contador `/60`, placeholder «Temporada nueva en Savage», pista «Va en negrita arriba. Admite un solo hueco, y no admite negritas ni cursivas.», «Quitar la cabecera». Error «Escribe la cabecera o quítala» |
| C5 | Pie: «Pie», `/60`, placeholder «Responde SALIR para no recibir más promociones», pista «Sin huecos: Meta no los admite en el pie. Es donde suele ir la salida del cliente.», «Quitar el pie». Error «Escribe el pie o quítalo» |
| C6 | Botones (`TemplateButtonsEditor`):<br>• dos grupos, «Respuestas rápidas» (N de 10) y «Acciones» (N de 4);<br>• tipos «Respuesta rápida», «Enlace», «Llamar», «Copiar código»;<br>• placeholders «Lo que dice el botón», «savage.co/temporada», «573001112233», «TEMP30»;<br>• «Meta admite N como mucho»;<br>• error «Completa cada botón o quítalo». |
| C7 | Aviso de escritorio: «Esta combinación no se ve en WhatsApp de escritorio: a quien la reciba ahí se le pedirá abrirla en el celular.» Con más de 3 añade « Y con más de tres, WhatsApp enseña solo dos y esconde el resto.» |
| C8 | Añadidores punteados: «Añadir cabecera», «Añadir pie», «Añadir botones» |
| C9 | «Nombre interno», placeholder `seguimiento_v1`, pasa a minúsculas, bloqueado al editar.<br>Error: «Minúsculas, números y guion bajo (3 a 120)».<br>Pistas: al crear, «Minúsculas, números y guion bajo. Meta bloquea 30 días un nombre rechazado.»; al editar, «Meta no deja cambiarlo: para otro nombre, crea una plantilla nueva.» |
| C10 | «Idioma»: `<select>` nativo con es_CO, es_MX, es y en_US; bloqueado al editar |
| C11 | «Categoría»: radiogroup de tres tarjetas con icono, costo y descripción:<br>• Utility: «Seguimiento de algo que el cliente inició (cotización, pedido, cita). Aprobación rápida.»<br>• Marketing: «Promociones y ofertas. Revisión más estricta y unas 25 veces más cara.»<br>• Autenticación (siempre deshabilitada): «Solo códigos de verificación. No sirve para abrir una conversación.»<br>Al editar solo viaja si cambió y no está aprobada |
| C12 | «Texto»: `<textarea>` crudo, placeholder «Hola {{1}}, te escribo por {{2}}. ¿Seguimos?», chip «+ {{n}} insertar variable», contador «N variables · len / 1024».<br>Pista: «Reglas de Meta: las variables van en orden ({{1}}, {{2}}…), nunca abren ni cierran el mensaje, y no van pegadas.»<br>Errores: «Escribe al menos 10 caracteres», «Máximo 1024 caracteres» y los tres de las variables |
| C13 | «Un ejemplo por variable (Meta lo exige para aprobar)»: un input por `{{n}}`. Error «Meta exige un ejemplo por cada variable» |
| C14 | «Así se verá»: burbuja con las variables rellenas y resaltadas. **Solo el cuerpo**: sin cabecera, pie ni botones |
| C15 | Notas: «Qué pasa al enviar: queda «Pendiente». Meta suele decidir en minutos y puede tardar hasta 48 h; el estado se actualiza solo. Mientras, las tareas que la elijan esperan.» y «{Cat} · {costo} por mensaje entregado en Colombia.» |
| C16 | Errores solo tras el primer envío (`touched`) |
| C17 | Qué se manda:<br>• botones agrupados (`groupButtons`);<br>• al editar, `null` para una pieza quitada;<br>• una cabecera de media se omite para no borrarla. |
| C18 | Avisos:<br>• éxito: «Enviada a revisión de Meta» / «Enviada de nuevo a revisión», con «Suele decidir en minutos; puede tardar hasta 48 h. Mientras haya alguna en revisión, la pantalla se refresca sola.»<br>• error: el mensaje mapeado, con «Meta rechazó la plantilla» por defecto;<br>• 409 `template_exists`: «Ya tienes una plantilla con ese nombre e idioma. Usa otro nombre (por ejemplo, termínalo en _v2)» y «Actualizamos la lista: si ya está ahí, edítala en vez de crearla otra vez.», con recarga de la lista. |

## D. Defectos conocidos que el rediseño debe corregir

1. El error del envío sale solo como aviso flotante: se va y el formulario no dice qué pasó. Con un 409 no ofrece ir a la
   plantilla que ya existe.
2. Un fallo de red o un tiempo agotado (Meta pudo recibirla) se presenta como un rechazo, sin decir «revisa la lista antes de
   reenviar». Es el origen del incidente.
3. La vista previa no enseña cabecera, pie ni botones.
4. El sondeo se detiene sin decirlo (B6).
5. `loading.tsx` no tiene la forma de la vista (A3). El idioma usa un `<select>` nativo y el texto un `<textarea>` crudo (C10, C12).
6. «Pendiente» frente a «En revisión»: el tablero 10 aprobado dice «En revisión».
7. La rechazada no ofrece «Corregir» en la fila, cuando es la acción principal (tablero 10).
