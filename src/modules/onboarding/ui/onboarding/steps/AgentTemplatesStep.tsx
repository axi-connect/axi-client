"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, LoaderCircle } from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { clearTenantAgentsCache, type AiAgentDTO } from "@/modules/agents/public";
import {
  TONE_LABELS,
  initialDraft,
  quickCreateDTO,
  recommendedTemplate,
  toCreateDTO,
  type AgentTemplateDTO,
  type AgentTemplateDraft,
} from "@/modules/onboarding/domain/agent-templates";
import { nicheByCode } from "@/modules/onboarding/domain/niches";
import {
  createAgentFromTemplate,
  listAgentTemplates,
} from "@/modules/onboarding/infrastructure/services/agent-templates-service.adapter";
import { TemplateCard } from "@/modules/onboarding/ui/agents/TemplateCard";
import { TemplateCustomizeSheet } from "@/modules/onboarding/ui/agents/TemplateCustomizeSheet";
import { StepAside, StepFrame } from "@/modules/onboarding/ui/onboarding/StepFrame";

type CreatedAgent = { agent: AiAgentDTO; template: AgentTemplateDTO; tone: string };

/**
 * Paso 4 · Agentes (mockup F0-B). Plantillas del nicho en tarjetas de
 * selección con la recomendada preseleccionada; dos caminos: «Crear el
 * recomendado tal cual» (un clic) o «Personalizar y crear» (sheet). Se puede
 * crear más de uno; con al menos uno, «Continuar» cierra el paso con sus ids.
 */
