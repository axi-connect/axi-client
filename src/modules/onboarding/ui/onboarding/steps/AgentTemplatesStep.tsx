"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { clearTenantAgentsCache, listCharacters, type AiAgentDTO, type CharacterDTO } from "@/modules/agents/public";
import {
  ROLE_LABELS,
  TONE_LABELS,
  defaultAgentName,
  draftBlocker,
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
import { AgentPreview } from "@/modules/onboarding/ui/agents/AgentPreview";
import { TemplateCustomizeForm } from "@/modules/onboarding/ui/agents/TemplateCustomizeForm";
import { FlowActions, FlowBackButton } from "@/modules/onboarding/ui/flow/FlowActions";
import { FlowScreen } from "@/modules/onboarding/ui/flow/FlowScreen";
import { FlowTile } from "@/modules/onboarding/ui/flow/FlowTile";
import { ROLE_GRAPHICS } from "@/modules/onboarding/ui/onboarding/graphics/AgentRoleGraphics";

type CreatedAgent = { agent: AiAgentDTO; template: AgentTemplateDTO; tone: string };
type Phase = "choose" | "customize" | "created";

/**
 * Paso 4 · Agentes (onboarding «Flow», aprobado 2026-09-05). Tres subpantallas
 * en la misma parada:
 *
 * - **Elegir**: las plantillas del nicho como fichas (la recomendada
 *   preseleccionada) y, al lado, el teléfono con la conversación de ejemplo de
 *   la plantilla elegida. Dos caminos: «Crear el recomendado tal cual» (un
 *   clic) o «Personalizar».
 * - **Personalizar**: el formulario (antes un sheet) a la izquierda y el
 *   teléfono que cambia en vivo a la derecha: el dueño ve a quién está creando.
 * - **Creado**: la lista de agentes creados; «Continuar» cierra el paso con sus
 *   ids, «Crear otro agente» vuelve a elegir.
 *
 * Los payloads no cambian: «tal cual» manda `quickCreateDTO`; personalizado,
 * solo las diferencias (`toCreateDTO`).
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
  const [characters, setCharacters] = useState<CharacterDTO[] | null>(null);
  const [customizing, setCustomizing] = useState(false);
  const [choosingAnother, setChoosingAnother] = useState(false);
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

  // Las personalidades se cargan una vez: el teléfono muestra su nombre y el
  // formulario las ofrece. Si fallan, el selector queda deshabilitado y el
  // paso sigue: la plantilla trae su personalidad recomendada.
  useEffect(() => {
    let cancelled = false;
    listCharacters()
      .then((response) => {
        if (!cancelled) setCharacters(response.data);
      })
      .catch(() => {
        if (!cancelled) setCharacters([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = templates?.find((template) => template.code === selectedCode) ?? null;
  const phase: Phase = customizing ? "customize" : created.length > 0 && !choosingAnother ? "created" : "choose";
  const characterName = (id: string | null) => characters?.find((character) => character.id === id)?.name ?? null;

  async function create(dto: ReturnType<typeof toCreateDTO>, template: AgentTemplateDTO, tone: string) {
    setCreateError(null);
    setCreating(true);
    try {
      const agent = await createAgentFromTemplate(dto);
      clearTenantAgentsCache();
      setCreated((current) => [...current, { agent, template, tone }]);
      setCustomizing(false);
      setChoosingAnother(false);
    } catch (error) {
      setCreateError(errorMessage(error, "No pudimos crear el agente. Inténtalo de nuevo."));
    } finally {
      setCreating(false);
    }
  }

  const startCustomizing = () => {
    if (!selected) return;
    setDraft(initialDraft(selected, companyName));
    setCreateError(null);
    setCustomizing(true);
  };

  if (phase === "customize" && selected && draft) {
    const blocker = draftBlocker(draft);
    return (
      <FlowScreen focusHeading size="wide" title={`Dale su voz a ${draft.name.trim() || selected.name}`} lead="Cambia lo que quieras; todo se puede ajustar después en Agentes.">
        <div className="grid w-full gap-5 text-left lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
          <div className="bg-background border-border rounded-2xl border p-5 shadow-[0_12px_40px_rgb(0_0_0/.06)] sm:p-6">
            <TemplateCustomizeForm draft={draft} onDraftChange={setDraft} characters={characters} />
          </div>
          <AgentPreview
            className="order-first justify-self-center lg:order-none lg:sticky lg:top-3"
            name={draft.name}
            tone={draft.tone}
            characterName={characterName(draft.character_id)}
            companyName={companyName}
            nicheCode={nicheCode}
          />
        </div>
        <FlowActions
          type="button"
          label="Crear agente"
          submitting={creating}
          disabled={blocker !== null || saving}
          onClick={() => void create(toCreateDTO(selected, draft, companyName), selected, TONE_LABELS[draft.tone])}
          error={createError}
          microcopy={blocker ?? "Tu agente empieza a atender en cuanto conectes un canal."}
          back={<FlowBackButton onClick={() => setCustomizing(false)} />}
          className="mt-2"
        />
      </FlowScreen>
    );
  }

  if (phase === "created") {
    return (
      <FlowScreen focusHeading title="Tu agente está listo" lead="Puedes crear otro con una plantilla distinta o continuar. Todo se ajusta después en Agentes.">
        <ul className="flex w-full max-w-[560px] flex-col gap-2 text-left" aria-label="Agentes creados">
          {created.map(({ agent, template, tone }) => (
            <li key={agent.id} className="sf-glass flex items-center justify-between gap-3 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="bg-brand-gradient grid size-9 place-items-center rounded-full text-xs font-semibold text-[color:var(--axi-on-color)]">
                  {agent.name.slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <p className="text-sm font-semibold">{agent.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {template.name} · tono {tone.toLowerCase()}
                  </p>
                </div>
              </div>
              <span className="bg-accent-violet inline-flex text-[color:var(--axi-on-color)] h-6 items-center gap-1 rounded-full px-2.5 text-[11px] font-semibold tracking-[.04em] uppercase">
                <Check aria-hidden="true" className="size-3" strokeWidth={3} />
                Creado
              </span>
            </li>
          ))}
        </ul>
        <FlowActions
          type="button"
          label="Continuar"
          disabled={saving}
          onClick={() => onDone({ agent_ids: created.map((entry) => entry.agent.id) })}
          secondary={
            <Button type="button" variant="ghost" disabled={saving} onClick={() => setChoosingAnother(true)}>
              Crear otro agente
            </Button>
          }
          microcopy="Tu agente empieza a atender en cuanto conectes un canal."
          className="mt-2"
        />
      </FlowScreen>
    );
  }

  return (
    <FlowScreen
      focusHeading
      size="wide"
      title="¿Quién atenderá por ti?"
      lead={`Elegimos plantillas para ${niche?.name.toLowerCase() ?? "tu negocio"}. Crea la recomendada tal cual con un clic, o dale tu nombre, tu tono y tu personalidad.`}
    >
      <div className="grid w-full gap-5 text-left lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
        <div className="flex flex-col gap-2.5">
          {templates === null && !loadError ? (
            <div className="flex flex-col gap-2.5" aria-busy="true" aria-label="Cargando plantillas">
              {[0, 1, 2].map((index) => (
                <Skeleton key={index} className="h-[100px] rounded-[14px]" />
              ))}
            </div>
          ) : null}

          {loadError ? (
            <div className="sf-glass flex w-full flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm">
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
            <div role="radiogroup" aria-label="Plantillas" className="flex flex-col gap-2.5">
              {templates.map((template) => {
                const Graphic = ROLE_GRAPHICS[template.role];
                return (
                  <FlowTile
                    key={template.code}
                    role="radio"
                    testId={`template-${template.code}`}
                    checked={template.code === selectedCode}
                    onClick={() => setSelectedCode(template.code)}
                    title={template.name}
                    badge={template.recommended ? "Recomendado" : undefined}
                    description={
                      <>
                        {ROLE_LABELS[template.role]} · {template.description}
                        {template.default_skills.length > 0 ? (
                          <span className="mt-1.5 flex flex-wrap gap-1" aria-hidden="true">
                            {template.default_skills.map((skill) => (
                              <span key={skill} className="sf-line rounded-full border px-2 py-px text-[11px]">
                                {skill}
                              </span>
                            ))}
                          </span>
                        ) : null}
                      </>
                    }
                    graphic={<Graphic />}
                  />
                );
              })}
            </div>
          ) : null}
        </div>

        {selected ? (
          <AgentPreview
            className="order-first justify-self-center lg:order-none lg:sticky lg:top-3"
            name={defaultAgentName(selected, companyName)}
            tone="cercano"
            characterName={characterName(selected.recommended_character_id)}
            companyName={companyName}
            nicheCode={nicheCode}
          />
        ) : null}
      </div>

      <FlowActions
        type="button"
        label="Crear el recomendado tal cual"
        submitting={creating}
        disabled={!selected || saving}
        onClick={() => selected && void create(quickCreateDTO(selected, companyName), selected, TONE_LABELS.cercano)}
        secondary={
          <Button type="button" variant="ghost" disabled={!selected || creating || saving} onClick={startCustomizing}>
            Personalizar
          </Button>
        }
        error={createError}
        microcopy="Usa tu catálogo y tu horario automáticamente · modelo y parámetros ya afinados."
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
    </FlowScreen>
  );
}
