"use client";

import { forwardRef, memo, useId, type CSSProperties } from "react";

import { cn } from "@/core/lib/utils";
import {
  AVATAR_EYE_CY,
  CHARACTER_GEOMETRY,
  mouthOpenCy,
  mouthPath,
  type AssistantAvatarColor,
  type AssistantCharacter,
  type BodyShape,
  type CharacterGeometry,
} from "@/shared/components/features/assistant/avatar/avatar-characters";
import {
  resolvePoseStyle,
  type AssistantAccessory,
  type AvatarEase,
  type AssistantExpressionName,
} from "@/shared/components/features/assistant/avatar/avatar-rig";
import type { AssistantGesture } from "@/shared/components/features/assistant/avatar/avatar-mood";

export interface AssistantAvatarProps {
  expression: AssistantExpressionName;
  /** Quién es. `lumo` (Axel/Alba) por defecto; los agentes IA usan los tres de plataforma. */
  character?: AssistantCharacter;
  /**
   * Color del cuerpo, por código. Sin él no se emite `data-color` y el material
   * es el de siempre: Axel y Alba no cambian ni un píxel.
   */
  color?: AssistantAvatarColor;
  accessory?: AssistantAccessory;
  /** Gesto finito en curso (guiño, asentimiento, saludo). Lo apaga el hook por temporizador. */
  gesture?: AssistantGesture | null;
  /** 0 = salto sin viaje (reduced-motion). */
  transitionMs?: number;
  ease?: AvatarEase;
  className?: string;
}

/**
 * La cara del asistente.
 *
 * Este componente es **geometría**. Todo el material —el blanco de arcilla, el
 * carbón de ojos y boca, la oclusión, la sombra, la paleta de colores— vive en
 * el bloque `.assistant-avatar` de `globals.css` y llega por `data-layer` /
 * `data-stop` / `data-color`, igual que en `GlassGlyph`: aquí no hay ni un hex.
 * Y todo el movimiento es `transform` sobre un puñado de grupos «rig», dirigido
 * por variables CSS que este componente escribe en el `style` del `<svg>` (la
 * pose) y que los hooks escriben por ref (mirada, sacadas, parpadeo). Ningún
 * path cambia por expresión, ningún `<filter>`, ningún `backdrop-filter`: el
 * presupuesto de `AssistantAvatar.test.tsx` lo comprueba, personaje a personaje.
 *
 * Lo que sí cambia por personaje es la silueta (`avatar-characters.ts`): el
 * cuerpo puede ser varias piezas pintadas con un gradiente en espacio de
 * usuario, así que se leen como una sola; bajo el cuerpo va una copia al 103 %
 * que el CSS pinta solo con `data-color` y solo en claro (el contorno que hace
 * legible un personaje blanco sobre fondo blanco).
 *
 * `memo` con props primitivas es lo que impide que las decenas de deltas de un
 * turno de streaming vuelvan a reconciliar sesenta nodos SVG: el padre puede
 * re-renderizarse cuanto quiera; esto no.
 *
 * Decorativo por contrato: `aria-hidden`. El significado lo lleva el envoltorio
 * (`AssistantHeroAvatar`), que es quien sabe si es un botón o una imagen.
 */
