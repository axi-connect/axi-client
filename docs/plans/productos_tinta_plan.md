# /productos en tinta — plan de la vuelta premium

> Aprobado por la dueña el 2026-10-06. Lienzo: https://claude.ai/artifact/P4WwDScwJMhG2AJ5DHCFrZ
> (tableros Main, Claro, Móvil, Vuelo, Copys y Hoy). Parte de `feat/productos-juego` @ 53471ea0.
> Plan anterior, que sigue valiendo en lo que este no cambia: [`productos_juego_plan.md`](./productos_juego_plan.md).
> Honestidad: `qa/evidencia/productos-ref/INVENTARIO.md` (revisor: cinematic-landing-page).

## 1. Por qué

En la auditoría del 2026-10-06 (capturas en `qa/evidencia/productos-premium/`) salió esto:

1. **Confeti de color.** Cada pestaña, jugada y día lleva su tono (coral, violeta o ámbar), así que en una sola vista aparecen los tres acentos (DESIGN §8.1). La home es tinta, con el coral solo en la acción.
2. **Vocabulario de consola ajeno a la marca:** versalitas en todas las etiquetas, corchetes en los números, el lema en la consola y siete filas de «Por descubrir».
3. **Huecos negros** de 300 a 400 px entre el juego y las piezas, tras el muro y antes del pie.
4. **El hero no dice qué es Axi.**
5. **En móvil hay scroll horizontal:** jugadas en cinta y dock deslizable.
6. **Faltan piezas de conversión:**
   - garantías junto al CTA;
   - el CTA dentro del juego;
   - el diferenciador;
   - el precio;
   - el control frente a la IA.

## 2. Decisiones (la dueña, 2026-10-06)

| # | Decisión |
|---|---|
| D1 | Monocromo de tinta. El coral solo en la acción (CTA, foco, el «hoy» de la ruta) y el violeta solo cuando habla la IA. Ámbar no, salvo la luz del hero y la paleta madre. |
| D2 | Se conserva el **vuelo del teléfono** del hero al juego, y se pule (§4.2). |
| D3 | Diferenciador = **recuperación**, con el copy de la dueña: «Lo que no cerraste hoy, Axi lo vuelve a buscar.» y «No vuelvas a empezar una venta. Retómala donde quedó.». Usa los 3 disparadores reales de `/marketing/automations`. **Solo Crecimiento y Escala**, y la página lo dice. |
| D4 | Se conserva el **componente del muro** con su perspectiva; solo se reubica (texto a la izquierda, muro a la derecha). |
| D5 | Sin FAQ: repetía la de la home. Las respuestas para quien ya está decidido van bajo cada paso de la ruta de 7 días, más un enlace a `/#preguntas`. |
| D6 | **Precio Esencial vivo del catálogo** (§4.6). Nada de backend nuevo y nada de cifra fija. |
| D7 | Ancla «un asesor ≈ $2,8 M al mes» (MS §1.1), con su fuente al pie. |
| D8 | Sello «WhatsApp oficial, alta en un botón» en el hero. |
| D9 | Orden: hero → juego → recuperar → piezas → video → muro → precio → control → cierre. |

## 3. Escenas

| Ancla | Escena | Componente |
|---|---|---|
| `#inicio` | «Escríbele. Mira cómo vende.» + frase de qué es + 3 garantías | `ProductosOpening` |
| `#agente` | El juego: jugadas, teléfono, «Lo que acabas de ver», 7 habilidades y CTA final | `ProductosGame` |
| `#recuperar` | «Lo que no cerraste hoy» | `ProductosRecover` (nuevo, RSC) |
| `#piezas` | Pieza por pieza, monocromo | `ProductosPieces` |
| `#video` | El video del fundador (sin cambios) | `ProductosVideoScene` |
| `#conversaciones` | El muro, en dos columnas | `ProductosWall` |
| `#precio` | «Lo que cuesta. Sin letra pequeña.» | `ProductosPrice` (nuevo, RSC, recibe `catalog`) |
| `#control` | «Vende solo. Nunca sin ti.» | `ProductosControl` (nuevo, RSC) |
| `#empezar` | La ruta de 7 días con respuestas | `ProductosClose` |

Todo el texto vive en `productos.content.ts`.

## 4. Detalle

### 4.1 Hero
- Lead: «Un agente que vende por tu WhatsApp con tu catálogo, tus precios y tu equipo al lado. Juega a ser tu cliente y compruébalo.»
- Tres garantías con icono neutro: «WhatsApp oficial, alta en un botón», «7 días sin tarjeta» y «No cobramos por usuario».
- Fuera las siete esferas con candado: `ORBS`, `.pj-orb` y la opacidad que les escribía el vuelo.

### 4.2 Vuelo
Regla de rendimiento: solo `transform` y `opacity` escritos directo, sin variables CSS por frame (memoria `perf-variables-css-por-frame`).

- **Pose final de frente** (`rx 0 · ry 0 · rz 0`), para que el chat se lea.
  - A mitad de vuelo gira hasta `ry −12°` (`sin(πt)`).
  - Al llegar se asienta con un rebote de ~1°.
  - El reposo en CSS también queda de frente.
