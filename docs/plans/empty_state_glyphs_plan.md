# Cristal ilustrado — glifos premium para los estados vacíos

> **Estado:** F0 aprobada (mockup) y **F1 implementada** en `feat/empty-state-glyphs`.
> El mockup de aprobación incluye la anatomía por capas y el A/B del disco teñido.
> Correcciones que salieron de mirar pantallazos y no de razonar, ya incorporadas:
> el pedestal **sobra en oscuro** (los tres fondos están a pocos puntos entre sí y
> cualquier alfa ensuciaba el vidrio); «Personas» y «Tiempo» hubo que redibujarlas
> porque no se distinguían; el grabado necesita **su propio token, más brillante
> que el canto** (una línea grabada en vidrio capta la luz); el reflejo recorría 34
> de las 48 unidades y aparcaba fuera de la figura, ahora recorre 20; y la luz de
> color pasó de tinte plano a **núcleo detrás del vidrio**, colocado a mano en cada
> familia — al 52 % y centrada salían manchas.

## Contexto

Hoy los estados vacíos del panel se pintan con un icono de `lucide-react` suelto o dentro de un disco
tintado — `MessageSquareDashed size-12 opacity-30` en el inbox, `Package h-10 w-10 text-muted-foreground`
en el catálogo, `Users size-6` en el dashboard. Son correctos y anónimos: **es lo primero que ve un
tenant nuevo** (un tenant recién provisionado tiene TODAS las listas vacías) y ahora mismo esa primera
impresión es la de un CRUD genérico, no la de un producto premium.

El dueño pide reemplazarlos por iconos premium 3D propios de axi, y pide explícitamente **primero el
listado**, agrupado, porque no se puede llenar la app del mismo icono.

Este documento es ese listado + el plan. Fase de inventario: **cerrada**.

---

## Lo que hay hoy (medido, no estimado)

### Primitivas

| Pieza | Ruta | Contrato | Usos |
|---|---|---|---|
| `EmptyState` (canónica) | `src/shared/components/features/empty-state/EmptyState.tsx` | `icon: LucideIcon`, `title`, `description?`, `action?`, `accent: violet\|amber\|brand\|muted`, `variant: dashed\|solid` | **34** |
| re-export legado | `src/modules/platform/ui/components/EmptyState.tsx` | reexporta la de arriba | 18 de los 34 |
| `CardEmpty` | `src/modules/dashboard/ui/components/MetricTile.tsx:72` | `icon: React.ReactNode`, `message` | **5** |
| `ChannelsEmptyState` | `src/modules/channels/ui/components/ChannelsEmptyState.tsx` | duplicado consciente, deuda documentada en el propio fichero (líneas 6-17: *«unificar los estados vacíos merece su propio PR de design system»*) | 1 |
| `FlowEmptyState` | `src/modules/forms/ui/components/FlowEmptyState.tsx` | duplicado, disco `rounded-2xl` en vez de círculo | 1 |
| `DataTable` vacío | `src/shared/components/features/data-table/components/TableView.tsx:65` | celda centrada, **solo texto** | ~15 |

**Hallazgo que manda en el plan:** las 34 llamadas a `EmptyState` están **solo** en `platform` (24),
`marketing` (11) y `billing` (1). Todo el panel del tenant — inbox, CRM, catálogo, canales, pedidos,
agenda, dashboard, analíticas, formularios — **lo maqueta a mano**, con tres escalas incompatibles
convivendo: `size-6`, `size-8`–`size-10 text-muted-foreground`, y `size-10`–`size-12 opacity-30/40`
(el inbox es el único slice que usa opacidad en vez de color).

### Volumen

~73 estados vacíos **con icono** + ~35 sin icono (solo texto) + ~40 de error + 3 de «sin permiso».
Los de error, permiso y carga **quedan fuera de esta fase** (el dueño dijo «lo primero a remplazar son
los estados vacíos»); van anotados al final como fase 2.

---

## El listado agrupado — 10 familias

El eje del agrupamiento no es el módulo, es **qué falta**. Ocho familias de dominio + dos de estado.
Un icono por familia: **10 piezas**, no 73.

### Familias de dominio

