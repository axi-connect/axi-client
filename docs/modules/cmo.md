# Módulo CMO — Axel, el director de mercadeo

> Slice `src/modules/cmo`, ruta `/cmo`. Backend: `axi-server/docs/plans/cmo_module_plan.md`.
> Mockup aprobado: `docs/design/mockups/cmo-axel.html`.

## Modelo mental

Axel **observa, propone y aprende**. El dueño **decide**. Ese contrato no se
rompe en ningún flujo de la UI, y casi todas las decisiones de esta pantalla
salen de ahí:

- Nada de lo que Axel arma está encendido. La tarjeta lo dice ANTES de aprobar
  (`artifactAction`), no después.
- Un `insight` no se aprueba, se descarta: no tiene artefactos que encender. Lo
  decide `isActionable`, y equivocarlo ofrecería un botón que el backend
  rechaza con `cmo/proposal_nothing_to_apply`.
- El rechazo puede volverse **directriz**. Es el bucle que evita el fracaso más
  probable del producto: sin él Axel repite la misma propuesta y a la tercera lo
  apagan.

## Distribución

La **conversación es la columna vertebral** y el tablero es un rail. Se probó al
revés (tablero con chat lateral) y se descartó: la tesis del módulo es que la
disrupción está en la conversación, así que las propuestas se leen dentro del
flujo, no en otra pantalla.

```
/cmo (full-bleed, FUERA de (content) — el chat ancla su composer abajo)
├── briefing + propuestas destacadas   ← misma columna de 640px que el chat
├── AxelChat                            ← flex-1, scroller propio
└── CmoBoardRail (316px, xl+)           ← propuestas por decidir, cómo va el negocio
    └── bajo xl: botón flotante + panel superpuesto

/cmo/@sheet/(.)proposals/[id]  → rail interceptado (back cierra)
/cmo/proposals/[id]            → misma propuesta como página (enlace compartido)
/cmo/settings                  → interruptor, topes y directrices
```

## Los tres estados que no salían del mockup

El mockup era una demo guionada. Estos se decidieron al implementar:

| Estado | Qué se muestra | Por qué así |
|---|---|---|
| **Sin briefing** (tenant recién activado) | «Axel todavía no ha revisado tu negocio. Su primer informe llega mañana a las 8» + invitación a preguntarle ya | Es un estado **normal**, no un vacío que disimular. Un "sin datos" dejaría al dueño pensando que algo se rompió |
| **Cuota agotada** (`cmo/quota_exhausted`) | Pantalla propia + aviso explícito en verde de que **los agentes siguen atendiendo** | Es la promesa central del diseño de la cuota. Si la pantalla no la repite, el dueño asume lo contrario |
| **Axel trabajando** (turno en vivo) | Los **pasos reales** del turno con su duración (`cmo.turn_step`), y en cuanto empieza a escribir, el texto reemplazándolos (`cmo.turn_delta`) | Un turno tarda decenas de segundos. Las etiquetas las emite el servidor (`tool_labels.ts`): una sola fuente para las catorce herramientas |
| **Axel trabajando sin socket** (respaldo) | Skeleton + **fase rotando** cada 6 s («Revisando tus números…», «Cruzando el calendario…») | Sin pasos que mostrar, un skeleton mudo se lee como "se colgó" y el usuario recarga, perdiendo el análisis ya pagado. Ninguna frase afirma un resultado. Es el respaldo, no el modo normal |

## Reglas del slice

**Todo tipo deriva de `Schemas`.** Ni una interfaz a mano: si falta algo, la
corrección va al backend y se regenera con `npm run api:types`. Durante F5 eso
destapó cinco endpoints sin tipo de respuesta y un `POST /threads` que declaraba
el tipo de la lista mientras devolvía un id — todo corregido en el servidor.

