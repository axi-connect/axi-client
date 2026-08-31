import { useId } from "react";
import { cn } from "@/core/lib/utils";
import { GLYPH_GEOMETRY, type GlyphKind } from "./glyph-geometry";

/**
 * Los tres tamaños del sistema, y el ÚNICO mando: el tier decide a la vez el
 * tamaño, qué capas se dibujan y el grosor del trazo (esto último en
 * `globals.css`). Separarlos permitiría pedir el detalle grande a 48 px (barro)
 * o un trazo de 1 px sobre 176 (silueta anémica), que es justo el defecto que el
 * tier existe para evitar.
 */
export type GlyphTier = "sm" | "md" | "lg";

const TIER_SIZE: Record<GlyphTier, string> = {
  sm: "size-12", // 48px — dentro de una card, junto a una frase
  md: "size-24", // 96px — el estado vacío estándar
  lg: "size-44", // 176px — el vacío de página completa de un tenant nuevo
};

type GlassGlyphProps = Omit<React.SVGProps<SVGSVGElement>, "children"> & {
  kind: GlyphKind;
  tier?: GlyphTier;
};

/**
 * Un glifo del set de **cristal ilustrado** (DESIGN-SYSTEM §7): el objeto de
 * vidrio que ocupa el sitio del icono en un estado vacío.
 *
 * Este componente es **geometría**. Todo el material —color, respuesta al tema,
 * acento, luz y reflejo— vive en el bloque `.glass-glyph` de `globals.css` y
 * llega por `data-layer` / `data-stop`. El motivo es técnico, no estético:
 * `var()` dentro de un *atributo de presentación* (`fill="var(--x)"`) es frágil,
 * mientras que `stop-color`, `fill` y `stroke` son propiedades CSS de pleno
 * derecho. Por eso aquí no hay ni un hex ni una clase `dark:` — es **más
 * estricto que `BrandMark`**, que sí se declara artwork y lleva los suyos.
 *
 * Nueve capas y **cero filtros SVG**: un `feGaussianBlur` sobre un canto duro
 * produce exactamente una rampa de gradiente, así que la rampa se autora en los
 * `stop` y no se paga una superficie offscreen por instancia (con seis u ocho
 * glifos visibles en un dashboard eso serían seis u ocho por repintado). La
 * refracción del canto es un trazo grueso recortado a su propia forma.
 *
 * Y **cero `backdrop-filter`**, que no es un detalle: el glass de §5 está
 * *definido* por esa propiedad, y no usarla es lo que sostiene que un glifo no
 * es una superficie y no le aplica el mandamiento 3. Es un test binario — si
 * un glifo llega a usarla, deja de estar autorizado por §7.
 *
 * Decorativo por contrato: `aria-hidden`. El significado lo llevan el título y
 * la descripción del estado vacío, y un `<title>` aquí los duplicaría en el
 * lector de pantalla.
 */
