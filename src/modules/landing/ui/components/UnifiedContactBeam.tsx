"use client";

import { useRef, type ReactNode } from "react";
import { FaFacebookMessenger, FaInstagram, FaWhatsapp } from "react-icons/fa";

import { cn } from "@/core/lib/utils";
import { BrandMark } from "@/shared/components/ui/brand-mark";
import { AnimatedBeam } from "@/modules/landing/ui/components/AnimatedBeam";

/**
 * Visual de la card «Contacto unificado» (§#crm): los tres canales laten hacia
 * la α — haces de luz coral escalonados que convergen en el mismo contacto.
 * Los logos de terceros llevan su color oficial SOLO en el icono
 * (`.text-logo-*`, DESIGN-SYSTEM §7); el pulso es siempre de marca.
 */
export function UnifiedContactBeam({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const whatsappRef = useRef<HTMLDivElement | null>(null);
  const instagramRef = useRef<HTMLDivElement | null>(null);
  const messengerRef = useRef<HTMLDivElement | null>(null);
  const alphaRef = useRef<HTMLDivElement | null>(null);

  return (
    <div
      ref={containerRef}
      aria-hidden
      className={cn("relative flex h-24 items-center justify-between px-2", className)}
    >
      <div className="flex h-full flex-col justify-between py-0.5">
        <ChannelNode ref={whatsappRef} className="text-logo-whatsapp">
          <FaWhatsapp className="size-4.5" />
        </ChannelNode>
        <ChannelNode ref={instagramRef} className="text-logo-instagram">
          <FaInstagram className="size-4.5" />
        </ChannelNode>
        <ChannelNode ref={messengerRef} className="text-logo-messenger">
          <FaFacebookMessenger className="size-4" />
        </ChannelNode>
      </div>

      <div
        ref={alphaRef}
        className="border-border bg-card shadow-float z-10 mr-4 flex size-14 items-center justify-center rounded-full border"
      >
        <BrandMark className="size-9" />
      </div>

      <AnimatedBeam
        containerRef={containerRef}
        fromRef={whatsappRef}
        toRef={alphaRef}
        curvature={-26}
        delay={0}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={instagramRef}
        toRef={alphaRef}
        delay={1.4}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={messengerRef}
        toRef={alphaRef}
        curvature={26}
        delay={2.8}
      />
    </div>
  );
}

function ChannelNode({
  ref,
  className,
  children,
}: {
  ref: React.RefObject<HTMLDivElement | null>;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      ref={ref}
      className={cn(
        "border-border bg-secondary z-10 flex size-9 items-center justify-center rounded-full border shadow-float",
        className,
      )}
    >
      {children}
    </div>
  );
}
