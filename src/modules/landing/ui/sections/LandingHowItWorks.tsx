"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";

import { cn } from "@/core/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { Reveal } from "@/modules/landing/ui/components/Reveal";
import { SectionHeading } from "@/modules/landing/ui/components/SectionHeading";
import { TiltCard } from "@/modules/landing/ui/components/TiltCard";
import { AgentMascot } from "@/modules/landing/ui/components/mockups/AgentMascot";
import { ChatConversation } from "@/modules/landing/ui/components/mockups/ChatConversation";
import { SalePaidCard } from "@/modules/landing/ui/components/mockups/SalePaidCard";
import {
  HOW_IT_WORKS,
  LANDING_ANCHORS,
  STORY_CHAT,
  type ChatMessage,
} from "@/modules/landing/ui/content/landing.content";

/**
 * Mensajes del chat de §4: la venta del hoodie de Savage + los dos hitos
 * del sistema (pago reportado, verificado) como píldoras dentro del hilo.
 */
const STORY_MESSAGES: ReadonlyArray<ChatMessage> = [
  ...STORY_CHAT.messages,
  /* ids con prefijo propio ("sys-"): los mensajes del contenido usan s1…s5
     y estos hitos añadidos aquí no deben poder chocar con ellos (React keys) */
  { id: "sys-payment-reported", from: "system", kind: "system", text: HOW_IT_WORKS.timeline.events[1] },
  { id: "sys-payment-verified", from: "system", kind: "system", text: HOW_IT_WORKS.timeline.events[2] },
];

/** Cuántos mensajes del hilo revela cada paso del timeline (1-indexado). */
const STEP_TO_MESSAGES = [1, 3, 5, 7, 7];

/**
 * Paso del timeline: reporta al padre cuándo cruza la franja central del
 * viewport para que el chat sticky avance en paralelo.
 */
function StoryStep({
  index,
  n,
  title,
  body,
  active,
  onActivate,
}: {
  index: number;
  n: string;
  title: string;
  body: string;
  active: boolean;
  onActivate: (index: number) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inCenter = useInView(ref, { margin: "-38% 0px -38% 0px" });

  useEffect(() => {
    if (inCenter) onActivate(index);
  }, [inCenter, index, onActivate]);

  return (
    <div ref={ref} className="flex gap-5">
      <span
        aria-hidden
        className={cn(
          "font-mono text-sm font-semibold tabular-nums transition-colors duration-200",
          active ? "text-brand" : "text-muted-foreground/60",
        )}
      >
        {n}
      </span>
      <div className={cn("transition-opacity duration-200", active ? "opacity-100" : "opacity-70")}>
        <h3 className="text-lg leading-snug font-semibold">{title}</h3>
        <p className="text-muted-foreground mt-2 text-[15px] leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

/**
 * §4 Cómo funciona — una venta real paso a paso: el timeline avanza y el
 * chat sticky la reproduce en paralelo, con el panel del pedido y la
 * "Venta pagada" como remate. En móvil se apila (chat después de los pasos).
 */
export default function LandingHowItWorks() {
  const [activeStep, setActiveStep] = useState(0);
  const visibleUpTo = STEP_TO_MESSAGES[Math.min(activeStep, STEP_TO_MESSAGES.length - 1)];

  return (
    <section id={LANDING_ANCHORS.howItWorks} className="w-full scroll-mt-24">
      <div className="mx-auto w-full max-w-[1200px] px-6 py-20 md:py-28">
        <Reveal>
          <SectionHeading title={HOW_IT_WORKS.title} className="max-w-4xl" />
        </Reveal>

        <div className="mt-14 grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
          {/* Timeline de 5 pasos */}
          <div className="flex flex-col gap-12">
            {HOW_IT_WORKS.steps.map((step, i) => (
              <StoryStep
                key={step.n}
                index={i}
                n={step.n}
                title={step.title}
                body={step.body}
                active={activeStep >= i}
                onActivate={setActiveStep}
              />
            ))}
            <div>
              <Button asChild size="lg" className="h-11 px-6">
                <a href={`#${LANDING_ANCHORS.demo}`}>{HOW_IT_WORKS.cta}</a>
              </Button>
            </div>
          </div>

          {/* Panel sticky: agente + chat en vivo + remate */}
          <div className="flex h-max flex-col gap-4 lg:sticky lg:top-28">
            <TiltCard depth={5}>
              {/* Acento coral (el violeta queda reservado a §6, DESIGN.md §3.1) */}
              <div className="border-brand/20 bg-card flex items-center gap-3.5 rounded-2xl border bg-gradient-to-r from-[color-mix(in_srgb,var(--axi-brand)_8%,transparent)] to-transparent px-4 py-3.5">
                <AgentMascot
                  variant="lumoCloseup"
                  width={64}
                  bob="none"
                  square
                  className="bg-secondary size-16 rounded-[18px] object-cover"
                />
                <div className="flex flex-col gap-0.5">
                  <span className="text-[14.5px] font-semibold">{HOW_IT_WORKS.agentCard.title}</span>
                  <span className="text-muted-foreground text-[12.5px]">
                    {HOW_IT_WORKS.agentCard.subtitle}
                  </span>
                </div>
              </div>
            </TiltCard>

            <ChatConversation
              businessName={STORY_CHAT.businessName}
              status={STORY_CHAT.status}
              messages={STORY_MESSAGES}
              mode="controlled"
              visibleUpTo={visibleUpTo}
            />

            <div
              className={cn(
                "flex justify-end transition-opacity duration-300",
                activeStep >= 3 ? "opacity-100" : "opacity-0",
              )}
              aria-hidden={activeStep < 3}
            >
              <SalePaidCard card={STORY_CHAT.saleCard} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