**F1 · Conversación** — burbujas apiladas
| Sitio | Icono hoy |
|---|---|
| `inbox/ui/components/InboxList.tsx:168` — lista de conversaciones (por pestaña) | `Inbox size-8 opacity-40` |
| `inbox/ui/components/ConversationPanel.tsx:79` — ninguna seleccionada · **el vacío más visto del producto** | `MessageSquareDashed size-12 opacity-30` |
| `dashboard/ui/components/ConversationsFlowCard.tsx:91` — flujo de conversaciones | `MessagesSquare size-6` |
| `marketing/ui/TemplatesView.tsx:142` — plantillas de mensaje | `FileText` |
| `platform/…/quality/debugger/DebuggerView.tsx:139` y `:152` — conversaciones del debugger | `MessagesSquare` |

**F2 · Personas** — tarjeta de contacto
| Sitio | Icono hoy |
|---|---|
| `app/(private)/crm/contacts/page.tsx:155` — contactos | `Users size-10` |
| `dashboard/…/NewCustomersCard.tsx:83` — clientes nuevos | `UserPlus size-6` |
| `integrations/…/detail/ContactosTab.tsx:12` — contactos sincronizados | `Users size-5.5` |
| `analytics/…/conversion/GroupBreakdownCard.tsx:69` — desglose por grupo | `Users size-6` |
| `platform/…/tenants/detail/TenantUsersView.tsx:42` — usuarios del tenant | `Users` |
| `platform/…/quality/debugger/DebuggerView.tsx:109` — contactos del debugger | `UserSearch` |

**F3 · Catálogo** — caja isométrica
| Sitio | Icono hoy |
|---|---|
| `app/(private)/(content)/catalog/products/page.tsx:158` | `Package h-10 w-10` |
| `app/(private)/(content)/catalog/categories/page.tsx:192` | `FolderTree h-10 w-10` |
| `app/(private)/(content)/catalog/product-types/page.tsx:92` | `Shapes h-10 w-10` |
| `dashboard/…/TopProductsCard.tsx:35` — más vendidos | `Package size-6` |

**F4 · Dinero** — recibo/tiquete (reutiliza el lenguaje del tiquete de `/billing`)
| Sitio | Icono hoy |
|---|---|
| `billing/ui/InvoicesView.tsx:111` — facturas del tenant | `FileText` (vía `EmptyState`) |
| `orders/ui/OrdersView.tsx:108` — pedidos | `ShoppingCart size-7` |
| `crm/ui/PipelineView.tsx:78` — oportunidades | `Target size-7` |
| `marketing/ui/PromotionsView.tsx:284` — promociones | `Ticket` |
| `marketing/ui/components/RedemptionsSheet.tsx:81` — canjes | `Ticket` |
| `platform/…/billing/PortfolioView.tsx:185` · `PricesView.tsx:70,118` · `pricing/PricingView.tsx:148` · `billing/TenantBillingView.tsx:89` | `Receipt`/`Scale`/`CircleDollarSign`/`Mail` |

**F5 · Agente e IA** — chispa/nodo
| Sitio | Icono hoy |
|---|---|
| `forms/ui/components/FlowEmptyState.tsx:12` — formularios de captura · **estado por defecto de todo tenant nuevo** | `ClipboardList size-6` |
| `analytics/…/quality/QualityScoreCard.tsx:60` · `EvaluationsTable.tsx:211` · `AgentQualityTable.tsx:35` | `Sparkles`/`ClipboardList`/`Users size-6` |
| `marketing/ui/AutomationsView.tsx:255` y `MarketingOverviewView.tsx:117,225` — reglas de recuperación | `Zap`/`Megaphone` |
| `marketing/ui/CampaignsView.tsx:184` — campañas | `Megaphone` |
| `platform/…/analytics/AnalyticsView.tsx:76` — actividad de agentes | `Activity` |
| `platform/…/quality/{scenarios,suites,runs}` (4 sitios) — laboratorio de QA | `FlaskConical`/`ListChecks`/`Play` |
| *(hueco)* `agents/…/CharacterGallery.tsx:171` y `AgentIntentionsEditor.tsx:44` — hoy sin icono | — |

