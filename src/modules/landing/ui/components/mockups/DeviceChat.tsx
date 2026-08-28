"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, Image as ImageIcon, SendHorizontal } from "lucide-react";

import { cn } from "@/core/lib/utils";
import type { DemoMessage } from "@/modules/landing/ui/content/productos.content";

/**
 * El dispositivo de la escena `#agente`: un chat incrustado en un aparato que
 * CAMBIA DE FORMA por breakpoint — teléfono 19.5:9 por defecto, tablet 3:4
 * desde `lg`.
 *
 * Por qué el cambio es CSS y no JS: con `matchMedia` el servidor no sabe qué
 * pintar, así que habría desajuste de hidratación y un salto visible al
 * montar. Con variables CSS + variantes `lg:`, servidor y cliente pintan lo
 * mismo. Y hace falta: con 19.5:9 el ANCHO depende del alto, así que en un
 * portátil de pantalla baja el teléfono se estrangulaba a ~190px y la
 * interfaz se rompía; la tablet da un 60% más de ancho con el mismo
 * presupuesto vertical.
 *
 * La interfaz de dentro escala con el ancho de SU PROPIA pantalla
 * (`@container` + unidades `cqw` acotadas con `clamp`), no con el del
 * viewport: el mismo marcado se lee bien a 200px y a 480px sin breakpoints
 * internos, y por eso las tarjetas no llevan ni un ancho fijo en píxeles.
 *
 * El metal del aro es un gradiente cónico que recorre el perímetro —así los
 * destellos caen en las esquinas, como en un acero pulido de verdad— hecho
 * solo con `color-mix` sobre los tokens: ni un hex (DESIGN.md §Color).
 */