export const AssistantAvatar = memo(
  forwardRef<SVGSVGElement, AssistantAvatarProps>(function AssistantAvatar(
    {
      expression,
      character = "lumo",
      color,
      accessory = "none",
      gesture = null,
      transitionMs = 480,
      ease = "spring",
      className,
    },
    ref,
  ) {
    // Ids únicos por instancia: dos caras en la misma página no comparten `defs`.
    const uid = useId();
    const id = (part: string) => `${uid}-${part}`;
    const geometry = CHARACTER_GEOMETRY[character];
    const pose = resolvePoseStyle(expression, { transitionMs, ease });
    const style = { ...pose, "--av-eye-cant": String(geometry.eye.cant) } as CSSProperties;

    return (
      <svg
        ref={ref}
        viewBox="0 0 100 100"
        aria-hidden="true"
        focusable="false"
        className={cn("assistant-avatar", className)}
        style={style}
        data-expression={expression}
        data-character={character}
        data-color={color}
        data-acc={accessory}
        data-gesture={gesture ?? undefined}
      >
        <g className="assistant-rig-gesture">
          <g className="assistant-rig-body">
            {/* Contorno: bajo el cuerpo, un 3 % más grande; solo se pinta con data-color y en claro. */}
            <g data-layer="outline">
              <Body shapes={geometry.body} />
            </g>
            <Body shapes={geometry.body} fill={`url(#${id("body")})`} />
            <g clipPath={`url(#${id("clip-body")})`}>
              {/* Oclusión abajo-derecha: es lo que hace que la arcilla tenga peso. */}
              <ellipse cx="58" cy="70" rx="46" ry="38" fill={`url(#${id("occ")})`} />
              {/* Especular ancho y tenue: se mueve CONTRA el giro, la luz está fija en el mundo. */}
              <g className="assistant-rig-hot">
                <ellipse data-layer="hot" cx="38" cy="30" rx="24" ry="18" fill={`url(#${id("hot")})`} opacity="0.5" />
              </g>
            </g>
          </g>

          <g className="assistant-rig-face">
            <Eye side="l" id={id} geometry={geometry} />
            <Eye side="r" id={id} geometry={geometry} />
            {/* Arco y apertura viajan juntos con la mirada; el arco pivota en la
                línea del labio y la apertura crece hacia abajo desde ese mismo
                labio, detrás del trazo, así que nunca asoma por fuera. */}
            <g className="assistant-rig-lips">
              <g className="assistant-rig-open">
                <ellipse
                  data-layer="mouth-open"
                  cx="50"
                  cy={mouthOpenCy(geometry.mouth)}
                  rx={geometry.mouth.openRx}
                  ry={geometry.mouth.openRy}
                />
              </g>
              <g className="assistant-rig-mouth">
                <path data-layer="mouth" d={mouthPath(geometry.mouth)} strokeWidth="2.6" />
              </g>
            </g>
          </g>

          {/* La diadema sigue al cuerpo, no a la cara: está puesta sobre la cabeza. Solo Lumo la tiene. */}
          {geometry.headset ? (
            <g className="assistant-rig-band" data-acc-part="headset">
              <path
                data-layer="acc-line"
                d="M16 50 C16 26 30 15.5 50 15.5 C70 15.5 84 26 84 50"
                strokeWidth="4.2"
              />
              <rect data-layer="acc" x="9.5" y="40.5" width="9" height="19" rx="4.5" />
              <rect data-layer="acc" x="81.5" y="40.5" width="9" height="19" rx="4.5" />
              <rect data-layer="acc-hi" x="11" y="43.5" width="2.8" height="13" rx="1.4" />
              <path data-layer="acc-line" d="M86 58 C86 68 76 71.5 66 70" strokeWidth="2.4" />
              <ellipse data-layer="acc" cx="63.5" cy="70" rx="4.4" ry="2.9" />
            </g>
          ) : null}
        </g>

        <defs>
          <clipPath id={id("clip-body")}>
            <Body shapes={geometry.body} />
          </clipPath>
          <clipPath id={id("clip-el")}>
            <ellipse cx="50" cy={AVATAR_EYE_CY} rx={geometry.eye.rx} ry={geometry.eye.ry} />
          </clipPath>
          <clipPath id={id("clip-er")}>
            <ellipse cx="50" cy={AVATAR_EYE_CY} rx={geometry.eye.rx} ry={geometry.eye.ry} />
          </clipPath>
          {/* Los `stop` no traen color: lo pone el CSS por `data-stop`. La luz del
              cuerpo es por personaje: Lumo conserva su objectBoundingBox de
              siempre (bit a bit); los de varias piezas la llevan en espacio de
              usuario para compartir una sola luz y leerse como uno. */}
          <radialGradient
            id={id("body")}
            gradientUnits={geometry.bodyGradient.kind === "user" ? "userSpaceOnUse" : undefined}
            cx={geometry.bodyGradient.cx}
            cy={geometry.bodyGradient.cy}
            r={geometry.bodyGradient.r}
          >
            <stop data-stop="body-hi" offset="0" />
            <stop data-stop="body-mid" offset="0.66" />
            <stop data-stop="body-deep" offset="1" />
          </radialGradient>
          <radialGradient id={id("occ")} cx="0.5" cy="0.5" r="0.5">
            <stop data-stop="none" offset="0.62" />
            <stop data-stop="occ" offset="1" stopOpacity="0.32" />
          </radialGradient>
          <radialGradient id={id("hot")} cx="0.5" cy="0.5" r="0.5">
            <stop data-stop="hot" offset="0" stopOpacity="0.9" />
            <stop data-stop="none" offset="1" />
          </radialGradient>
          <linearGradient id={id("ink")} x1="0" y1="0" x2="0.3" y2="1">
            <stop data-stop="ink-hi" offset="0" />
            <stop data-stop="ink" offset="0.7" />
          </linearGradient>
        </defs>
      </svg>
    );
  }),
);

/** Las piezas del cuerpo, con o sin relleno (el contorno y el clip no lo llevan). */
function Body({ shapes, fill }: { shapes: readonly BodyShape[]; fill?: string }) {
  return (
    <>
      {shapes.map((shape, index) => {
        switch (shape.kind) {
          case "ellipse":
            return <ellipse key={index} cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} fill={fill} />;
          case "circle":
            return <circle key={index} cx={shape.cx} cy={shape.cy} r={shape.r} fill={fill} />;
          case "path":
            return <path key={index} d={shape.d} fill={fill} />;
        }
      })}
    </>
  );
}

/**
 * Un ojo: óvalo de carbón, brillo, y dos párpados color arcilla recortados a la
 * forma del ojo. Abrir, entrecerrar y la «ceja» son `scaleY`/`rotate` de los
 * párpados; el parpadeo es un grupo aparte (`assistant-rig-blink`) para no pisar
 * esas transforms. La inclinación del ojo (`cant`) la aplica el CSS al grupo
 * entero por `--av-eye-cant`, espejada entre los dos lados.
 */
function Eye({ side, id, geometry }: { side: "l" | "r"; id: (part: string) => string; geometry: CharacterGeometry }) {
  const { rx, ry, glintDx, glintDy } = geometry.eye;
  const cy = AVATAR_EYE_CY;
  const lidH = ry * 2 + 3;
  return (
    <g className={`assistant-rig-eye-${side}`}>
      <g className="assistant-rig-blink">
        <g clipPath={`url(#${id(`clip-e${side}`)})`}>
          <ellipse cx="50" cy={cy} rx={rx} ry={ry} fill={`url(#${id("ink")})`} />
          <g className="assistant-rig-pupil">
            <ellipse data-layer="glint" cx={50 + glintDx} cy={cy + glintDy} rx="1.1" ry="1.4" opacity="0.9" />
          </g>
          <rect data-layer="lid" className="assistant-rig-lid-top" x="43" y={cy - ry - 3} width="14" height={lidH} />
          <rect data-layer="lid" className="assistant-rig-lid-bot" x="43" y={cy - ry} width="14" height={lidH} />
        </g>
      </g>
    </g>
  );
}
