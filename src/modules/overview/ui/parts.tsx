"use client";

/**
 * Piezas visuales de `/overview`. Cada tipo de lámina pinta su idea con el sistema de la maqueta aprobada
 * (docs/design/mockups/overview-deck/): subtítulos «dos tamaños», la UI real en video y nada de texto de relleno.
 */
import Link from "next/link";
import { useEffect, useRef } from "react";
import { FaFacebookMessenger, FaInstagram, FaShopify, FaWhatsapp } from "react-icons/fa6";
import { Phone } from "lucide-react";

import { BrandMark } from "@/shared/components/ui/brand-mark";
import { formatCop } from "@/modules/landing/public";

import { CASES, type CaseTag } from "../domain/diagnosis";
import { clipSources, type ClipFormat, type ClipId } from "../domain/media";
import type { PlansView } from "../domain/plans";
import { INTEGRATIONS, PILLARS, PROBLEMS, STEPS, type Slide } from "../domain/slides";

export function Subtitle({ slide, marked, align }: { slide: Slide; marked: boolean; align?: "start" }) {
  return (
    <div className="ov-sub" data-align={align}>
      {marked ? <span className="ov-case">tu caso</span> : null}
      <span className="ov-lead">{slide.lead}</span>
      <span className="ov-key">
        {slide.key.map((segment, i) =>
          segment.accent ? <em key={i}>{segment.text}</em> : <span key={i}>{segment.text}</span>,
        )}
      </span>
      {slide.support ? <p className="ov-support">{slide.support}</p> : null}
      {slide.channelLogos ? <ChannelLogos /> : null}
    </div>
  );
}

function ChannelLogos() {
  const logos = [
    { name: "WhatsApp", Icon: FaWhatsapp },
    { name: "Instagram", Icon: FaInstagram },
    { name: "Messenger", Icon: FaFacebookMessenger },
    { name: "Shopify", Icon: FaShopify },
  ];
  return (
    <ul className="ov-logos" aria-label="Canales">
      {logos.map(({ name, Icon }) => (
        <li key={name}>
          <Icon aria-hidden="true" />
          {name}
        </li>
      ))}
      <li>
        <Phone aria-hidden="true" strokeWidth={2} />
        Teléfono
      </li>
    </ul>
  );
}

/**
 * Un recorrido de UI real. Solo la lámina actual y sus vecinas montan el video (las demás no descargan nada); la
 * actual lo reproduce desde el principio cada vez que se entra. Con movimiento reducido se queda el póster: el
 * encuadre final, el legible.
 */
export function ClipMedia({
  clip,
  format,
  label,
  active,
  near,
  reducedMotion,
  mediaBase,
}: {
  clip: ClipId;
  format: ClipFormat;
  label: string;
  active: boolean;
  near: boolean;
  reducedMotion: boolean;
  mediaBase: string | null;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const src = clipSources(clip, format, mediaBase);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (active) {
      video.currentTime = 0;
      void video.play().catch(() => {
        // Autoplay bloqueado (modo ahorro): queda el póster, que ya es el encuadre final.
      });
    } else {
      video.pause();
    }
  }, [active, format]);

  return (
    <div className="ov-media">
      <figure className="ov-screen" data-format={format} aria-label={label}>
        <div className="ov-tilt">
          <div className="ov-frame">
            {near && !reducedMotion ? (
              <video
                key={format}
                ref={ref}
                muted
                playsInline
                disablePictureInPicture
                preload={active ? "auto" : "metadata"}
                poster={src.poster}
                aria-hidden="true"
                tabIndex={-1}
              >
                <source src={src.webm} type="video/webm" />
                <source src={src.mp4} type="video/mp4" />
              </video>
            ) : near ? (
              // eslint-disable-next-line @next/next/no-img-element -- póster de Cloudinary ya optimizado
              <img src={src.poster} alt="" />
            ) : null}
          </div>
        </div>
      </figure>
    </div>
  );
}

export function DiagnosisPanel({
  cases,
  onToggle,
  markedCount,
}: {
  cases: readonly CaseTag[];
  onToggle: (tag: CaseTag) => void;
  markedCount: number;
}) {
  return (
    <div className="ov-diag-wrap">
      <div className="ov-diag" role="group" aria-label="Lo que le pasa a tu negocio">
        {CASES.map((c) => {
          const on = cases.includes(c.tag);
          return (
            <button key={c.tag} type="button" className="ov-chip" aria-pressed={on} onClick={() => onToggle(c.tag)}>
              <span className="ov-box" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              </span>
              {c.label}
            </button>
          );
        })}
        <p className="ov-diag-foot" aria-live="polite">
          {cases.length
            ? `${markedCount} láminas responden a lo que marcaste. Quedan señaladas en la ruta.`
            : "Marca lo que te pasa. Lo que responde a eso queda señalado en el recorrido."}
        </p>
      </div>
    </div>
  );
}

export function Problems() {
  return (
    <div className="ov-tri">
      {PROBLEMS.map((p) => (
        <div key={p.word}>
          <b>{p.word}</b>
          <span>{p.line}</span>
        </div>
      ))}
    </div>
  );
}