**F6 · Conexiones** — conector/enchufe isométrico
| Sitio | Icono hoy |
|---|---|
| `channels/ui/components/ChannelsEmptyState.tsx:18` — canales | `Plug size-5.5` |
| `workspace/ui/sidebar/…/ChannelList.tsx:43` — canales en el sidebar | `PackageOpen size-7` |
| `dashboard/…/SystemHealthPanel.tsx:65` — salud del sistema | `Radio size-6` |
| `marketing/ui/MetaTemplatesView.tsx:102,171` — sin canal Cloud / sin plantillas | `PlugZap`/`RefreshCw` |
| `marketing/ui/components/RecoveryFeed.tsx:29` — señal en vivo | `Radio size-7` |
| `platform/…/tenants/detail/database/TenantDatabaseView.tsx:126` | `Database` |

**F7 · Medición** — gráfico isométrico
| Sitio | Icono hoy |
|---|---|
| `analytics/…/conversion/ConversionTab.tsx:31` — embudo de conversión | `ChartLine size-8` |
| `analytics/…/conversion/TrendCard.tsx:42` — tendencia | `TrendingUp size-6` |
| `analytics/…/conversion/VoiceCard.tsx:61` — consumo de voz | `Mic size-6` |
| `dashboard/…/UsagePanel.tsx:77` — consumo del ciclo | `Gauge size-6` |
| `platform/…/audit/AuditView.tsx:162` — eventos de auditoría | `ScrollText` |

**F8 · Tiempo** — calendario/reloj
| Sitio | Icono hoy |
|---|---|
| `crm/ui/TasksView.tsx:258` — tareas | `ListTodo size-10` |
| `scheduling/ui/RemindersView.tsx:178` — recordatorios | `BellOff size-8` |
| `scheduling/…/calendar/AppointmentsList.tsx:87` — citas del rango | `CalendarX2 size-8` |

### Familias de estado (cortan el otro eje)

**F9 · Al día** — el vacío es *buena noticia*, no una carencia. Tono `success`, nunca CTA de creación.
| Sitio | Copy actual que lo delata |
|---|---|
| `analytics/…/alerts/AlertsTab.tsx:96` | «Todo en orden. Te avisaremos aquí…» |
| `analytics/…/quality/TopIssuesCard.tsx:41` | «Sin problemas detectados en el período. Buen trabajo.» |
| `app/(private)/crm/contacts/duplicates/page.tsx:82` | «Sin duplicados aparentes · Tu base de contactos está limpia.» |
| `notifications/…/NotificationPanel.tsx:157` | «Estás al día» |
| `marketing/ui/OptOutsView.tsx:124` | «Nadie se ha dado de baja» |
| `platform/…/analytics/AnalyticsView.tsx:141` · `billing/PortfolioView.tsx:185` (filtro «vencidas») | «No hay alertas…» · «Nadie debe nada» |

**F10 · Sin resultados** — lupa. Es un mensaje distinto de «aún no hay nada» y hoy se confunden.
| Sitio | Nota |
|---|---|
| `marketing/ui/PromotionsView.tsx:299` | ya usa `Search` + `variant="solid"` — el patrón correcto |
| `inbox/…/context-rail/panels/AttachmentsPanel.tsx:169` | **mezcla** first-run y filtro en un solo bloque |
| `inbox/ui/components/InboxList.tsx:168` | idem (mezcla vacío de pestaña con vacío real) |
| `analytics/…/alerts/AlertsTab.tsx:96` · `platform/…/audit/AuditView.tsx:162` · `quality/runs/RunsView.tsx:127` | idem, ramas duales |
| `platform/…/quality/suites/SuiteScenariosSheet.tsx:322` | `SearchX size-4` inline |
| ~15 `DataTable` sin vacío propio | caen al `"Sin resultados"` genérico |

---

## Decisiones tomadas con el dueño

| | Decisión |
|---|---|
| **Medio** | SVG inline escrito a mano. No renders raster. |
| **Estilo** | **Vidrio / cristal** — glass translúcido con reflejo especular y refracción falsa (el referente Apple del DESIGN), *no* el isométrico opaco. |
| **Grupos** | Las 10 familias tal cual: 8 de dominio + 2 de estado. |
| **Alcance de esta entrega** | **Solo F0: el mockup.** Se aprueba el lenguaje visual antes de escribir una línea de producción. |

## Diseño

### El medio: SVG inline, no renders

Los iconos se escriben como **componentes SVG inline** en `src/shared/components/ui/empty-icons/`,
siguiendo el precedente ya establecido y documentado de `BrandMark`
(`src/shared/components/ui/brand-mark.tsx`): `viewBox` fijo, `useId()` para que los `<defs>` no
colisionen entre instancias, `aria-hidden`, spread de `SVGProps`.

