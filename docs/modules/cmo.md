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

**Axel pregunta con botones, y preguntar TERMINA el turno.** La tool
`ask_owner` deja una pregunta con dos a cuatro opciones cerradas y es la primera
del módulo que corta el bucle del runtime: una vuelta más al modelo después de
preguntar solo produce «quedo atento a tu respuesta» y cuesta otra llamada de un
turno que ya no tiene nada que hacer. Cinco decisiones que sostienen la feature:

- **Es un dato, no sintaxis de texto.** Viaja en `question` (respuesta del POST,
  transcript y cierre en vivo), nunca como un marcador dentro del cuerpo. La
  regla 6 del prompt enumera exhaustivamente el formato que el cliente sabe
  pintar y hay un test que vigila que siga cerrado; un marcador más sería una
  sintaxis que puede llegar a medias y leerse cruda.
- **Una sola cadena por opción.** Con `label` y `reply` separados el modelo
  tendría dos textos que mantener coherentes, y son dos textos que se
  desincronizan. Al tocar una opción se envía su `label` tal cual, así que el
  hilo dice exactamente lo que el dueño eligió.
- **Solo la pregunta del ÚLTIMO mensaje está viva.** Las anteriores se pintan
  inertes. Esa regla no necesita columna extra ni casar el texto de la respuesta
  con la opción tocada: la posición en el hilo ya lo dice, y con varias vivas el
  dueño podría contestar a una decisión de hace diez mensajes cuya conversación
  ya cambió de rumbo.
- **Un clic envía, y cuesta un análisis.** El mismo que si lo hubiera escrito: el
  clic no añade costo, quita tecleo. «Otra cosa…» no envía — enfoca el
  compositor, porque mandarle un «otra cosa» literal no le diría nada.
- **Preguntar a mitad de armar algo no es dejar borradores huérfanos.** El aviso
  de propuesta huérfana se suprime cuando hay pregunta abierta: sin esa guarda el
  mensaje remataría con «no alcancé a armar la propuesta», que suena a avería y
  es falso — le falta una decisión, no presupuesto.

Y viaja en el payload de `cmo.turn_completed`, **sin evento propio**: solo existe
al cerrar el turno, así que un `cmo.turn_question` sería un segundo camino hacia
el mismo hecho — el riesgo que la reconciliación del cliente ya tuvo que resolver
una vez con el mensaje duplicado.

**El formato de la respuesta es un subconjunto cerrado.** `domain/axel-markdown.ts`
interpreta `**negrita**`, `*cursiva*`, `` `código` ``, listas `-` y `1.`, `##`
títulos y `>` citas; lo que no reconoce se pinta como texto. No se genera HTML en
ningún punto —el parser devuelve datos y React construye los elementos— y el
prompt del servidor le declara al modelo exactamente ese subconjunto, así que lo
que escribe y lo que se pinta no pueden divergir.

**El primer contacto se lee en cinco segundos, y el rediseño fue casi todo
resta.** Eran tres párrafos centrados con pesos parecidos —quién es, qué hace,
cuándo llega su informe— y uno de ellos repetía la nota que ya vive bajo el
compositor. Ahora hay una jerarquía explícita y cada escalón se ve distinto del
anterior: identidad (h1) → qué hace (una línea) → cuándo (un chip) → «Empieza por
aquí» con tres tarjetas que dicen QUÉ hacen, no solo cómo se llaman. La promesa
de que nada se envía sin aprobar aparece **una** vez, pegada al botón de enviar,
que es donde el dueño duda. Hay un test que cuenta esa aparición.

**El compositor teclea lo que se le puede pedir.** `useTypewriterPlaceholder`
escribe seis ejemplos en el `placeholder` y los rota. Escribe **directo al DOM
por el ref**, sin estado: un `useState` por carácter serían veinticinco renders
del árbol entero del chat por frase para animar un atributo que React no
necesita conocer. La contrapartida es una invariante: el `placeholder` del JSX
tiene que seguir siendo una constante, porque una prop dinámica volvería a
parchear el atributo en cada render y borraría la frase a medias. Está
documentada en el hook y hay un test que la vigila. Se para con foco, con texto
escrito, con la pestaña oculta y con `prefers-reduced-motion` — que deja una
frase entera, no el texto genérico.

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
  `.axel-orb--busy`, `.axel-field`, `.axel-composer-glow`. Se declaran ahí y no
  como valores arbitrarios de Tailwind por la misma razón que el cometa de
  canales: un `color-mix` anidado en `bg-[...]` es frágil de extraer.
- **El campo es la única superficie del panel que se mueve, y son DOS
  desviaciones declaradas del sistema de diseño.** El tinte llega al 26% cuando
  el techo es el 14% (DESIGN-SYSTEM §2.3), y la aurora deriva en bucle cuando la
  regla dice que nada se mueve en loop en el workspace (§6). Las dos están
  concedidas explícitamente allí, con su motivo y su condición. Lo que las hace
  sostenibles: 72 s por vuelta, únicamente `transform` sobre una capa sin texto,
  `alternate` para que no salte, y todo apagado con `prefers-reduced-motion`.
  **Esto es un permiso para esta pantalla, no un patrón a copiar.**
- **El compositor es la fuente de luz.** El cuarto halo del campo cae detrás de
  él y `.axel-composer-glow` añade un foco corto y pegado. Sin el segundo, el
  halo de fondo queda demasiado difuso a esa altura y el input vuelve a leerse
  como una caja apoyada abajo.
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