export function DeviceChat({
  business,
  status,
  initials,
  composerPlaceholder,
  backLabel,
  messages,
  visibleUpTo,
  className,
}: {
  business: string;
  status: string;
  initials: string;
  composerPlaceholder: string;
  backLabel: string;
  messages: readonly DemoMessage[];
  /** Cuántos mensajes se ven. Los demás no se montan. */
  visibleUpTo: number;
  className?: string;
}) {
  const threadRef = useRef<HTMLDivElement | null>(null);
  const stackRef = useRef<HTMLDivElement | null>(null);
  const [offset, setOffset] = useState(0);

  const shown = messages.slice(0, Math.max(0, visibleUpTo));
  const next = messages[visibleUpTo];
  const agentIsTyping = Boolean(next && next.from === "agent");

  /**
   * El hilo corre como un chat real: la pila sube para dejar el último mensaje
   * a la vista. Con `transform`, nunca `scrollTop` — un scroller interno
   * competiría con el de la página y rompería el pin.
   */
  useEffect(() => {
    const thread = threadRef.current;
    const stack = stackRef.current;
    if (!thread || !stack) return;
    const measure = () => setOffset(Math.max(0, stack.scrollHeight - thread.clientHeight));
    measure();
    /* El cambio teléfono↔tablet altera el alto disponible: hay que remedir.
       `transform` no afecta al border-box, así que esto no realimenta. */
    const observer = new ResizeObserver(measure);
    observer.observe(thread);
    observer.observe(stack);
    return () => observer.disconnect();
  }, [visibleUpTo, agentIsTyping]);

  return (
    <div
      className={cn(
        "relative h-[min(624px,100%)] max-w-full aspect-[9/19.5]",
        "[--rim-radius:46px] [--screen-radius:38px] [--shell-pad:7px] [--shell-radius:44px]",
        "lg:h-[min(660px,100%)] lg:aspect-[3/4] lg:[--rim-radius:30px]",
        "lg:[--screen-radius:14px] lg:[--shell-pad:13px] lg:[--shell-radius:27px]",
        "[transform-style:preserve-3d]",
        className,
      )}
    >
      <DeviceEdge />
      <SideButtons />

      {/* Aro de acero pulido. */}
      <div
        className="absolute inset-0 rounded-[var(--rim-radius)] p-0.5"
        style={{
          background: `${STEEL_CONIC}, color-mix(in srgb, var(--foreground) 13%, var(--background))`,
          /* En una isla oscura una sombra negra no existe: el volumen lo da
             la luz de marca, no la sombra. */
          boxShadow:
            "0 34px 90px -30px color-mix(in srgb, var(--axi-brand) 30%, transparent), 0 8px 34px -12px color-mix(in srgb, var(--axi-brand) 16%, transparent)",
        }}
      >
        <div
          className="relative h-full rounded-[var(--shell-radius)] p-[var(--shell-pad)]"
          style={{
            background: "color-mix(in srgb, var(--foreground) 2%, var(--background))",
            boxShadow: "inset 0 1px 1px color-mix(in srgb, var(--foreground) 14%, transparent)",
          }}
        >
          <FrontCamera />

          <div className="bg-background @container relative flex h-full flex-col overflow-hidden rounded-[var(--screen-radius)]">
            <Notch />
            <StatusBar />

            <header className="border-border bg-secondary flex shrink-0 items-center gap-[3.2cqw] border-b px-[4.4cqw] pt-[2cqw] pb-[3.2cqw]">
              <ChevronLeft
                aria-label={backLabel}
                className="text-muted-foreground w-[clamp(13px,5.6cqw,18px)] shrink-0"
              />
              <span
                aria-hidden
                className="font-heading bg-brand-gradient grid aspect-square w-[clamp(26px,11cqw,38px)] shrink-0 place-items-center rounded-full text-[clamp(11px,4.6cqw,15px)] font-bold text-white"
              >
                {initials}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[clamp(11.5px,4.8cqw,15px)] leading-tight font-semibold">
                  {business}
                </span>
                <span className="text-muted-foreground flex items-center gap-1.5 text-[clamp(9px,3.8cqw,12px)]">
                  <span aria-hidden className="bg-success size-[5px] shrink-0 rounded-full" />
                  {status}
                </span>
              </span>
            </header>

            <div ref={threadRef} className="relative min-h-0 flex-1 overflow-hidden">
              <div
                ref={stackRef}
                className="absolute inset-x-0 top-0 flex min-h-full flex-col justify-end px-[3.4cqw] py-[4cqw] transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)]"
                style={{ transform: `translateY(${-offset}px)` }}
              >
                {shown.map((message) => (
                  <Bubble key={message.id} message={message} />
                ))}
                {agentIsTyping ? <TypingBubble /> : null}
              </div>
            </div>

            <div className="border-border bg-secondary flex shrink-0 items-center gap-[2.8cqw] border-t px-[3.6cqw] pt-[3cqw] pb-[2cqw]">
              <span className="border-border bg-background text-muted-foreground min-w-0 flex-1 truncate rounded-full border px-[4cqw] py-[2.4cqw] text-[clamp(9.5px,4cqw,13px)]">
                {composerPlaceholder}
              </span>
              <span
                aria-hidden
                className="bg-brand text-background grid aspect-square w-[clamp(25px,10.5cqw,36px)] shrink-0 place-items-center rounded-full"
              >
                <SendHorizontal className="w-[clamp(11px,4.6cqw,16px)]" />
              </span>
            </div>

            <div
              aria-hidden
              className="bg-secondary grid h-[clamp(14px,5.4cqw,20px)] shrink-0 place-items-center"
            >
              <span
                className="h-1 w-[34%] rounded-full"
                style={{ background: "color-mix(in srgb, var(--foreground) 32%, transparent)" }}
              />
            </div>
          </div>
        </div>
      </div>

      <Gloss />
    </div>
  );
}

/* ─────────────────────────── piezas del aparato ─────────────────────────── */

/**
 * Gradiente cónico del acero: paradas alternas claro/oscuro que, al recorrer
 * el perímetro, sitúan los destellos en las esquinas. Con un color plano el
 * aro lee como un borde CSS; con esto, como metal.
 */