export function AgentTemplatesStep({
  nicheCode,
  companyName,
  saving,
  onBack,
  onSkip,
  onDone,
}: {
  nicheCode: string | null;
  companyName: string | null;
  saving: boolean;
  onBack: () => void;
  onSkip: () => void;
  onDone: (result: { agent_ids: string[] }) => void;
}) {
  const [templates, setTemplates] = useState<AgentTemplateDTO[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState<AgentTemplateDraft | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedAgent[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

  const niche = nicheByCode(nicheCode);
  const nicheForTemplates = nicheCode ?? "other";

  useEffect(() => {
    let cancelled = false;
    setTemplates(null);
    setLoadError(null);
    listAgentTemplates(nicheForTemplates)
      .then((data) => {
        if (cancelled) return;
        setTemplates(data);
        setSelectedCode(recommendedTemplate(data)?.code ?? null);
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoadError(errorMessage(error, "No pudimos cargar las plantillas."));
      });
    return () => {
      cancelled = true;
    };
  }, [nicheForTemplates, reloadKey]);

  const selected = templates?.find((template) => template.code === selectedCode) ?? null;

  async function create(dto: ReturnType<typeof toCreateDTO>, template: AgentTemplateDTO, tone: string) {
    setCreateError(null);
    setCreating(true);
    try {
      const agent = await createAgentFromTemplate(dto);
      clearTenantAgentsCache();
      setCreated((current) => [...current, { agent, template, tone }]);
      setSheetOpen(false);
    } catch (error) {
      setCreateError(errorMessage(error, "No pudimos crear el agente. Inténtalo de nuevo."));
    } finally {
      setCreating(false);
    }
  }

  const openSheet = () => {
    if (!selected) return;
    setDraft(initialDraft(selected, companyName));
    setCreateError(null);
    setSheetOpen(true);
  };

  return (
    <StepFrame
      stepNumber={4}
      total={5}
      label="Agentes"
      title={created.length > 0 ? "Tu agente está listo" : "Crea tu primer agente"}
      lead={
        created.length > 0
          ? "Puedes crear otro con una plantilla distinta o continuar. Todo se ajusta después en Agentes."
          : `Elegimos plantillas para ${niche?.name.toLowerCase() ?? "tu negocio"}. Personaliza nombre, tono y personalidad, o crea el recomendado tal cual con un clic.`
      }
      footer={
        <>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onBack}>
              <ArrowLeft aria-hidden="true" />
              Atrás
            </Button>
            {created.length === 0 ? (
              <Button variant="ghost" disabled={saving} onClick={onSkip}>
                Configurar después
              </Button>
            ) : null}
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex flex-wrap justify-end gap-2">
              {created.length > 0 ? (
                <Button size="lg" className="h-11" disabled={saving} onClick={() => onDone({ agent_ids: created.map((entry) => entry.agent.id) })}>
                  Continuar
                  <ArrowRight aria-hidden="true" />
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-11"
                    disabled={!selected || creating || saving}
                    onClick={() => selected && void create(quickCreateDTO(selected, companyName), selected, TONE_LABELS.cercano)}
                  >
                    {creating && !sheetOpen ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : null}
                    Crear el recomendado tal cual
                  </Button>
                  <Button size="lg" className="h-11" disabled={!selected || creating || saving} onClick={openSheet}>
                    Personalizar y crear
                    <ArrowRight aria-hidden="true" />
                  </Button>
                </>
              )}
            </div>
            {createError && !sheetOpen ? (
              <span role="alert" className="text-destructive text-xs">
                {createError}
              </span>
            ) : null}
          </div>
        </>
      }
      aside={
        <StepAside
          glyph="ai"
          title="Qué trae la plantilla"
          text="Instrucciones probadas para tu sector, las intenciones correctas (ventas, soporte) y un manual de ventas inicial con tus datos."
          tips={["Usa tu catálogo y tu horario automáticamente", "Modelo y parámetros ya afinados", "Ajustes avanzados después en Agentes"]}
        />
      }
    >
      {templates === null && !loadError ? (
        <div className="grid gap-3 md:grid-cols-3" aria-busy="true" aria-label="Cargando plantillas">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-44 rounded-2xl" />
          ))}
        </div>
      ) : null}

      {loadError ? (
        <div className="border-warning/40 bg-warning/10 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm">
          <span role="alert">{loadError}</span>
          <Button size="sm" variant="outline" onClick={() => setReloadKey((key) => key + 1)}>
            Reintentar
          </Button>
        </div>
      ) : null}

      {templates && templates.length === 0 ? (
        <p className="border-border bg-background/70 rounded-2xl border p-5 text-sm leading-relaxed">
          Aún no hay plantillas para este tipo de negocio. Puedes crear tu agente desde cero en Agentes cuando termines.
        </p>
      ) : null}

      {templates && templates.length > 0 ? (
        <div role="radiogroup" aria-label="Plantillas" className="grid gap-3 md:grid-cols-3">
          {templates.map((template) => (
            <TemplateCard
              key={template.code}
              template={template}
              selected={template.code === selectedCode}
              onSelect={() => setSelectedCode(template.code)}
            />
          ))}
        </div>
      ) : null}

      {created.length > 0 ? (
        <ul className="mt-5 flex flex-col gap-2" aria-label="Agentes creados">
          {created.map(({ agent, template, tone }) => (
            <li key={agent.id} className="border-border bg-background/70 flex items-center justify-between gap-3 rounded-2xl border px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="bg-brand-gradient grid size-9 place-items-center rounded-full text-xs font-semibold text-white">
                  {agent.name.slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <p className="text-sm font-semibold">{agent.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {template.name} · tono {tone.toLowerCase()}
                  </p>
                </div>
              </div>
              <Badge className="bg-success/12 text-success border-transparent">
                <Check aria-hidden="true" />
                Creado
              </Badge>
            </li>
          ))}
        </ul>
      ) : null}

      <TemplateCustomizeSheet
        open={sheetOpen && selected !== null && draft !== null}
        template={selected}
        draft={draft ?? { name: "", tone: "cercano", character_id: null, extra_instructions: "" }}
        saving={creating}
        error={sheetOpen ? createError : null}
        onDraftChange={setDraft}
        onClose={() => setSheetOpen(false)}
        onSubmit={() => selected && draft && void create(toCreateDTO(selected, draft, companyName), selected, TONE_LABELS[draft.tone])}
      />
    </StepFrame>
  );
}
