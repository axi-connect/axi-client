# DESIGN — Identidad de marca de Axi Connect

> **Documento de identidad visual y verbal de la marca.** Define *quién es* Axi Connect visualmente: personalidad, color, tipografía, voz y assets. Es la fuente de verdad conceptual; su contraparte técnica (tokens, componentes, reglas de implementación) vive en [`DESIGN-SYSTEM.md`](./DESIGN-SYSTEM.md).
>
> Se consulta antes de diseñar cualquier vista, feature, pieza de marketing o asset nuevo. Si una decisión visual contradice este documento, se corrige primero aquí (vía PR) y luego se implementa.

---

## 1. Esencia de la marca

**Axi Connect** es una plataforma SaaS de atención al cliente omnicanal con agentes de IA. La marca debe transmitir tres ideas simultáneas:

1. **Fluidez** — las conversaciones fluyen entre canales, entre IA y humanos, sin fricción. Visualmente: superficies líquidas, glass, gradientes suaves, movimiento físico.
2. **Claridad profesional** — es una herramienta de trabajo diario para operadores y administradores. Visualmente: minimalismo, jerarquía tipográfica nítida, mucho espacio en blanco, cero ruido decorativo en zonas de trabajo.
3. **Calidez tecnológica** — hay IA, pero al servicio de conversaciones humanas. Visualmente: el coral como color de acción (cálido, no corporativo-frío), esquinas redondeadas, microcopy cercano.

**Referente estético: Apple / iOS.** Minimalista, materiales translúcidos (glassmorphism selectivo), tipografía como protagonista, movimiento sutil y físico, obsesión por el detalle. Nunca recargado, nunca genérico-enterprise.

### Personalidad en cinco adjetivos

| Es | No es |
|---|---|
| Minimalista | Vacía o fría |
| Fluida / líquida | Gelatinosa o lenta |
| Profesional | Corporativa acartonada |
| Moderna y dinámica | Trendy pasajera |
| Cercana | Informal o infantil |

---

## 2. Logo y assets de marca

### 2.1 Isotipo

El isotipo es una **"α" (alfa) tricolor** construida con tres cintas entrelazadas — coral, ámbar y violeta — que se cruzan formando la letra. Simboliza los canales que convergen en una sola conversación.

- Archivo actual: `public/brand/isotype.png`.
- **Los tres colores del isotipo son la paleta madre de la marca** (ver §3): de ahí derivan el primario y los dos acentos.

### 2.2 Reglas de uso del logo

- Espacio de respeto: mínimo el 25% de la altura del isotipo en todos los lados.
- Sobre fondos claros: versión a color. Sobre fondos oscuros: versión a color (los tres tonos funcionan en dark) o monocroma blanca.
- **Nunca** recolorear las cintas, rotar, estirar, aplicar sombras duras ni colocar sobre fondos que compitan (fotografías saturadas, gradientes de otros colores).
- En tamaños < 24px usar solo el isotipo, nunca el logotipo con texto.

### 2.3 Inventario de assets (objetivo)

```
public/brand/
├── isotype.svg            # isotipo vectorial (fuente de verdad; el .png es derivado)
├── isotype.png            # raster para contextos que no aceptan SVG
├── logo-horizontal.svg    # isotipo + wordmark "Axi Connect" (light)
├── logo-horizontal-dark.svg
├── logo-mono-white.svg    # monocromo para fondos de color/foto
└── og-image.png           # 1200×630 para social/link previews
public/
├── favicon.ico  icon.svg  apple-touch-icon.png   # derivados del isotipo
```

*Estado actual: existen `isotype.png` y `isologo-axi-connect.svg` (isotipo vectorial — fuente de verdad del `BrandMark` inline en `shared/components/ui/brand-mark.tsx`); el resto es deuda de assets (ver plan de implementación). Los SVG default de Next ya fueron eliminados.*

### 2.4 Nombre de la marca