const STEEL_CONIC = `conic-gradient(from 202deg at 50% 50%,
  color-mix(in srgb, var(--foreground) 10%, transparent) 0deg,
  color-mix(in srgb, var(--foreground) 88%, transparent) 7deg,
  color-mix(in srgb, var(--foreground) 26%, transparent) 17deg,
  color-mix(in srgb, var(--foreground) 6%, transparent) 44deg,
  color-mix(in srgb, var(--foreground) 14%, transparent) 74deg,
  color-mix(in srgb, var(--foreground) 62%, transparent) 88deg,
  color-mix(in srgb, var(--foreground) 12%, transparent) 99deg,
  color-mix(in srgb, var(--foreground) 5%, transparent) 132deg,
  color-mix(in srgb, var(--foreground) 22%, transparent) 166deg,
  color-mix(in srgb, var(--foreground) 78%, transparent) 179deg,
  color-mix(in srgb, var(--foreground) 16%, transparent) 190deg,
  color-mix(in srgb, var(--foreground) 5%, transparent) 224deg,
  color-mix(in srgb, var(--foreground) 18%, transparent) 254deg,
  color-mix(in srgb, var(--foreground) 68%, transparent) 268deg,
  color-mix(in srgb, var(--foreground) 12%, transparent) 279deg,
  color-mix(in srgb, var(--foreground) 4%, transparent) 316deg,
  color-mix(in srgb, var(--foreground) 30%, transparent) 348deg,
  color-mix(in srgb, var(--foreground) 82%, transparent) 356deg,
  color-mix(in srgb, var(--foreground) 10%, transparent) 360deg)`;

/** Canto trasero: empujado en Z, es lo que asoma al girar y da el grosor. */
function DeviceEdge() {
  return (
    <span
      aria-hidden
      className="absolute inset-0 rounded-[var(--rim-radius)] [transform:translateZ(-11px)]"
      style={{
        background: "color-mix(in srgb, var(--foreground) 7%, var(--background))",
        boxShadow: "0 0 0 1px color-mix(in srgb, var(--foreground) 9%, transparent)",
      }}
    />
  );
}

/** Reflejo diagonal del cristal, por encima de todo. */
function Gloss() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[6] rounded-[var(--rim-radius)]"
      style={{
        background:
          "linear-gradient(114deg, transparent 30%, color-mix(in srgb, var(--foreground) 7%, transparent) 38%, color-mix(in srgb, var(--foreground) 2%, transparent) 44%, transparent 51%)",
      }}
    />
  );
}

/** Notch del teléfono; en tablet desaparece y manda `FrontCamera`. */
function Notch() {
  return (
    <span
      aria-hidden
      className="bg-background absolute top-0 left-1/2 z-[5] flex h-[26px] w-[53%] -translate-x-1/2 items-center justify-center gap-2.5 rounded-b-2xl lg:hidden"
    >
      <span
        className="h-1 w-10 rounded-full"
        style={{ background: "color-mix(in srgb, var(--foreground) 13%, transparent)" }}
      />
      <span
        className="size-2 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 32% 30%, color-mix(in srgb, var(--foreground) 22%, transparent), transparent 62%), color-mix(in srgb, var(--foreground) 7%, var(--background))",
          boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--foreground) 9%, transparent)",
        }}
      />
    </span>
  );
}

/** Cámara frontal de la tablet: vive en el bisel, no en la pantalla. */
function FrontCamera() {
  return (
    <span
      aria-hidden
      className="absolute top-[5px] left-1/2 hidden size-1.5 -translate-x-1/2 rounded-full lg:block"
      style={{
        background:
          "radial-gradient(circle at 32% 30%, color-mix(in srgb, var(--foreground) 26%, transparent), transparent 62%), color-mix(in srgb, var(--foreground) 9%, var(--background))",
      }}
    />
  );
}

const METAL_V =
  "linear-gradient(to bottom, color-mix(in srgb, var(--foreground) 10%, transparent), color-mix(in srgb, var(--foreground) 48%, transparent) 22%, color-mix(in srgb, var(--foreground) 22%, transparent) 60%, color-mix(in srgb, var(--foreground) 8%, transparent))";
const METAL_H =
  "linear-gradient(to right, color-mix(in srgb, var(--foreground) 10%, transparent), color-mix(in srgb, var(--foreground) 44%, transparent) 26%, color-mix(in srgb, var(--foreground) 20%, transparent) 64%, color-mix(in srgb, var(--foreground) 8%, transparent))";

/**
 * Botones físicos. En teléfono van en el canto lateral (silencio, volumen ×2,
 * encendido); en tablet pasan al canto superior y el de silencio no existe.
 */
