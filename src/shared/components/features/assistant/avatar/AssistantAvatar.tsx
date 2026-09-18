"use client";

import { forwardRef, memo, useId, type CSSProperties } from "react";

import { cn } from "@/core/lib/utils";
import {
  resolvePoseStyle,
  type AssistantAccessory,
  type AvatarEase,
  type AssistantExpressionName,
} from "@/shared/components/features/assistant/avatar/avatar-rig";
import type { AssistantGesture } from "@/shared/components/features/assistant/avatar/avatar-mood";

export interface AssistantAvatarProps {
  expression: AssistantExpressionName;
  accessory?: AssistantAccessory;
  /** Gesto finito en curso (guiño, asentimiento, saludo). Lo apaga el hook por temporizador. */
  gesture?: AssistantGesture | null;
  /** 0 = salto sin viaje (reduced-motion). */
  transitionMs?: number;
  ease?: AvatarEase;
  className?: string;
}

/* Geometría fija de la cara, en unidades del viewBox 0..100. */
const EYE = { rx: 4.3, ry: 5.8, cy: 47 } as const;

/**
 * La cara de Axel.
 *
 * Este componente es **geometría**. Todo el material —el blanco de arcilla, el
 * carbón de ojos y boca, la oclusión, la sombra— vive en el bloque
 * `.assistant-avatar` de `globals.css` y llega por `data-layer` / `data-stop`, igual
 * que en `GlassGlyph`: aquí no hay ni un hex. Y todo el movimiento es
 * `transform` sobre un puñado de grupos «rig», dirigido por variables CSS que
 * este componente escribe en el `style` del `<svg>` (la pose) y que los hooks
 * escriben por ref (mirada, sacadas, parpadeo). Ningún path cambia por
 * expresión, ningún `<filter>`, ningún `backdrop-filter`: el presupuesto de
 * `AssistantAvatar.test.tsx` lo comprueba.
 *
 * `memo` con props primitivas es lo que impide que las decenas de deltas de un
 * turno de streaming vuelvan a reconciliar sesenta nodos SVG: el padre puede
 * re-renderizarse cuanto quiera; esto no.
 *
 * Decorativo por contrato: `aria-hidden`. El significado lo lleva el envoltorio
 * (`AxelHeroAvatar`), que es quien sabe si es un botón o una imagen.
 */
export const AssistantAvatar = memo(
  forwardRef<SVGSVGElement, AssistantAvatarProps>(function AssistantAvatar(
    { expression, accessory = "none", gesture = null, transitionMs = 480, ease = "spring", className },
    ref,
  ) {
    // Ids únicos por instancia: dos caras en la misma página no comparten `defs`.
    const uid = useId();
    const id = (part: string) => `${uid}-${part}`;
    const style = resolvePoseStyle(expression, { transitionMs, ease }) as CSSProperties;

    return (
      <svg
        ref={ref}
        viewBox="0 0 100 100"
        aria-hidden="true"
        focusable="false"
        className={cn("assistant-avatar", className)}
        style={style}
        data-expression={expression}
        data-acc={accessory}
        data-gesture={gesture ?? undefined}
      >
        <g className="assistant-rig-gesture">
          <g className="assistant-rig-body">
            <ellipse cx="50" cy="50" rx="37" ry="34.5" fill={`url(#${id("body")})`} />
            <g clipPath={`url(#${id("clip-body")})`}>
              {/* Oclusión abajo-derecha: es lo que hace que la arcilla tenga peso. */}
              <ellipse cx="58" cy="70" rx="46" ry="38" fill={`url(#${id("occ")})`} />
              {/* Especular ancho y tenue: se mueve CONTRA el giro, la luz está fija en el mundo. */}
              <g className="assistant-rig-hot">
                <ellipse cx="38" cy="30" rx="24" ry="18" fill={`url(#${id("hot")})`} opacity="0.5" />
              </g>
            </g>
          </g>

          <g className="assistant-rig-face">
            <Eye side="l" id={id} />
            <Eye side="r" id={id} />
            {/* Arco y apertura viajan juntos con la mirada; el arco pivota en la
                línea del labio y la apertura crece hacia abajo desde ese mismo
                labio, detrás del trazo, así que nunca asoma por fuera. */}
            <g className="assistant-rig-lips">
              <g className="assistant-rig-open">
                <ellipse data-layer="mouth-open" cx="50" cy="62.3" rx="3.2" ry="2.1" />
              </g>
              <g className="assistant-rig-mouth">
                <path data-layer="mouth" d="M43 60 Q50 67 57 60" strokeWidth="2.6" />
              </g>
            </g>
          </g>

          {/* La diadema sigue al cuerpo, no a la cara: está puesta sobre la cabeza. */}
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
        </g>

        <defs>
          <clipPath id={id("clip-body")}>
            <ellipse cx="50" cy="50" rx="37" ry="34.5" />
          </clipPath>
          <clipPath id={id("clip-el")}>
            <ellipse cx="50" cy={EYE.cy} rx={EYE.rx} ry={EYE.ry} />
          </clipPath>
          <clipPath id={id("clip-er")}>
            <ellipse cx="50" cy={EYE.cy} rx={EYE.rx} ry={EYE.ry} />
          </clipPath>
          {/* Los `stop` no traen color: lo pone el CSS por `data-stop`. */}
          <radialGradient id={id("body")} cx="0.42" cy="0.32" r="0.85">
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

/**
 * Un ojo: óvalo de carbón, brillo, y dos párpados color arcilla recortados a la
 * forma del ojo. Abrir, entrecerrar y la «ceja» son `scaleY`/`rotate` de los
 * párpados; el parpadeo es un grupo aparte (`assistant-rig-blink`) para no pisar
 * esas transforms.
 */
function Eye({ side, id }: { side: "l" | "r"; id: (part: string) => string }) {
  const lidH = EYE.ry * 2 + 3;
  return (
    <g className={`assistant-rig-eye-${side}`}>
      <g className="assistant-rig-blink">
        <g clipPath={`url(#${id(`clip-e${side}`)})`}>
          <ellipse cx="50" cy={EYE.cy} rx={EYE.rx} ry={EYE.ry} fill={`url(#${id("ink")})`} />
          <g className="assistant-rig-pupil">
            <ellipse data-layer="glint" cx="48.6" cy={EYE.cy - 2.6} rx="1.1" ry="1.4" opacity="0.9" />
          </g>
          <rect data-layer="lid" className="assistant-rig-lid-top" x="43" y={EYE.cy - EYE.ry - 3} width="14" height={lidH} />
          <rect data-layer="lid" className="assistant-rig-lid-bot" x="43" y={EYE.cy - EYE.ry} width="14" height={lidH} />
        </g>
      </g>
    </g>
  );
}