export function Pillars() {
  return (
    <div className="ov-pillars">
      <BrandMark className="ov-iso" aria-hidden="true" />
      <ul>
        {PILLARS.map((p) => (
          <li key={p.word} data-tone={p.tone}>
            <i aria-hidden="true" />
            <b>{p.word}</b>
            <span>{p.line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const HUB_W = 1700;
const HUB_H = 1000;
const HUB_ICONS: Partial<Record<(typeof INTEGRATIONS)[number]["id"], typeof FaShopify>> = {
  shopify: FaShopify,
  whatsapp: FaWhatsapp,
};

/** Los sistemas que el negocio ya usa, conectados a Axi: cables con un pulso coral hacia el centro. */
export function IntegrationsHub() {
  const cx = HUB_W / 2;
  const cy = HUB_H / 2;
  return (
    <div className="ov-media">
      <div className="ov-hub">
        <svg className="ov-wires" viewBox={`0 0 ${HUB_W} ${HUB_H}`} preserveAspectRatio="none" aria-hidden="true">
          {INTEGRATIONS.map((n, i) => {
            const x = (n.x / 100) * HUB_W;
            const y = (n.y / 100) * HUB_H;
            const mx = (x + cx) / 2;
            const d = `M${x},${y} C${mx},${y} ${mx},${cy} ${cx},${cy}`;
            return (
              <g key={n.id}>
                <path className="ov-wire" d={d} />
                <path className="ov-pulse" d={d} style={{ animationDelay: `${i * 0.45}s` }} />
              </g>
            );
          })}
        </svg>
        <div className="ov-core">
          <BrandMark aria-hidden="true" />
        </div>
        {INTEGRATIONS.map((n) => {
          const Icon = HUB_ICONS[n.id];
          return (
            <div key={n.id} className="ov-node" style={{ left: `${n.x}%`, top: `${n.y}%` }}>
              <span className="ov-tile" data-wordmark={n.id === "siesa" ? "" : undefined}>
                {Icon ? <Icon aria-hidden="true" /> : null}
                {n.name}
              </span>
              <small>{n.line}</small>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function RouteSteps() {
  return (
    <ol className="ov-route">
      {STEPS.map((s) => (
        <li key={s.word}>
          <b>{s.word}</b>
          <span>{s.line}</span>
        </li>
      ))}
    </ol>
  );
}

const AS_OF = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Bogota" });

export function Plans({ plans }: { plans: PlansView | null }) {
  if (!plans) {
    return (
      <div className="ov-plans ov-plans--empty">
        <p>
          Los precios están a un clic:{" "}
          <Link prefetch={false} href="/precios">
            axi-connect.co/precios
          </Link>
        </p>
      </div>
    );
  }
  return (
    <div className="ov-plans">
      {plans.cards.map((card) => (
        <div key={card.slug} className="ov-plan" data-anchor={card.anchor ? "" : undefined}>
          {card.anchor ? <span className="ov-plan-tag">Más elegido</span> : null}
          <h3>{card.name}</h3>
          <div className="ov-price">
            {formatCop(card.monthlyCop)}
            <small>/mes</small>
          </div>
          {card.listCop ? <s className="ov-list">{formatCop(card.listCop)}</s> : null}
          <p>{card.line}</p>
        </div>
      ))}
      <p className="ov-plans-foot">
        <span className="ov-live" aria-hidden="true" />
        Precio en vivo al <b>{AS_OF.format(new Date(plans.asOf))}</b>
        {plans.volumeLabel ? ` · con ${plans.volumeLabel} al mes` : ""}
        {plans.promotion ? ` · ${plans.promotion} de fundador` : ""} · 7 días gratis
      </p>
    </div>
  );
}

export function Cover({ slide, company, reducedMotion }: { slide: Slide; company: string | null; reducedMotion: boolean }) {
  return (
    <div className="ov-cover">
      <BrandMark className="ov-iso" aria-hidden="true" />
      <Subtitle slide={slide} marked={false} />
      {company ? (
        <span className="ov-para">
          preparado para <b>{company}</b>
        </span>
      ) : null}
      <span className="ov-hint">
        <span className="ov-hint-d">usa ← → para avanzar</span>
        <span className="ov-hint-m">{reducedMotion ? "toca a los lados para avanzar" : "desliza para avanzar"}</span>
      </span>
    </div>
  );
}

export function Closing({ slide, whatsappUrl, whatsappLabel }: { slide: Slide; whatsappUrl: string; whatsappLabel: string }) {
  return (
    <div className="ov-cover">
      <BrandMark className="ov-iso" aria-hidden="true" />
      <Subtitle slide={slide} marked={false} />
      <div className="ov-cta">
        <Link prefetch={false} className="ov-btn" data-variant="primary" href="/comenzar">
          Prueba Axi 7 días gratis
        </Link>
        <a className="ov-btn" href={whatsappUrl} target="_blank" rel="noopener noreferrer">
          <FaWhatsapp aria-hidden="true" />
          {whatsappLabel}
        </a>
      </div>
      <span className="ov-hint">axi-connect.co</span>
    </div>
  );
}