function SideButtons() {
  return (
    <>
      <DeviceButton className="top-[15.5%] -left-[3px] h-[4.2%] w-[3px] rounded-l-sm lg:hidden" />
      <DeviceButton className="top-[22.5%] -left-[3px] h-[7.4%] w-[3px] rounded-l-sm lg:top-[-3px] lg:left-[63%] lg:h-[3px] lg:w-[7%] lg:rounded-t-sm lg:rounded-l-none" />
      <DeviceButton className="top-[31.5%] -left-[3px] h-[7.4%] w-[3px] rounded-l-sm lg:top-[-3px] lg:left-[72%] lg:h-[3px] lg:w-[7%] lg:rounded-t-sm lg:rounded-l-none" />
      <DeviceButton className="top-[25.5%] -right-[3px] h-[11%] w-[3px] rounded-r-sm lg:top-[-3px] lg:right-auto lg:left-[17%] lg:h-[3px] lg:w-[9%] lg:rounded-t-sm lg:rounded-r-none" />
    </>
  );
}

/**
 * El eje del gradiente del botón cambia entre teléfono (vertical) y tablet
 * (horizontal). Un `style` no puede llevar variante `lg:`, así que el eje se
 * resuelve con dos capas y la media query decide cuál se ve.
 */
function DeviceButton({ className }: { className: string }) {
  return (
    <span aria-hidden className={cn("absolute z-[2] [transform:translateZ(-3px)]", className)}>
      <span className="absolute inset-0 rounded-[inherit] lg:hidden" style={{ background: METAL_V }} />
      <span
        className="absolute inset-0 hidden rounded-[inherit] lg:block"
        style={{ background: METAL_H }}
      />
    </span>
  );
}

/** Barra de estado del sistema: hora, cobertura, wifi y batería. */
function StatusBar() {
  return (
    <div
      aria-hidden
      className="bg-secondary flex h-[clamp(26px,11cqw,34px)] shrink-0 items-center justify-between px-[7cqw] pt-[3.4cqw] text-[clamp(9px,3.9cqw,12px)] font-semibold lg:pt-[2cqw]"
    >
      <span>9:41</span>
      <span
        className="flex items-center gap-1"
        style={{ color: "color-mix(in srgb, var(--foreground) 85%, transparent)" }}
      >
        <svg viewBox="0 0 15 10" fill="currentColor" className="h-[clamp(8px,3.4cqw,11px)] w-auto">
          <rect x="0" y="6.5" width="2.4" height="3.5" rx=".8" />
          <rect x="3.6" y="4.6" width="2.4" height="5.4" rx=".8" />
          <rect x="7.2" y="2.6" width="2.4" height="7.4" rx=".8" />
          <rect x="10.8" y="0" width="2.4" height="10" rx=".8" />
        </svg>
        <svg
          viewBox="0 0 13 10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          className="h-[clamp(8px,3.4cqw,11px)] w-auto"
        >
          <path d="M1 3.4a8.4 8.4 0 0 1 11 0" />
          <path d="M3.2 5.9a5 5 0 0 1 6.6 0" />
          <path d="M5.5 8.3a1.7 1.7 0 0 1 2 0" />
        </svg>
        <svg viewBox="0 0 20 10" fill="none" className="h-[clamp(8px,3.4cqw,11px)] w-auto">
          <rect
            x=".6"
            y=".6"
            width="16"
            height="8.8"
            rx="2.6"
            stroke="currentColor"
            strokeOpacity=".45"
          />
          <rect x="2.2" y="2.2" width="11" height="5.6" rx="1.4" fill="currentColor" />
          <path d="M18.2 3.4v3.2a1.9 1.9 0 0 0 0-3.2Z" fill="currentColor" fillOpacity=".45" />
        </svg>
      </span>
    </div>
  );
}

/* ──────────────────────────────── burbujas ──────────────────────────────── */

/** Ancho de las tarjetas dentro de la burbuja: del contenedor, jamás fijo. */
const CARD = "block w-[clamp(120px,60cqw,250px)] max-w-full";

