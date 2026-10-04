import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { OG_SIZE, type OgCard } from "@/core/seo/og-cards";
import { BRAND_RIBBONS } from "@/shared/components/ui/brand-mark";

/**
 * La tarjeta de enlace «La película» (plan §26, lienzo aprobado): tinta, la
 * marca arriba, el titular centrado y, abajo, el marco del video con el anillo
 * de §25 encendido y el nudo de luz tocando su filo superior. Dentro del marco,
 * el chat (home) o una frase de la página.
 *
 * Restricciones de satori (el motor de `next/og`): solo flex, sombras sin
 * `inset` ni desenfoque aparte, degradados radiales con `circle at` y paradas
 * en px (sin `closest-side`), y fuentes TTF/OTF: la Nexa y la Poppins van en
 * TTF en esta carpeta privada del App Router. Se genera en el build (rutas
 * estáticas), así que leer del disco es seguro.
 */
const font = (file: string) => readFile(join(process.cwd(), "src/app/_og", file));

const INK = "#0a0a0b";
const PAPER = "#f5f5f7";

/** El marco: dónde está y el punto del filo que toca la luz. */
const FRAME = { left: 210, top: 418, width: 780, height: 300 };
const TOUCH_X = FRAME.left + FRAME.width / 2;

export async function filmCard(card: OgCard) {
  const [heavy, light, regular, medium] = await Promise.all([
    font("Nexa-Heavy.ttf"),
    font("Nexa-ExtraLight.ttf"),
    font("Poppins-Regular.ttf"),
    font("Poppins-Medium.ttf"),
  ]);
  const headTop = card.kicker ? 148 : 122;
  const subTop = headTop + card.size * 2 + 22;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: INK,
          color: PAPER,
          fontFamily: "Poppins",
        }}
      >
        {/* La marca y el dominio. */}
        <div style={{ position: "absolute", left: 56, top: 44, display: "flex", alignItems: "center", gap: 12 }}>
          <svg width="44" height="44" viewBox="0 0 500 500">
            <defs>
              {BRAND_RIBBONS.map((r) => (
                <linearGradient key={r.name} id={`og-${r.name}`} x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} gradientUnits="userSpaceOnUse">
                  <stop stopColor={r.from} />
                  <stop offset="1" stopColor={r.to} />
                </linearGradient>
              ))}
            </defs>
            {BRAND_RIBBONS.map((r) => (
              <path key={r.name} d={r.d} fillRule={r.evenOdd ? "evenodd" : undefined} fill={`url(#og-${r.name})`} />
            ))}
          </svg>
          <span style={{ fontFamily: "Nexa", fontWeight: 700, fontSize: 24, letterSpacing: "-0.02em" }}>Axi Connect</span>
        </div>
        <span style={{ position: "absolute", right: 56, top: 56, fontSize: 17, color: "rgba(245,245,247,0.6)" }}>axi-connect.co</span>

        {card.kicker ? (
          <span
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 112,
              display: "flex",
              justifyContent: "center",
              fontFamily: "Poppins",
              fontWeight: 500,
              fontSize: 15,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "#f08a6c",
            }}
          >
            {card.kicker}
          </span>
        ) : null}

        <div
          style={{
            position: "absolute",
            left: 60,
            right: 60,
            top: headTop,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            lineHeight: 1.0,
            letterSpacing: "-0.045em",
            fontFamily: "Nexa",
            fontSize: card.size,
          }}
        >
          <span style={{ fontWeight: 700 }}>{card.lines[0]}</span>
          <span style={{ fontWeight: 200 }}>{card.lines[1]}</span>
        </div>
        <span
          style={{
            position: "absolute",
            left: 60,
            right: 60,
            top: subTop,
            display: "flex",
            justifyContent: "center",
            fontSize: 20,
            color: "rgba(245,245,247,0.72)",
          }}
        >
          {card.sub}
        </span>

        {/* El marco del video con el anillo de §25: filo, corona y bloom; el violeta, solo lejano. */}
        <div
          style={{
            position: "absolute",
            left: FRAME.left,
            top: FRAME.top,
            width: FRAME.width,
            height: FRAME.height,
            borderRadius: 28,
            background: "linear-gradient(180deg, #121214, #050506)",
            boxShadow:
              "0 0 0 1.5px rgba(255,238,210,0.92), 0 0 6px 2px rgba(240,164,49,0.7), 0 0 26px 6px rgba(230,87,89,0.5), 0 0 90px 18px rgba(230,87,89,0.2), 0 0 170px 30px rgba(154,79,255,0.08)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {card.frame.kind === "chat" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "42px 56px 0" }}>
              <span
                style={{
                  alignSelf: "flex-start",
                  maxWidth: 430,
                  padding: "13px 18px",
                  borderRadius: "20px 20px 20px 6px",
                  background: "#232326",
                  fontSize: 19,
                  lineHeight: 1.35,
                }}
              >
                Hola, ¿tienen domicilio a Laureles?
              </span>
              <span
                style={{
                  alignSelf: "flex-end",
                  maxWidth: 470,
                  padding: "13px 18px",
                  borderRadius: "20px 20px 6px 20px",
                  background: PAPER,
                  color: INK,
                  fontSize: 19,
                  lineHeight: 1.35,
                }}
              >
                ¡Sí! Llegamos a Laureles en 35 min. Te comparto el más pedido.
              </span>
            </div>
          ) : (
            <span
              style={{
                display: "flex",
                justifyContent: "center",
                textAlign: "center",
                padding: "64px 64px 0",
                fontSize: 22,
                lineHeight: 1.45,
                color: "rgba(245,245,247,0.82)",
              }}
            >
              {card.frame.text}
            </span>
          )}
        </div>

        {/* El destello sobre el filo y el nudo que lo toca, en el centro. */}
        <div
          style={{
            position: "absolute",
            left: TOUCH_X - 150,
            top: FRAME.top - 7,
            width: 300,
            height: 14,
            borderRadius: 999,
            background: "linear-gradient(90deg, rgba(255,213,128,0), rgba(255,213,128,0.55) 30%, rgba(255,255,255,0.95) 50%, rgba(255,213,128,0.55) 70%, rgba(255,213,128,0))",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: TOUCH_X - 60,
            top: FRAME.top - 60,
            width: 120,
            height: 120,
            background:
              "radial-gradient(circle at 60px 60px, #ffffff 0px, rgba(255,213,128,0.9) 13px, rgba(230,87,89,0.45) 33px, rgba(230,87,89,0) 60px)",
          }}
        />
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "Nexa", data: heavy, weight: 700, style: "normal" },
        { name: "Nexa", data: light, weight: 200, style: "normal" },
        { name: "Poppins", data: regular, weight: 400, style: "normal" },
        { name: "Poppins", data: medium, weight: 500, style: "normal" },
      ],
    },
  );
}