**El WS avisa, no sincroniza — con UNA excepción.** Los eventos de tablero
(`cmo.briefing_ready`, `proposal_created`, `proposal_decided`) no traen el estado
completo: el store recarga del servidor lo que cambió, porque enviar un briefing
por socket duplicaría el contrato. En la **reconexión se recarga todo**, porque
los eventos perdidos dejarían la bandeja mostrando propuestas que ya no existen.

Los `cmo.turn_*` SÍ sincronizan, y no hay alternativa: no existe ningún endpoint
del que releer un turno a medio escribir. La verdad final sigue siendo el cuerpo
del POST — si el cierre por WS llega primero, el POST **completa** el mensaje en
su sitio con la traza de herramientas en vez de añadir otro. Y ese mismo cierre
es el rescate cuando la conexión del POST muere: la respuesta ya está persistida,
así que no se marca como fallo ni se invita a pagar otro análisis.

**El formato de la respuesta es un subconjunto cerrado.** `domain/axel-markdown.ts`
interpreta `**negrita**`, `*cursiva*`, `` `código` ``, listas `-` y `1.`, `##`
títulos y `>` citas; lo que no reconoce se pinta como texto. No se genera HTML en
ningún punto —el parser devuelve datos y React construye los elementos— y el
prompt del servidor le declara al modelo exactamente ese subconjunto, así que lo
que escribe y lo que se pinta no pueden divergir.

**Cada sección falla por su cuenta.** `load()` lanza las peticiones en paralelo
con `.catch` individual, no con `Promise.all`: si el briefing revienta, el
tablero y el chat siguen funcionando.

**Un turno que falla no pierde el texto.** La burbuja se queda con el mensaje y
un botón de reintentar. Volver a teclear una pregunta larga por un fallo de red
es la peor forma de perder a alguien.

**`expiryLabel` cuenta días de CALENDARIO**, no horas partidas por 24 — y los
cuenta en la zona local. La palabra dice el día («mañana»); el color de
`isUrgent` dice la urgencia. Los tests construyen fechas con el constructor
local justamente para no depender de la zona del runner.

**Un enum desconocido se muestra crudo**, nunca como "Otro" (misma decisión que
marketing). Si el backend añade un tipo, verlo en pantalla lo delata el primer
día en vez de esconderlo semanas.

## Lenguaje visual

- **Violeta = IA** en todo el panel, así que es la firma de Axel. Coral solo en
  la acción primaria (`Aprobar`). Los colores de estado (verde/ámbar/rojo) son
  semánticos y **no** cuentan como acento.
- **Un solo momento hero**: el orbe, con el tricolor del isotipo en un anillo
  cometa. No es un efecto nuevo — es `@property --comet-angle` con la receta de
  `.channel-surface::after`, ya aprobada en el mockup de canales.
- Utilidades del módulo en `globals.css`: `.axel-orb`, `.axel-orb-glow`,
  `.axel-orb--busy`, `.axel-field`. Se declaran ahí y no como valores
  arbitrarios de Tailwind por la misma razón que el cometa de canales: un
  `color-mix` anidado en `bg-[...]` es frágil de extraer.
- El icono del sidebar es `sparkles` y hay que tenerlo en el diccionario CERRADO
  de `core/lib/icons.ts` — sin la entrada, el ítem cae a `Circle`.

## Contrato con el backend

14 endpoints bajo `/api/v1/cmo`. Los tres que conviene tener presentes:

- `POST /cmo/messages` — **tarda decenas de segundos y consume cuota**. No es
  cacheable ni reintentable automáticamente: un reintento gasta dos análisis del
  plan por la misma pregunta.
- `GET /cmo/proposals` — devuelve las **pendientes** por defecto. Para el
  histórico hay que pasar `status`.
- `briefings/latest` y el detalle de propuesta devuelven `{data: null}` cuando no
  hay nada, **no un 404**: un tenant recién activado es el caso normal.

Permisos: `cmo:read` (mirar), `cmo:chat` (conversar — consume cuota),
`cmo:approve` (aprobar, rechazar, dictar directrices y cambiar ajustes).