export function GlassGlyph({
  kind,
  tier = "md",
  className,
  ...props
}: GlassGlyphProps) {
  // Ids únicos por instancia: dos glifos en la misma página no deben compartir
  // `defs` (un ancestro oculto rompería los gradientes del resto). Mismo motivo
  // que `BrandMark`. El id solo alimenta `url(#…)`: los ganchos de estilo son
  // `data-*`, así que el CSS no depende del formato interno de React.
  const uid = useId();
  const id = (part: string) => `${uid}-${part}`;

  const { back, front, engrave, core, accent } = GLYPH_GEOMETRY[kind];
  // `sm` dibuja cinco capas: a 48 px el caustic, el pedestal, la refracción del
  // canto y el reflejo viajero caen por debajo del píxel o se pisan entre sí.
  // El foco especular fijo SÍ entra — es lo que hace que a tamaño pequeño se
  // siga leyendo como vidrio y no como una silueta.
  const detailed = tier !== "sm";
  const shapes = back === null ? [front] : [back, front];

  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      className={cn(
        "glass-glyph shrink-0",
        // Las DOS clases modificadoras son obligatorias: el acento alimenta la
        // luz de color y el tier ajusta el grosor del rim y del grabado (a 128px
        // un trazo de 1px se pierde; a 32px 1,5px es un dibujo infantil).
        `glass-glyph--${accent}`,
        `glass-glyph--${tier}`,
        TIER_SIZE[tier],
        className,
      )}
      {...props}
    >
      {detailed && (
        <>
          {/* 1 · caustic — sombra en claro; en oscuro el token la convierte en
              un charco de luz, que es lo que deja un objeto translúcido. */}
          <ellipse
            data-layer="cast"
            cx="23"
            cy="42"
            rx="14"
            ry="3"
            fill={`url(#${id("cast")})`}
          />
          {/* 2 · pedestal — normaliza el fondo real hacia `--background`. Sin
              canto, así que no se lee como plato. Apagado por token en oscuro:
              allí los tres fondos del panel están a pocos puntos entre sí, no
              hay nada que normalizar y cualquier alfa ensucia el vidrio. */}
          <ellipse
            data-layer="plate"
            cx="24"
            cy="24"
            rx="23"
            ry="22"
            fill={`url(#${id("plate")})`}
          />
        </>
      )}

      {/* 3 · la luz de color, DETRÁS del cuerpo y recortada a la silueta. */}
      <g data-layer="core" clipPath={`url(#${id("clip")})`}>
        <ellipse
          cx={core.cx}
          cy={core.cy}
          rx={core.rx}
          ry={core.ry}
          fill={`url(#${id("core")})`}
        />
      </g>

      {/* 4 · cuerpo dicroico: cálido arriba-izquierda, neutro al centro, frío
          abajo-derecha. El neutro del medio es lo que evita que el glifo
          parezca un icono de color en vez de vidrio. */}
      <g data-layer="body">
        {shapes.map((d) => (
          <path key={d} d={d} fill={`url(#${id("body")})`} />
        ))}
      </g>

      {detailed && (
        /* 5 · refracción del canto: trazo grueso recortado a su propia forma =
           trazo interior. Espesor sin un solo filtro. */
        <g data-layer="edge" clipPath={`url(#${id("clip")})`}>
          {shapes.map((d) => (
            <path
              key={d}
              d={d}
              stroke={`url(#${id("edge")})`}
              strokeWidth="3"
              fill="none"
            />
          ))}
        </g>
      )}

      {/* 6 · foco especular FIJO, en la esquina por donde entra la luz. Es la
          capa que hace que parezca vidrio EN REPOSO, sin depender del puntero:
          sin ella el glifo quieto es solo una silueta translúcida. */}
      <g data-layer="hot" clipPath={`url(#${id("clip")})`}>
        <ellipse cx="14" cy="13" rx="15" ry="13" fill={`url(#${id("hot")})`} />
      </g>

      {detailed && (
        /* 7 · reflejo viajero. Recorre 20 de las 48 unidades y aparca sobre la
           masa del cuerpo, no en el borde. La inclinación va en el ATRIBUTO del
           rect y el viaje en el `transform` CSS del `<g>`: un transform de CSS
           anula el atributo `transform` del mismo elemento, así que viven en
           elementos distintos a propósito. */
        <g data-layer="sheen" clipPath={`url(#${id("clip")})`}>
          <rect
            x="6"
            y="-10"
            width="12"
            height="68"
            transform="rotate(18 12 24)"
            fill={`url(#${id("spec")})`}
          />
        </g>
      )}

      {/* 8 · rim light — LA SILUETA. Es la red de seguridad: si el pedestal, el
          cuerpo y las luces fallaran, el glifo se sigue reconociendo por aquí.
          `non-scaling-stroke` lo mantiene en píxeles reales de 48 a 176 px
          (el grosor por tier lo pone el CSS), y es lo único que permite un solo
          path para un rango de 3,7×. */}
      <g data-layer="rim">
        {shapes.map((d) => (
          <path
            key={d}
            d={d}
            stroke={`url(#${id("rim")})`}
            strokeWidth="1"
            fill="none"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>

      {engrave.length > 0 && (
        /* 9 · grabado. Una línea grabada en vidrio CAPTA la luz, así que va más
           brillante que el canto (token propio) y no hereda el gradiente de dos
           picos del rim: sus líneas son cortas y caían justo en el valle. */
        <g data-layer="engrave">
          {engrave.map((d) => (
            <path
              key={d}
              d={d}
              fill="none"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>
      )}

      <defs>
        <clipPath id={id("clip")}>
          {shapes.map((d) => (
            <path key={d} d={d} />
          ))}
        </clipPath>

        {/* Los `stop` no traen color: lo pone el CSS por `data-stop`. */}
        <linearGradient
          id={id("body")}
          x1="8"
          y1="6"
          x2="40"
          y2="42"
          gradientUnits="userSpaceOnUse"
        >
          <stop data-stop="warm" offset="0" />
          <stop data-stop="mid" offset="0.5" />
          <stop data-stop="cool" offset="1" />
        </linearGradient>

        <linearGradient
          id={id("edge")}
          x1="24"
          y1="4"
          x2="24"
          y2="44"
          gradientUnits="userSpaceOnUse"
        >
          <stop data-stop="hi" offset="0" stopOpacity="0.3" />
          <stop data-stop="none" offset="0.45" />
          <stop data-stop="rim-lo" offset="1" />
        </linearGradient>

        {/* Dos picos: la luz de entrada arriba-izquierda y el Fresnel del canto
            de salida abajo-derecha. Es lo que separa «vidrio» de «gris». */}
        <linearGradient
          id={id("rim")}
          x1="8"
          y1="6"
          x2="40"
          y2="42"
          gradientUnits="userSpaceOnUse"
        >
          <stop data-stop="rim" offset="0" />
          <stop data-stop="rim-lo" offset="0.42" />
          <stop data-stop="rim-lo" offset="0.72" />
          <stop data-stop="rim" offset="1" />
        </linearGradient>

        <linearGradient
          id={id("spec")}
          x1="6"
          y1="24"
          x2="18"
          y2="24"
          gradientUnits="userSpaceOnUse"
        >
          <stop data-stop="none" offset="0" />
          <stop data-stop="spec" offset="0.5" />
          <stop data-stop="none" offset="1" />
        </linearGradient>

        <radialGradient id={id("hot")} cx="0.5" cy="0.5" r="0.5">
          <stop data-stop="hot" offset="0" />
          <stop data-stop="none" offset="1" />
        </radialGradient>

        <radialGradient id={id("cast")} cx="0.5" cy="0.5" r="0.5">
          <stop data-stop="cast" offset="0" />
          <stop data-stop="none" offset="1" />
        </radialGradient>

        <radialGradient id={id("plate")} cx="0.5" cy="0.5" r="0.5">
          <stop data-stop="plate" offset="0" />
          <stop data-stop="plate" offset="0.34" />
          <stop data-stop="none" offset="0.88" />
        </radialGradient>

        <radialGradient id={id("core")} cx="0.5" cy="0.5" r="0.5">
          <stop data-stop="accent" offset="0" />
          <stop data-stop="accent-mid" offset="0.55" />
          <stop data-stop="none" offset="1" />
        </radialGradient>
      </defs>
    </svg>
  );
}
