"use client";

import { useEffect, useState } from "react";
import { Check, LoaderCircle } from "lucide-react";

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
import { FlowActions, FlowBackButton } from "@/modules/onboarding/ui/flow/FlowActions";
import { FlowScreen } from "@/modules/onboarding/ui/flow/FlowScreen";

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
    <FlowScreen
      focusHeading
      size="wide"
      title={created.length > 0 ? "Tu agente está listo" : "Crea tu primer agente"}
      lead={
        created.length > 0
          ? "Puedes crear otro con una plantilla distinta o continuar. Todo se ajusta después en Agentes."
          : `Elegimos plantillas para ${niche?.name.toLowerCase() ?? "tu negocio"}. Personaliza nombre, tono y personalidad, o crea el recomendado tal cual con un clic.`
      }
    >
      {templates === null && !loadError ? (
        <div className="grid w-full gap-3 md:grid-cols-3" aria-busy="true" aria-label="Cargando plantillas">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-44 rounded-2xl" />
          ))}
        </div>
      ) : null}

      {loadError ? (
        <div className="sf-glass flex w-full flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 text-left text-sm">
          <span role="alert">{loadError}</span>
          <Button size="sm" variant="outline" onClick={() => setReloadKey((key) => key + 1)}>
            Reintentar
          </Button>
        </div>
      ) : null}

      {templates && templates.length === 0 ? (
        <p className="sf-glass w-full rounded-2xl p-5 text-sm leading-relaxed">
          Aún no hay plantillas para este tipo de negocio. Puedes crear tu agente desde cero en Agentes cuando termines.
        </p>
      ) : null}

      {templates && templates.length > 0 ? (
        <div role="radiogroup" aria-label="Plantillas" className="grid w-full gap-3 text-left md:grid-cols-3">
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
        <ul className="flex w-full max-w-[560px] flex-col gap-2 text-left" aria-label="Agentes creados">
          {created.map(({ agent, template, tone }) => (
            <li key={agent.id} className="sf-glass flex items-center justify-between gap-3 rounded-2xl px-4 py-3">
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

      <FlowActions
        type="button"
        label={created.length > 0 ? "Continuar" : "Personalizar y crear"}
        disabled={created.length > 0 ? saving : !selected || creating || saving}
        onClick={created.length > 0 ? () => onDone({ agent_ids: created.map((entry) => entry.agent.id) }) : openSheet}
        secondary={
          created.length === 0 ? (
            <Button
              type="button"
              variant="ghost"
              disabled={!selected || creating || saving}
              onClick={() => selected && void create(quickCreateDTO(selected, companyName), selected, TONE_LABELS.cercano)}
            >
              {creating && !sheetOpen ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : null}
              Crear el recomendado tal cual
            </Button>
          ) : undefined
        }
        error={createError && !sheetOpen ? createError : null}
        microcopy={created.length > 0 ? "Puedes crear otro con una plantilla distinta desde Agentes." : "Usa tu catálogo y tu horario automáticamente · modelo y parámetros ya afinados."}
        back={
          <>
            <FlowBackButton onClick={onBack} />
            {created.length === 0 ? (
              <Button type="button" variant="ghost" size="sm" disabled={saving} onClick={onSkip}>
                Configurar después
              </Button>
            ) : null}
          </>
        }
        className="mt-2"
      />

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
    </FlowScreen>
  );
}