- Nombre visible: **Axi Connect** (dos palabras, capitalización de título). Abreviación aceptada en contextos internos de UI ya contextualizados: **Axi**.
- Nombre técnico (repos, paquetes, código): `axi-connect`, `axi-client`, `axi-server`.
- Nunca: "AXI", "axiconnect", "Axi-Connect".

---

## 3. Color

### 3.1 Paleta madre (derivada del isotipo)

| Rol | Nombre | Light | Dark | Uso |
|---|---|---|---|---|
| **Primario** | Coral | `#E65759` | `#FB7185` | Color de acción: botones primarios, links, focus ring, estados activos, momentos de marca |
| **Acento 1** | Violeta | `#7C3AED` | `#A78BFA` | Acentos de IA/automatización, gradientes de marca, gráficos, badges informativos |
| **Acento 2** | Ámbar | `#F0A431` | `#FBBF24` | Acentos de energía: highlights, gráficos, estados de atención suave |

**Jerarquía estricta:** el coral manda. El violeta y el ámbar son condimento, no plato: aparecen en gradientes de marca, visualización de datos, ilustración y momentos puntuales (badge "IA", empty states, hero). **Una vista de trabajo nunca mezcla los tres acentos a la vez** — regla práctica: coral siempre disponible; violeta *o* ámbar como acento secundario de la vista, no ambos.

### 3.2 El gradiente de marca

La firma visual de Axi Connect es el **gradiente tricolor** del isotipo:

- **Gradiente completo** (coral → ámbar → violeta): reservado para momentos hero — landing, onboarding, empty states destacados, texto de marca (`.text-brand-gradient`).
- **Gradiente corto** (coral → violeta): CTA especiales y detalles decorativos (bordes de avatar de IA, barras de progreso de marca).
- Prohibido usar gradientes de colores ajenos a la paleta (los `from-pink-400`, `from-teal-400`… de `gradients.ts` actual son deuda a migrar).

### 3.3 Neutros

Escala de grises cálido-neutra (base zinc), definida por tokens semánticos (ver DESIGN-SYSTEM §2). Fondos casi blancos en light (`#FFFFFF` / `#FAFAFA`), casi negros en dark (`#0A0A0A` / `#18181B`). El gris nunca compite con el contenido: bordes al 8–12% de opacidad del foreground.

### 3.4 Semánticos funcionales

| Rol | Light | Dark | Nota |
|---|---|---|---|
| Éxito | `#16A34A` | `#4ADE80` | Conexión activa, mensaje entregado |
| Advertencia | `#D97706` | `#FBBF24` | Comparte familia con el ámbar de marca |
| Destructivo | `#DC2626` | `#F87171` | **Debe distinguirse del coral primario** — el coral es acción positiva, el rojo destructivo es peligro. Nunca usar el coral para "eliminar" |
| Informativo | `#2563EB` | `#60A5FA` | Avisos neutros |

### 3.5 Reglas de color

1. **Ningún hex suelto en componentes.** Todo color se consume vía token semántico (`bg-primary`, `text-brand`, `bg-accent-violet`…). El único lugar donde existen valores hex es `globals.css` (ver DESIGN-SYSTEM §2). Esto garantiza el re-branding desde un solo archivo.
2. Todo par color/fondo cumple **WCAG AA** (4.5:1 texto normal, 3:1 texto grande y componentes UI) en light **y** dark.
3. El color señala significado, no decora: si un elemento no es interactivo ni comunica estado, es neutro.

---

## 4. Tipografía

| Familia | Rol | Pesos | Dónde |
|---|---|---|---|
| **Nexa** (local) | Display de marca | 200, 700 | Titulares hero de landing, splash de onboarding, momentos de marca. Solo tamaños grandes (≥ 30px) — sus pesos extremos no funcionan en UI densa |
| **Geist Sans** (Google) | UI: headings y cuerpo | variable | Todo el panel privado y el cuerpo de la landing. Estética cercana a SF Pro (referente Apple) |
| **Geist Mono** | Monoespaciada | variable | Código, IDs, tokens, datos técnicos |
| ~~Poppins~~ | *(en retirada)* | — | No usar en código nuevo; se migra a Geist |