function Bubble({ message }: { message: DemoMessage }) {
  if (message.kind === "system") {
    return (
      <div className="animate-msg-in mt-[2.4cqw] flex justify-center">
        <span className="bg-secondary text-muted-foreground max-w-[94%] rounded-full px-[3.6cqw] py-[1.8cqw] text-center font-mono text-[clamp(8.5px,3.5cqw,11px)]">
          {message.text}
        </span>
      </div>
    );
  }

  const fromAgent = message.from === "agent";
  return (
    <div className={cn("animate-msg-in mt-[2.4cqw] flex", fromAgent ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "min-w-0 max-w-[85%] rounded-[clamp(11px,4.6cqw,16px)] border border-transparent px-[3.7cqw] py-[2.8cqw] text-[clamp(10.5px,4.5cqw,14.5px)] leading-snug lg:max-w-[72%]",
          /* Mismos tokens que `ChatBubble` de la home: la marca habla igual
             en toda la plataforma. */
          fromAgent
            ? "bg-brand/12 border-brand/25 rounded-br-[5px]"
            : "bg-secondary rounded-bl-[5px]",
        )}
      >
        {message.kind === "receipt" ? <Receipt message={message} /> : null}
        {message.kind === "text" || message.kind === "product" || message.kind === "receipt" ? (
          <span className="block">{message.text}</span>
        ) : null}
        {message.kind === "product" ? <Product message={message} /> : null}
        {message.kind === "order" ? <Order message={message} /> : null}
      </div>
    </div>
  );
}

function Product({ message }: { message: Extract<DemoMessage, { kind: "product" }> }) {
  return (
    <span className={cn(CARD, "mt-[2.4cqw]")}>
      <span className="relative block aspect-[4/3] overflow-hidden rounded-[9px]">
        <Image
          src={message.product.imageSrc}
          alt={message.product.imageAlt}
          fill
          sizes="250px"
          className="object-cover"
        />
      </span>
      <span className="mt-[2.2cqw] block text-[clamp(10.5px,4.4cqw,14px)] font-semibold">
        {message.product.name}
      </span>
      <span className="text-muted-foreground mt-0.5 block font-mono text-[clamp(9px,3.7cqw,12px)]">
        {message.product.meta}
      </span>
    </span>
  );
}

function Order({ message }: { message: Extract<DemoMessage, { kind: "order" }> }) {
  return (
    <span className={CARD}>
      <span className="text-muted-foreground block font-mono text-[clamp(8.8px,3.6cqw,11.5px)]">
        {message.order.id}
      </span>
      <span className="mt-[3px] block font-mono text-[clamp(15px,6.3cqw,21px)] font-medium tabular-nums">
        {message.order.amount}
      </span>
      <span className="mt-[2.6cqw] flex flex-wrap gap-1.5">
        {message.order.methods.map((method) => (
          <span
            key={method}
            className="border-brand/30 rounded-full border px-2 py-[3px] text-[clamp(8.6px,3.5cqw,11px)]"
          >
            {method}
          </span>
        ))}
      </span>
    </span>
  );
}

function Receipt({ message }: { message: Extract<DemoMessage, { kind: "receipt" }> }) {
  return (
    <span className={cn(CARD, "mb-[1.8cqw]")}>
      <span className="flex items-center gap-1.5">
        <ImageIcon className="text-muted-foreground w-[clamp(11px,4.4cqw,14px)] shrink-0" />
        <span className="text-muted-foreground font-mono text-[clamp(8.4px,3.4cqw,11px)]">
          {message.receipt.label}
        </span>
      </span>
      <span className="mt-[5px] block font-mono text-[clamp(13px,5.4cqw,18px)] font-medium tabular-nums">
        {message.receipt.amount}
      </span>
      <span className="text-muted-foreground mt-0.5 block font-mono text-[clamp(8.4px,3.4cqw,11px)]">
        {message.receipt.time}
      </span>
    </span>
  );
}

/** El agente «escribe» mientras su siguiente mensaje está en camino. */
function TypingBubble() {
  return (
    <div className="mt-[2.4cqw] flex justify-end">
      <span className="bg-brand/12 border-brand/25 flex items-center gap-1 rounded-[14px] rounded-br-[5px] border px-[4cqw] py-[3.4cqw]">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className="animate-typing-bob size-[5px] rounded-full"
            style={{
              background: "color-mix(in srgb, var(--foreground) 55%, transparent)",
              animationDelay: `${index * 0.15}s`,
            }}
          />
        ))}
      </span>
    </div>
  );
}