Por qué SVG y no PNG renderizado en 3D (como `public/images/mascots/*`):

- **Peso y nitidez** — 10 iconos SVG inline ≈ lo que pesa *un* PNG de mascota; nítidos a cualquier tamaño.
- **Tema** — el volumen se construye con `color-mix()` sobre tokens, así que el mismo fichero funciona
  en claro y oscuro. Un render raster necesita dos versiones o se ve sucio en uno de los dos.
- **Middleware** — `src/middleware.ts` solo exime `_next|api|favicon.ico|assets|fonts|images`: una
  carpeta nueva de `public/` redirige al login. El SVG inline esquiva el problema entero.
- **Reversible** — si más adelante se encargan renders reales a un diseñador, el contrato del
  componente no cambia: se sustituye el interior.

### El vidrio: qué problema real hay que resolver

El cristal es translúcido, así que **se ve el fondo a través** — y el fondo no es uno. Los vacíos
aparecen sobre tres superficies distintas, cada una en dos temas, o seis casos:

1. la superficie de marca del panel — `(private)/layout.tsx:104` pinta `bg-gradient-to-br from-muted/50
   to-muted`, así que el fondo **varía a lo largo del propio degradado**;
2. dentro de una card sólida (`bg-background`) — el caso de `CardEmpty` y de `variant="solid"`;
3. los paneles full-bleed del workspace (inbox), que son sólidos y tienen su propio contraste.

De ahí sale la regla de construcción: **el cuerpo del vidrio se pinta con tokens** (`var(--background)`,
`var(--foreground)` y `color-mix()` dentro del propio SVG inline, que sí resuelve custom properties),
nunca con blanco o negro a baja alfa — que es lo que hace que un glass genérico se vea sucio en uno de
los dos temas. Los **hex de marca** (coral, violeta, ámbar) se quedan hex, acogiéndose a la misma
excepción ya declarada en `brand-mark.tsx`: son artwork, no color de UI.

El volumen se compone por capas de gradiente y opacidad, reutilizando el lenguaje que el proyecto ya
tiene resuelto en `globals.css`: canto claro (`inset 0 1px 0`, como `.axel-comet-card:854`), halo difuso
detrás (`.axel-orb-glow:728` y `brand-loader.tsx`) y el anillo del cometa para el sheen. Cero
dependencias nuevas, cero WebGL, cero canvas.

### La técnica, ya cerrada

Siete puntos que dejan de ser una incógnita. La geometría se afina a ojo en el mockup; **la estructura
es ésta**.

1. **El componente es geometría, el material es CSS.** El TSX no lleva ni un hex ni una clase `dark:`:
   los colores llegan por `data-stop` / `data-layer` desde un bloque `.glass-glyph` en `globals.css`.
   Motivo técnico, no estético: `var()` dentro de un *atributo de presentación* (`fill="var(--x)"`) es
   frágil, mientras que `stop-color`, `fill` y `stroke` **sí son propiedades CSS de pleno derecho**. Así
   el tema entero se resuelve en una hoja y el SVG no sabe que existen los temas. Queda **más estricto
   que `BrandMark`**, que sí se declara artwork y lleva sus seis hex.
2. **El pedestal es lo que salva los seis casos.** Cada glifo trae detrás una elipse radial en
   `color-mix(in srgb, var(--background) 82%, transparent)` que se apaga antes del borde. No tiene canto,
   así que no se lee como un plato; su único trabajo es empujar hacia `--background` los píxeles de
   detrás del cuerpo, sea el degradado `muted`, la card sólida o el panel del workspace. Sobre
   `--background` puro es literalmente invisible. Los seis casos colapsan a uno. Y la red de seguridad:
   **la forma se lee por el rim de 1 px, no por la translucidez** — si el pedestal fallara, el glifo
   sigue siendo reconocible.
3. **Siete capas, cero filtros SVG, cero blend modes.** Un `feGaussianBlur` sobre un canto duro produce
   exactamente una rampa de gradiente, así que la rampa se autora en los stops: mismo resultado óptico,
   coste cero. Cada `filter` forzaría una superficie offscreen propia por instancia — con 6–8 `CardEmpty`
   visibles en un dashboard son 6–8 superficies por repintado, y este proyecto ya prohíbe animar
   `width/height` en listas. La refracción del canto se consigue con un trazo **grueso recortado a su
   propia forma** (`clipPath`), que es un trazo interior: espesor sin un solo filtro.