**Principios tipográficos:**

- La jerarquía se construye con **peso y tamaño, no con color**: títulos en `font-semibold`/`font-bold`, metadatos en `text-muted-foreground`.
- Tracking ligeramente negativo en titulares grandes (`tracking-tight`), normal en cuerpo.
- Números tabulares (`tabular-nums`) en tablas, contadores y métricas.
- Escala tipográfica completa en DESIGN-SYSTEM §3.

---

## 5. Materia: glass, profundidad y forma

### 5.1 Glassmorphism selectivo (patrón iOS)

El glass es el material de las **superficies flotantes** — lo que está *encima* del contenido:

- ✅ Header privado, sidebar, modales, sheets, popovers, dropdowns, command palette, alerts flotantes.
- ❌ Superficies de contenido: tablas, formularios, cards de datos, paneles del inbox → **sólidas siempre** (legibilidad ante todo).

Receta exacta (blur, saturación, borde interior, fallback sin `backdrop-filter`) en DESIGN-SYSTEM §5.

### 5.2 Forma: redondeado generoso

Lenguaje de formas iOS: radios amplios y continuos.

- Superficies flotantes (modales, sheets, cards): **16–20px**.
- Controles (botones, inputs, selects): **10–12px**.
- Badges y pills: radio completo (`9999px`).
- Nunca esquinas rectas salvo elementos full-bleed (tablas dentro de su card contenedora).

### 5.3 Elevación

Tres niveles, con sombras suaves y difusas (nunca duras):

1. **Reposo** — contenido en página: sin sombra, separado por bordes sutiles.
2. **Flotante** — cards elevadas, dropdowns: sombra corta y difusa.
3. **Overlay** — modales, sheets: sombra amplia + glass + scrim de fondo.

---

## 6. Movimiento

**Sutil y físico, estilo Apple.** El movimiento comunica causalidad (de dónde viene, a dónde va), nunca decora en las zonas de trabajo.

- Overlays (sheets, modales): transiciones **spring** suaves (framer-motion, ya en uso en `DetailSheet`).
- Micro-interacciones: press con escala `0.97`, hover con transiciones de 150–200ms.
- Listas y datos: fades rápidos (~150ms), sin desplazamientos grandes.
- La landing pública puede ser más expresiva (partículas, hero animado), pero dentro de la paleta de marca.
- **`prefers-reduced-motion` es obligatorio**: toda animación no esencial se desactiva.

Presets y duraciones exactas en DESIGN-SYSTEM §6.

---

## 7. Voz y tono

**Cercano-profesional, en español, con tuteo.**

- Directo y claro: «Crea tu primer canal», «No hay conversaciones pendientes».
- Verbos de acción en botones: «Guardar», «Conectar canal», «Asignar» — nunca «OK», «Sí», «Aceptar» genéricos.
- Errores útiles: qué pasó + qué hacer («No pudimos conectar con WhatsApp. Verifica el QR e inténtalo de nuevo»), nunca códigos crudos ni culpar al usuario.
- Sin jerga corporativa fría («sinergia», «solución integral») ni informalidad excesiva (emojis en UI de trabajo, humor forzado).
- Microcopy breve: si una frase puede ser tres palabras, no son ocho.

---

## 8. Los diez mandamientos visuales

1. El coral es el único color de acción; violeta y ámbar son acentos, nunca ambos en la misma vista.
2. Ningún hex fuera de `globals.css`.
3. Glass solo en superficies flotantes; el contenido de trabajo es sólido.
4. Radios generosos: 16–20px flotantes, 10–12px controles, pill en badges.
5. Todo se ve perfecto en light **y** dark — no hay tema "principal".
6. La jerarquía la hace la tipografía (peso/tamaño), no el color.
7. El movimiento es spring, sutil, y respeta `prefers-reduced-motion`.
8. Destructivo ≠ coral: eliminar siempre usa el rojo semántico.
9. Espacio en blanco generoso: ante la duda, quita, no agregues.
10. Contraste AA mínimo en cada par color/fondo, en ambos temas.
