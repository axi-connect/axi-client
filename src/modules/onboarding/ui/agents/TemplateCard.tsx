"use client";

import { Bot, CalendarCheck, Headset, Radar, type LucideIcon } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import { ProviderCard } from "@/shared/components/features/provider-card";
import { ROLE_LABELS, type AgentTemplateDTO, type AgentTemplateRole } from "@/modules/onboarding/domain/agent-templates";

const ROLE_ICONS: Record<AgentTemplateRole, LucideIcon> = {
  ventas: Bot,
  reservas: CalendarCheck,
  soporte: Headset,
  captacion: Radar,
};

/** Tarjeta de plantilla: `ProviderCard` en modo radio; «seleccionado = elevado». */
export function TemplateCard({
  template,
  selected,
  onSelect,
}: {
  template: AgentTemplateDTO;
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = ROLE_ICONS[template.role];
  return (
    <ProviderCard
      icon={<Icon aria-hidden="true" className="text-brand size-5" />}
      title={template.name}
      subtitle={ROLE_LABELS[template.role]}
      badge={
        template.recommended ? (
          <Badge className="bg-accent-violet/15 text-accent-violet relative border-transparent">Recomendado</Badge>
        ) : undefined
      }
      body={template.description}
      chips={template.default_skills}
      selected={selected}
      onClick={onSelect}
    />
  );
}