4. **Un `viewBox` de 48×48 y un `tier` que decide qué se renderiza**, no qué se oculta — a 24 px cuatro
   de las siete capas medirían menos de medio píxel, así que `sm` dibuja tres. Las dos palancas de
   nitidez son de geometría: `vector-effect="non-scaling-stroke"` (mantiene el rim en 1 px real a 24, 48
   y 120 px — es lo único que permite un solo path para un rango de 5×) y **rejilla par** (a 24 px cada
   unidad es medio píxel, así que solo las coordenadas pares caen en frontera de píxel).
5. **El tema, por clase en el ancestro** (`.dark .glass-glyph` redefine ocho variables), nunca por
   `prefers-color-scheme`: el proyecto usa `next-themes` con clase en el `<html>` y la media query se
   equivocaría en cuanto alguien fuerce un tema distinto al del sistema. En oscuro el vidrio **se
   invierte de verdad**: el charco de debajo deja de ser sombra y pasa a ser luz.
6. **El sheen viaja por `transform` + `opacity` sobre el hijo**, disparado por un selector descendente
   desde el contenedor, con una única custom property registrada y heredada para lo que CSS no puede
   animar de otra forma. El dato que fija el diseño: **el `offset` de un `<stop>` y las coordenadas
   `x1/y1/x2/y2` de un gradiente NO son propiedades CSS** y no se pueden transicionar — así que el
   reflejo no se mueve moviendo el gradiente, se mueve trasladando una banda recortada. Y la trampa a
   documentar: un `transform` de CSS **anula el atributo `transform`** del mismo elemento, por lo que la
   inclinación estática vive en el `<rect>` y el viaje en el `<g>` padre.
7. **RSC sin `"use client"`**, como `BrandMark`: `aria-hidden` + `focusable="false"`, sin `<title>` (lo
   duplicaría el `<h2>` del propio estado vacío), `useId()` por instancia solo para los `url(#…)`, y
   nunca un `<defs>` compartido tipo sprite — un ancestro oculto rompería los gradientes de todas las
   demás instancias.

**Y una decisión de producto que sale de esto:** un estado vacío **no es interactivo**. §6 autoriza el
efecto por quién lo dispara, pero un reflejo que se enciende al pasar sobre una caja que no hace nada
promete una interacción que no existe. Así que el sheen se enciende **solo donde el contenedor es
genuinamente hovereable** (la card de una métrica, el vacío de página completa que lleva su CTA) y el
glifo se queda quieto en las cajas `dashed` inertes. Se resuelve poniendo o no poniendo una clase, sin
tocar el componente.

**Composición con `EmptyState`:** cuando el icono es de cristal, **el disco teñido `size-12 rounded-full
bg-accent-*/10` se retira** — el glifo ya trae su pedestal, y un círculo tintado detrás de un objeto de
vidrio se lee como dos platos compitiendo. El acento no se pierde: pasa a alimentar el brillo interno
del glifo desde el mismo prop `accent`. El mockup enseña las dos variantes lado a lado para que decidas.

### El punto de inyección: una primitiva, no 73 ficheros

```
EmptyStateArt          (nuevo)  shared/components/ui/empty-icons/  — las 10 piezas + el tipo
EmptyState             (existe) shared/components/features/empty-state/ — se le ensancha el contrato
CardEmpty              (existe) se mueve a shared/ y se le ensancha igual
ChannelsEmptyState     (existe) se BORRA: pasa a ser una llamada a EmptyState (deuda ya documentada)
FlowEmptyState         (existe) idem
```

`EmptyState` hoy exige `icon: LucideIcon`. Se amplía a `icon: React.ComponentType<{ className?: string }>`,
que acepta un lucide y un glifo **sin unión discriminada** — las 34 llamadas actuales siguen
compilando sin tocarlas y se migran de una en una. Los ~40 vacíos maquetados a mano del panel del
tenant **se reescriben como llamadas a `EmptyState`**: es lo que convierte 73 sitios en un cambio de
una primitiva. `CardEmpty` ya recibe `React.ReactNode`, así que no necesita cambio de contrato — solo
mudarse a `shared/` (hoy vive en `modules/dashboard` y lo consume `analytics`, que es un cruce de
slices que el mismo PR arregla).