- **La pantalla se enciende al despegar:** el contenido del cristal pasa de 0 a 1 de opacidad entre t = 0,1 y t = 0,4.
- **Brillo especular:** una capa en el cristal que se traslada en X con t.
- **La sombra de contacto** (`.pj-ph-floor`) aparece y se afila al aterrizar.
- **Las columnas del juego** entran desde los lados solo al final (t de 0,82 a 1, con opacity y translateX). Sin vuelo, o con movimiento reducido, se ven quietas.
- **El saludo de Vera:** el hook pone `data-await` en la escena al empezar y `data-landed` al aterrizar. El CSS oculta el saludo solo con `[data-await]:not([data-landed])`, y al aterrizar se ven primero los puntos de «escribiendo» y después el saludo. Sin JS el saludo está siempre.

### 4.3 Juego
- **Columna izquierda:**
  - eyebrow «Juega a ser tu cliente»;
  - h2 visible «Tú escribes. Axi atiende.»;
  - seis jugadas como botones sobrios: icono neutro, nombre, pista corta y check al jugarla;
  - la primera se destaca hasta que se juega.
- **Columna derecha:**
  - isla de tinta «Lo que acabas de ver», con brillo violeta porque es la IA; dice qué hizo Axi en la última jugada;
  - progreso «N de 7» en 7 segmentos de tinta, con los chips de habilidad;
  - al completar las 7: «7 de 7. Ahora, con tu catálogo.», el CTA de prueba y «Jugar otra vez».
- **Se mantienen** el guion, los audios, la isla del nav y `game-state`.
- **Móvil:** jugadas en rejilla de 2 columnas bajo el teléfono (sin scroll horizontal) y la nota debajo.

### 4.4 Recuperar
Tres fichas, una por disparador real, cada una con un mensaje de ejemplo que sigue a los clientes del juego:
- Valentina: pedido #1042 a medias.
- Pedro: progresivos.
- Andrés: 6 días en Compromiso.

Al pie: «Las reglas nacen apagadas… Nunca más de un mensaje de marketing al día por cliente. En los planes Crecimiento y Escala. Mensajes de ejemplo.»

### 4.5 Piezas
- Dock monocromo: sin puntos de color, la pestaña activa en tinta.
- El brillo y la sombra de la ventana usan el tono de marca, no el de la pieza.
- Debajo del titular, una línea «qué hace por ti» (`Piece.line`).
- Se quitan los degradados coral→ámbar de barras y medidores (tinta, con el último tramo en coral). Los colores de estado dentro de las pantallas (violeta = Axi, éxito, mora) se quedan: son los del panel real.
- Móvil: el dock en filas que se ajustan, sin scroll horizontal.

### 4.6 Precio vivo
- `page.tsx` pasa a `async`, con `export const revalidate = 60;` como literal. Llama a `loadPublicCatalog()`, el mismo de `/` y `/precios`.
- Cálculo: `vol = catalog.volumes.find(v => v.conversations === 1000)` y `planMonthlyCop(catalog, "esencial", vol.id, new Date())`.
  - Con promoción abierta, el precio de lista sale tachado (`planListCop`), igual que en `PricingPlans`.
  - Si no hay catálogo o no hay tramo, no se pinta ninguna cifra: solo la lista y «Ver todos los planes».
- La página se añade a `PAGES` en `catalog-revalidate.test.ts`.
- Un cambio en /platform tarda como máximo unos 120 s en verse: 60 s de Redis más 60 s de ISR.

### 4.7 Control
Cuatro fichas: no inventa precios, no regala margen, el pago lo verifica tu equipo, y si no sabe te la pasa (2 fallos o lo pide el cliente; cola de 5 min que sube de prioridad). Debajo, una franja de tinta con la regla «Nunca inventes precios ni tiempos de entrega.» y «Si se acaba tu plan, Axi se pausa y tu bandeja sigue funcionando.».

### 4.8 Cierre
Ruta monocroma: línea de puntos, «Hoy» en coral y el día 2 en tinta. Cada paso trae su respuesta:
- **Hoy:** alta en un botón por el canal oficial de Meta; la verificación del número se hace con el negocio.
- **Día 2:** fotos, precios y stock, o sincronización desde Shopify.
- **Día 3:** clientes reales; el equipo lo ve todo en la bandeja.
- **Día 7:** sin tarjeta; si no sigue, sus datos quedan intactos.

Debajo, «Te acompañamos en la activación» y los enlaces «Ver precios», «Escríbele a nuestro agente» y «Más preguntas» (`/#preguntas`).

### 4.9 Ritmo
Las escenas nuevas tienen altura natural; no usan `min-height: 100svh`. Se miden los huecos entre escenas a 1440×900, 1366×657 y 390×844 y se cierran los de más de ~160 px.

## 5. Verificación
1. `jest` de `src/modules/landing` y `src/shared/components/layout/site`, incluidos `productos.test.ts` (vetadas), `productos-anchors` y `catalog-revalidate`.
2. `tsc` con `NODE_OPTIONS=--max-old-space-size=4096`.
3. Capturas a 1440 claro y oscuro, a 1366×657 y a 390×844, con `qa-inspect` para solapes.
4. Rendimiento del vuelo con `qa/qa-perfil.mjs`.
5. Nunca un `next build` mientras corre la integración (9,9 GB de RAM).

## 6. Fuera de alcance
- Testimonios: no hay ninguno publicado y no se inventan.
- Cambios en el backend.
- La FAQ de la home.
