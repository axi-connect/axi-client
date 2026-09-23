"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronRight, MessageSquareText } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";

import { applyServerValidation, errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { agentHasVoice, CHARACTER_LABELS, COLOR_LABELS, type AiAgentDTO } from "@/modules/agents/domain/agent";
import { createAgent, deleteAgent, getAgentById, setAgentIntentions, updateAgent } from "@/modules/agents/infrastructure/services/agent-service.adapter";
import { useAgent } from "@/modules/agents/infrastructure/stores/agent.context";
import { AdvancedSection } from "@/modules/agents/ui/studio/AdvancedSection";
import { agentStudioSchema, type AgentStudioValues } from "@/modules/agents/ui/studio/agent-studio.schema";
import { agentToStudioValues, defaultModelFor, defaultStudioValues, toAgentDto, toIntentionsDto, toUpdateDto } from "@/modules/agents/ui/studio/agent-studio.mappers";
import { CharacterPicker } from "@/modules/agents/ui/studio/CharacterPicker";
import { CharacterStage } from "@/modules/agents/ui/studio/CharacterStage";
import { ColorPalette } from "@/modules/agents/ui/studio/ColorPalette";
import { RulesPanel } from "@/modules/agents/ui/studio/RulesPanel";
import { SpecsPanel } from "@/modules/agents/ui/studio/SpecsPanel";
import { StudioSaveBar } from "@/modules/agents/ui/studio/StudioSaveBar";
import { StudioSkeleton } from "@/modules/agents/ui/studio/StudioSkeleton";
import { VoicePicker } from "@/modules/agents/ui/studio/VoicePicker";
import { PROUD_MS } from "@/shared/components/features/assistant";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";

function OptionBlock({ title, aside, children }: { title: string; aside?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="flex items-baseline justify-between text-[11.5px] font-semibold tracking-[.08em] text-muted-foreground uppercase">
        {title}
        {aside ? <span className="text-xs font-normal tracking-normal normal-case">{aside}</span> : null}
      </h3>
      {children}
    </div>
  );
}

/**
 * El estudio de agentes (D5): `/admin/agents/new` y `/admin/agents/[id]`.
 *
 * Izquierda, pegada al hacer scroll: el personaje VIVO en su escenario y sus
 * opciones (personaje, color, voz). Derecha: Especificaciones, Reglas (el
 * brief como listas) y «Avanzado» plegado. Un solo `useForm`, un solo
 * `isDirty`, un solo «Guardar» en la barra de abajo. Guardar = `POST/PATCH`
 * + `PUT :id/intentions` (segunda llamada, como siempre).
 *
 * El escenario recibe primitivas y es `memo`: escribir reglas no reconcilia
 * la cara. Sus humores nacen de acciones (guardando, error, escribiendo el
 * nombre, muestra de voz): en reposo no hay temporizadores.
 */
export function AgentStudioView({ mode, agentId = null }: { mode: "create" | "edit"; agentId?: string | null }) {
  const router = useRouter();
  const { showAlert, showModal, closeModal } = useAlert();
  const { models, intentions, channels, voices, voiceSettings, fetchModels, fetchIntentions, fetchChannels, fetchVoices, fetchVoiceSettings, fetchAgents } = useAgent();

  const [agent, setAgent] = useState<AiAgentDTO | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const proudTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const form = useForm<AgentStudioValues>({
    resolver: zodResolver(agentStudioSchema),
    defaultValues: defaultStudioValues(null),
  });
  const { isDirty } = form.formState;

  // Catálogos: siempre re-fetch al abrir (los preview_url caducan; el switch de empresa cambia en otra pestaña)
  useEffect(() => {
    void fetchModels();
    void fetchIntentions();
    void fetchChannels();
    void fetchVoices();
    void fetchVoiceSettings();
  }, [fetchChannels, fetchIntentions, fetchModels, fetchVoiceSettings, fetchVoices]);

  // Crear: el modelo por defecto llega con el catálogo (sin ensuciar el form)
  useEffect(() => {
    if (mode !== "create" || models === null || form.getValues("model") !== "") return;
    form.setValue("model", defaultModelFor(models, form.getValues("provider")));
  }, [form, mode, models]);

  // Editar: cargar el agente y montar el form sobre él
  useEffect(() => {
    if (mode !== "edit" || agentId === null) return;
    let cancelled = false;
    getAgentById(agentId)
      .then((loaded) => {
        if (cancelled) return;
        setAgent(loaded);
        form.reset(agentToStudioValues(loaded));
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoadError(errorMessage(error, "No pudimos cargar el agente."));
      });
    return () => {
      cancelled = true;
    };
  }, [agentId, form, mode]);

  // Salir con cambios: el navegador pregunta
  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  useEffect(
    () => () => {
      if (proudTimer.current !== null) clearTimeout(proudTimer.current);
    },
    [],
  );

  const celebrate = () => {
    setJustSaved(true);
    if (proudTimer.current !== null) clearTimeout(proudTimer.current);
    proudTimer.current = setTimeout(() => setJustSaved(false), PROUD_MS);
  };

  const onSubmit = async (values: AgentStudioValues) => {
    if (saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      if (mode === "edit" && agent) {
        const updated = await updateAgent(agent.id, toUpdateDto(values, agent));
        const withIntentions = await setAgentIntentions(agent.id, toIntentionsDto(values, agent));
        setAgent(withIntentions);
        form.reset(agentToStudioValues(withIntentions));
        void fetchAgents();
        celebrate();
        void updated;
      } else {
        const created = await createAgent(toAgentDto(values, null));
        if (values.intentions.length > 0) await setAgentIntentions(created.id, toIntentionsDto(values, null));
        void fetchAgents();
        showAlert({ tone: "success", title: `${created.name} ya existe`, description: "Actívalo y asígnalo a un canal cuando esté listo." });
        form.reset(values);
        router.replace(`/admin/agents/${created.id}`);
      }
    } catch (error) {
      if (!applyServerValidation(error, form)) setSaveError(errorMessage(error, "No pudimos guardar el agente"));
      else setSaveError("Revisa los campos marcados.");
    } finally {
      setSaving(false);
    }
  };

  const leave = () => router.push("/admin/agents");
  const onCancel = () => {
    if (!isDirty) {
      leave();
      return;
    }
    showModal({
      title: "Salir sin guardar",
      description: "Tienes cambios sin guardar. Si sales ahora, se pierden.",
      actions: [
        { label: "Seguir editando", variant: "outline", asClose: true, id: "studio-stay" },
        {
          label: "Salir sin guardar",
          variant: "destructive",
          asClose: false,
          id: "studio-leave",
          onClick: () => {
            closeModal();
            leave();
          },
        },
      ],
      className: "sm:max-w-md",
    });
  };

  const onDelete = () => {
    if (!agent) return;
    showModal({
      title: "Eliminar agente",
      description: `¿Seguro que deseas eliminar a “${agent.name}”? Los canales que lo usaban quedan sin agente predeterminado.`,
      actions: [
        { label: "Cancelar", variant: "outline", asClose: true, id: "studio-delete-cancel" },
        {
          label: "Eliminar",
          variant: "destructive",
          asClose: false,
          id: "studio-delete-confirm",
          onClick: () => {
            void (async () => {
              try {
                await deleteAgent(agent.id);
                await fetchAgents();
                showAlert({ tone: "success", title: "Agente eliminado" });
                leave();
              } catch (error) {
                showAlert({ tone: "error", title: errorMessage(error, "No se pudo eliminar el agente") });
              } finally {
                closeModal();
              }
            })();
          },
        },
      ],
      className: "sm:max-w-md",
    });
  };

  const onPreviewPlaying = useCallback((playing: boolean) => setPreviewPlaying(playing), []);

  if (mode === "edit" && agent === null) {
    return loadError ? (
      <div className="flex flex-col gap-4">
        <PageHeader title="Agente" description={loadError} />
        <Button asChild variant="outline" className="w-fit">
          <Link href="/admin/agents">Volver a Agentes</Link>
        </Button>
      </div>
    ) : (
      <StudioSkeleton />
    );
  }

  const name = form.watch("name");
  const status = form.watch("status");
  const appearance = form.watch("appearance");
  const voice = form.watch("voice");
  const voiceName = voices?.find((entry) => entry.external_voice_id === voice.voice_id)?.name ?? null;
  const hasVoice = voice.voice_id !== "" || (agent !== null && agentHasVoice(agent) && voice.voice_id !== "");
  const title = mode === "create" ? "Nuevo agente" : agent?.name ?? "Agente";

  return (
    <form
      id="agent-studio-form"
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        void form.handleSubmit(onSubmit)(event);
      }}
      noValidate
    >
      <nav className="flex items-center gap-2 text-[13px] text-muted-foreground" aria-label="Breadcrumb">
        <Link href="/admin/agents" className="hover:text-foreground">
          Agentes
        </Link>
        <ChevronRight className="size-3.5" aria-hidden />
        <span className="font-medium text-foreground">{title}</span>
      </nav>
      <PageHeader
        title={title}
        description={mode === "create" ? "Elige quién es, cómo suena y cómo atiende. Puedes cambiarlo todo después." : "Cambia su cara, su voz o sus reglas. Lo que guardes aplica en la siguiente conversación."}
        actions={
          mode === "edit" ? (
            <Button asChild variant="outline" size="sm" className="rounded-full">
              <Link href="/workspace/inbox">
                <MessageSquareText className="size-4" aria-hidden />
                Probar en el simulador
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(320px,372px)_minmax(0,1fr)] lg:gap-8">
        <div className="flex flex-col gap-[18px] lg:sticky lg:top-[74px]">
          <CharacterStage
            character={appearance.character}
            color={appearance.color}
            name={name}
            status={status}
            voiceName={voiceName}
            saving={saving}
            saveError={saveError !== null}
            nameFocused={nameFocused}
            justSaved={justSaved}
            previewPlaying={previewPlaying}
          />
          <OptionBlock title="Personaje" aside="tres, de la casa">
            <CharacterPicker value={appearance.character} color={appearance.color} onChange={(character) => form.setValue("appearance.character", character, { shouldDirty: true })} />
          </OptionBlock>
          <OptionBlock title="Color" aside={COLOR_LABELS[appearance.color]}>
            <ColorPalette value={appearance.color} onChange={(color) => form.setValue("appearance.color", color, { shouldDirty: true })} />
          </OptionBlock>
          <OptionBlock title="Voz" aside="opcional">
            <VoicePicker voices={voices} voiceSettings={voiceSettings} value={voice} onChange={(next) => form.setValue("voice", next, { shouldDirty: true })} onPreviewPlaying={onPreviewPlaying} />
          </OptionBlock>
          <p className="sr-only" aria-live="polite">
            Personaje {CHARACTER_LABELS[appearance.character]}, color {COLOR_LABELS[appearance.color]}
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-7">
          <SpecsPanel form={form} models={models} channels={channels} agentId={agent?.id ?? null} onNameFocus={setNameFocused} />
          <RulesPanel form={form} />
          <AdvancedSection form={form} models={models} intentions={intentions} hasVoice={hasVoice} />
          <StudioSaveBar mode={mode} dirty={isDirty} saving={saving} error={saveError} justSaved={justSaved} onCancel={onCancel} onDelete={mode === "edit" ? onDelete : undefined} />
        </div>
      </div>
    </form>
  );
}