### Movimiento

Nada se mueve en reposo. El brillo/sheen se enciende **solo con el puntero encima**, que
DESIGN-SYSTEM §6 ya declara explícitamente que *no* cuenta como excepción al «nada parpadea ni se
mueve en loop en el workspace» (*«La línea que separa una cosa de la otra es quién lo dispara»*), con
los tres precedentes vivos: `.channel-surface`, `.ticket-surface--live` y `TiltCard`. Se apaga con
`prefers-reduced-motion` añadiendo el selector al bloque que corresponda (la convención del fichero es
apagar por selector explícito, nunca con un catch-all).

### Las tres reglas de diseño que hay que tocar

1. **DESIGN-SYSTEM §7** dice hoy: *«Ilustraciones/empty states: línea simple + un acento de la paleta
   (coral o violeta), fondo transparente»*. Es exactamente lo que se está sustituyendo. Se reescribe.
2. **DESIGN §3.1** prohíbe los tres acentos en una vista de trabajo. **No hace falta pedir excepción**:
   DESIGN §3.2 ya reserva el tricolor completo para *«momentos hero — landing, onboarding, **empty
   states destacados**, texto de marca»*. El plan se acoge a ese carve-out y lo hace operativo:
   **tricolor solo en el vacío de página completa** (first-run, la primera impresión), **acento único
   del módulo en los vacíos dentro de una card**. Ese matiz («destacados», no todos) es la regla.

3. **DESIGN mandamiento 3 y §5.1/§5.2** («glass solo en superficies flotantes; el contenido de trabajo
   es sólido», con las cards de datos explícitamente en la columna de sólido) es la regla que roza la
   elección de vidrio, y hay que resolverla por escrito.

   El argumento **se sostiene, y además es mecánico**: el material «glass» de este sistema está
   *definido* por `backdrop-filter` — `.glass`, `.glass-overlay`, `.glass-menu`, y `.glass-flat` que
   existe precisamente para verse igual sin él. El glifo **no lleva `backdrop-filter` en ninguna capa**:
   su translucidez está *pintada* en gradientes, no *compuesta* con los píxeles de detrás. No comparte
   la propiedad que define el material, así que no es ese material. Eso da un **test binario y
   auditable: si un glifo llega a usar `backdrop-filter`, deja de estar autorizado** y pasa a ser glass
   sujeto a §5.2. Y la razón de ser de la regla —§5.2 dice literalmente *«nunca texto largo sobre glass
   con contenido moviéndose detrás»*— tampoco aplica: un glifo de 48 px no aloja nada, no tiene nada
   moviéndose detrás y no lleva ni un carácter encima.

   Lo honesto, aun así: el mandamiento **no** dice «no compongas con el backdrop», dice «glass solo en
   superficies flotantes». Quien abra el mockup verá un objeto de cristal dentro de una card de datos y
   dirá «esto es glass en contenido de trabajo» — y no estará leyendo mal el documento. Una regla que
   hay que reinterpretar en cada PR ya no es una regla. Así que la salida no es ganar la discusión: es
   **enmendar el documento y darle nombre propio al material — «cristal ilustrado», no glass** — con su
   motivo y su condición de revocación, exactamente como hizo `.ticket-surface` («el ámbar fuerte vive
   en el anillo de 1px, que NO es tinte de superficie») y como hizo `brand-mark.tsx` declarándose
   artwork. Enmiendas: el bloque de §7, una línea bajo la tabla de §5.2, el paréntesis del mandamiento 3
   y un ítem en el checklist de §11. Las condiciones de uso que se escriben con él: solo estados vacíos
   e ilustración (nunca un control, badge o fila de tabla — ahí manda lucide), nunca bajo texto, **techo
   de 120 px** (un glifo que ocupa media pantalla vuelve a ser una superficie), cero hex en el
   componente, un acento por vista, y el sheen solo por puntero.

Y el techo de tinte del 14 % (§2.3, dos excepciones sancionadas) **no se toca** por lo mismo: el color
saturado vive dentro del glifo, que no es superficie — no se pide una tercera excepción.

---

## Fases

Cada fase cierra con su verja y espera aprobación (regla del proyecto: un gate por fase).
**Esta entrega es F0 y nada más.** F1–F4 quedan escritas aquí para que se vea a dónde lleva el mockup,
pero no se toca ni un fichero del proyecto hasta que apruebes el lenguaje visual.

### F0 · Mockup — lo único que se entrega ahora

Un HTML navegable de alta fidelidad, publicado como Artifact privado, con:

- **las 10 piezas de cristal**, cada una etiquetada con su familia y con las vistas que va a servir;
- **claro y oscuro**, conmutables en la propia página, porque el vidrio es justo lo que se rompe al
  cambiar de tema y hay que poder verlo en el mismo sitio;
- **los tres tamaños reales** (24 px dentro de una card, 48 px en el disco de `EmptyState`, 96–120 px en
  el vacío de página completa) para juzgar si el vidrio aguanta al bajar de escala o hay que simplificar;
- **los tres fondos reales** — la superficie de marca en degradado, la card sólida y el panel del
  workspace — porque un translúcido solo se puede juzgar sobre el fondo que va a llevar detrás;
- **el hover en vivo**, para aprobar el sheen;
- **dos estados vacíos montados de verdad** (uno de página completa tipo «Aún no tienes productos» y uno
  dentro de card tipo «Sin consumo registrado este ciclo»), para verlos en contexto y no en una rejilla;
- **la variante con disco teñido y la variante sin él**, lado a lado, que es la única decisión de
  composición que queda abierta.

Cero código de producción, cero ficheros del repo tocados.

### F1–F4 · El resto (planificado, **no autorizado**)

- **F1 · Cimientos** — `empty-icons/` con las 10 piezas + contrato ensanchado de `EmptyState` +
  `CardEmpty` promovido a `shared/` + `ChannelsEmptyState`/`FlowEmptyState` borrados y sus 3 sitios
  migrados. Sin tocar todavía las vistas. Aquí entran las enmiendas a los docs de diseño.
- **F2 · Panel del tenant** — los ~40 vacíos que hoy están maquetados a mano: inbox, CRM, catálogo,
  canales, pedidos, agenda, dashboard, analíticas, formularios. Es lo que ve el cliente, y donde el
  dueño detectó el problema.
- **F3 · Interno** — `platform` (24 sitios) y el resto de `marketing`. Ya usan la primitiva, así que es
  casi solo cambiar el `icon=`.
- **F4 · Los que no tienen dónde colgarlo** — los ~35 vacíos que hoy son texto suelto y los ~15
  `DataTable` sin vacío propio; separar las ramas duales «sin datos» vs «sin resultados» de F10.
- **Fuera de alcance, anotado para después** — los ~40 estados de error, los 3 de «sin permiso» y los
  de carga. Merecen su propia familia gráfica y su propia conversación.

## Verificación

**De esta entrega (F0)** no hay verja de código que correr: no se toca el repo. La verificación es que
abras el Artifact y juzgues cuatro cosas concretas:

1. que el vidrio **aguante los seis casos** (tres fondos × dos temas) sin verse sucio en ninguno;
2. que **a 24 px siga leyéndose** como el mismo objeto y no como una mancha;
3. que las 10 piezas se distingan entre sí de un vistazo — si dos se confunden, sobra una familia;
4. que el sheen del hover se sienta material y no como un efecto pegado;
5. **con disco teñido detrás o sin él** — es la única decisión de composición que dejo abierta.

**De las fases siguientes**, cuando se autoricen:

```bash
cd /home/davela/dev/axi/axi-client
npx tsc --noEmit
npm run lint
npm test -- --maxWorkers=3
npm run build
```

- **Tests**: que `EmptyState` renderiza tanto un `LucideIcon` como un `EmptyArtKind` (el union es el
  riesgo real del cambio); que cada familia expone su pieza; snapshot del `viewBox` para que un
  refactor no rompa la geometría. Lo que **no** se testea: la apariencia — el CSS se mapea a
  `identity-obj-proxy`, no hay estilos computados en jsdom.
- **Visual** (la levanta el dueño, nunca yo): inbox vacío, catálogo vacío y el dashboard en claro y
  oscuro, a ancho móvil y de escritorio; con `prefers-reduced-motion` activo todo debe quedar quieto.
- `main` está limpio y a la par de `origin/main` (nada pendiente de pushear). El push despliega, así que
  se pide aparte.
