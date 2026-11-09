"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Paperclip, Plus, Trash2 } from "lucide-react";
import { isHttpError } from "@/core/api/problem";
import { errorMessage } from "@/core/lib/error-messages";
import { cn } from "@/core/lib/utils";
import { useAlert } from "@/core/providers/alert-provider";
import { useAuth } from "@/shared/auth/auth.hooks";
import { FormSkeleton } from "@/shared/components/features/loading";
import { FormStep } from "@/shared/components/features/form-steps";
import { UnsavedChangesDock } from "@/shared/components/features/island";
import { OptionsInput } from "@/shared/components/features/options-input";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { SegmentedControl } from "@/shared/components/ui/segmented";
import { Switch } from "@/shared/components/ui/switch";
import { Textarea } from "@/shared/components/ui/textarea";
import { MarketingHeader } from "@/modules/marketing/public";
import { LoadError } from "@/modules/marketing/ui/components/premium";
import {
  DEFAULT_BUTTON_TITLE,
  GAP_LABELS,
  describeGaps,
  draftGaps,
  type DeliveryBlock,
  type EditorStep,
  type ReadinessGap,
  type SocialAutomationDTO,
  type SocialChannelDTO,
  type SocialMediaDTO,
} from "@/modules/social/domain/social";
import {
  activateSocialAutomation,
  createSocialAutomation,
  getSocialAutomation,
  listChannelMedia,
  listSocialChannels,
  pauseSocialAutomation,
  updateSocialAutomation,
  uploadSocialAsset,
} from "@/modules/social/infrastructure/services/social-service.adapter";
import { PhonePreview } from "./components/PhonePreview";
import { AutomationStatus, Group, NetworkIcon, Row, Rows } from "./components/SocialPieces";

type Draft = Omit<SocialAutomationDTO, "id" | "status" | "gaps" | "funnel" | "created_at" | "updated_at">;

const EMPTY: Draft = {
  name: "",
  channel_ids: [],
  scope: "selected",
  media_ids: [],
  keywords: [],
  accept_thread_replies: false,
  public_reply_enabled: true,
  public_reply_variants: [
    "¡Listo {nombre}! Te escribí por mensaje.",
    "Te lo mandé por privado, {nombre}. Si no lo ves, revisa tus solicitudes.",
  ],
  public_reply_hourly_cap: 30,
  opener: { text: "", button_title: DEFAULT_BUTTON_TITLE },
  delivery: [],
  invite_follow: false,
  agent_goal: null,
  test_mode: false,
  test_account_ids: [],
};

function toDraft(row: SocialAutomationDTO): Draft {
  return {
    name: row.name,
    channel_ids: row.channel_ids,
    scope: row.scope,
    media_ids: row.media_ids,
    keywords: row.keywords,
    accept_thread_replies: row.accept_thread_replies,
    public_reply_enabled: row.public_reply_enabled,
    public_reply_variants: row.public_reply_variants,
    public_reply_hourly_cap: row.public_reply_hourly_cap,
    opener: row.opener,
    delivery: row.delivery,
    invite_follow: row.invite_follow,
    agent_goal: row.agent_goal,
    test_mode: row.test_mode,
    test_account_ids: row.test_account_ids,
  };
}

const STEP_LOOK = { id: "social-step", variant: "chevron", unmountWhenClosed: true } as const;

/**
 * El editor de «Comenta y recibe»: seis preguntas, una abierta a la vez, y a la
 * derecha cómo lo verá quien comenta. Guardar no activa: activar es un paso
 * aparte y el servidor dice qué falta (`gaps`).
 */
export function SocialEditorView({ automationId }: { automationId: string | null }) {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const canManage = hasPermission("marketing:manage");
  const { showAlert } = useAlert();

  const [draft, setDraft] = useState<Draft | null>(automationId === null ? EMPTY : null);
  const [initial, setInitial] = useState<string>(JSON.stringify(EMPTY));
  const [saved, setSaved] = useState<SocialAutomationDTO | null>(null);
  const [channels, setChannels] = useState<SocialChannelDTO[]>([]);
  const [media, setMedia] = useState<Record<string, SocialMediaDTO[] | "error">>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [openStep, setOpenStep] = useState<EditorStep | null>("where");

  useEffect(() => {
    listSocialChannels()
      .then(setChannels)
      .catch(() => setChannels([]));
  }, []);

  useEffect(() => {
    if (automationId === null) return;
    getSocialAutomation(automationId)
      .then((row) => {
        const next = toDraft(row);
        setSaved(row);
        setDraft(next);
        setInitial(JSON.stringify(next));
      })
      .catch((err: unknown) => setError(errorMessage(err, "No pudimos abrir la automatización")));
  }, [automationId]);

  // Las publicaciones de cada cuenta elegida, una vez por cuenta
  const selectedChannels = useMemo(() => draft?.channel_ids ?? [], [draft?.channel_ids]);
  useEffect(() => {
    for (const channelId of selectedChannels) {
      if (media[channelId] !== undefined) continue;
      listChannelMedia(channelId)
        .then((items) => setMedia((prev) => ({ ...prev, [channelId]: items })))
        .catch(() => setMedia((prev) => ({ ...prev, [channelId]: "error" })));
    }
  }, [selectedChannels, media]);

  const dirty = draft !== null && JSON.stringify(draft) !== initial;
  const set = (patch: Partial<Draft>) => setDraft((prev) => (prev === null ? prev : { ...prev, ...patch }));
  const toggle = (step: EditorStep) => setOpenStep((current) => (current === step ? null : step));

  const firstChannel = channels.find((channel) => channel.id === selectedChannels[0]);
  const network = firstChannel?.kind === "facebook_messenger" ? "facebook" : "instagram";

  const summaries = useMemo(() => {
    if (draft === null) return null;
    const accounts = channels.filter((channel) => draft.channel_ids.includes(channel.id));
    return {
      where:
        accounts.length === 0
          ? "Sin cuenta"
          : `${accounts.map((account) => account.name).join(", ")} · ${
              draft.scope === "all"
                ? "todas las publicaciones"
                : `${String(draft.media_ids.length)} ${draft.media_ids.length === 1 ? "publicación" : "publicaciones"}`
            }`,
      words: draft.keywords.length === 0 ? "Sin palabra" : draft.keywords.map((keyword) => `«${keyword}»`).join(", "),
      public: draft.public_reply_enabled
        ? `${String(draft.public_reply_variants.filter((v) => v.trim()).length)} respuestas que rotan`
        : "Sin respuesta pública",
      opener: draft.opener.text.trim().length === 0 ? "Sin mensaje" : draft.opener.text,
      delivery:
        draft.delivery.length === 0
          ? "Nada todavía"
          : `${String(draft.delivery.length)} ${draft.delivery.length === 1 ? "bloque" : "bloques"}`,
      after: draft.test_mode ? "Modo prueba" : draft.agent_goal?.trim() ? draft.agent_goal : "Objetivo por defecto",
    };
  }, [draft, channels]);

  // Con la regla del servidor, sobre lo que se está escribiendo: un paso sin
  // lo necesario se ve pendiente, nunca con el visto bueno
  const gaps = draft === null ? [] : draftGaps(draft);
  const stepState = (step: EditorStep): "done" | "pending" =>
    gaps.some((gap) => GAP_LABELS[gap].step === step) ? "pending" : "done";

  async function persist(): Promise<SocialAutomationDTO | null> {
    if (draft === null) return null;
    // Un bloque recién agregado y sin tocar no es contenido: se descarta para
    // que el borrador se pueda guardar a medias
    const delivery = draft.delivery.filter(
      (block) =>
        !(block.type === "text" && block.text.trim() === "") &&
        !(block.type === "link" && block.text.trim() === "" && block.url.trim() === "https://"),
    );
    const body = { ...draft, delivery, name: draft.name.trim() || "Comenta y recibe" };
    setSaving(true);
    try {
      const row =
        saved === null ? await createSocialAutomation(body) : await updateSocialAutomation(saved.id, body);
      const next = toDraft(row);
      setSaved(row);
      setDraft(next);
      setInitial(JSON.stringify(next));
      if (saved === null) router.replace(`/marketing/social/${row.id}`);
      if (row.status === "paused" && saved?.status === "active") {
        showAlert({
          tone: "warning",
          title: "La pausamos",
          description: describeGaps(row.gaps) ?? "Le falta algo para seguir activa.",
        });
      }
      return row;
    } catch (err) {
      showAlert({ tone: "error", title: "No se guardó", description: errorMessage(err) });
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function activate() {
    const row = dirty || saved === null ? await persist() : saved;
    if (row === null) return;
    try {
      const active = await activateSocialAutomation(row.id);
      setSaved(active);
      showAlert({
        tone: "success",
        title: "Activa",
        description: "Desde ahora responde a cada comentario con la palabra.",
      });
    } catch (err) {
      const missing =
        isHttpError(err) && err.is("social/automation_not_ready")
          ? ((err.problem?.details?.gaps as ReadinessGap[] | undefined) ?? [])
          : [];
      if (missing.length > 0) {
        setOpenStep(GAP_LABELS[missing[0]].step);
        showAlert({ tone: "warning", title: "Aún no se puede activar", description: describeGaps(missing) ?? "" });
        return;
      }
      showAlert({ tone: "error", title: "No se pudo activar", description: errorMessage(err) });
    }
  }

  async function pause() {
    if (saved === null) return;
    try {
      setSaved(await pauseSocialAutomation(saved.id));
      showAlert({ tone: "success", title: "Pausada" });
    } catch (err) {
      showAlert({ tone: "error", title: "No se pudo pausar", description: errorMessage(err) });
    }
  }

  if (error !== null) return <LoadError message={error} onRetry={() => router.refresh()} />;
  if (draft === null || summaries === null) return <FormSkeleton />;

  return (
    <div className="flex min-w-0 flex-col gap-5 pb-24">
      <MarketingHeader
        kicker="Marketing · Redes"
        title={draft.name.trim() || "Nueva automatización"}
        description="Seis preguntas. A la derecha ves lo que recibirá quien comente."
        actions={
          canManage && (
            <div className="flex items-center gap-2">
              {saved !== null && <AutomationStatus status={saved.status} />}
              {saved?.status === "active" ? (
                <Button variant="outline" className="rounded-full" onClick={() => void pause()}>
                  Pausar
                </Button>
              ) : (
                <Button className="rounded-full" disabled={saving} onClick={() => void activate()}>
                  Activar
                </Button>
              )}
            </div>
          )
        }
      />

      <div className="@container/ed">
        <div className="grid gap-4 @[60rem]/ed:grid-cols-[minmax(0,1fr)_21rem] @[60rem]/ed:items-start">
          <div className="flex min-w-0 flex-col gap-3">
            <FormStep {...STEP_LOOK} number={1} title="¿Dónde escucha?" summary={summaries.where} state={stepState("where")} open={openStep === "where"} onToggle={() => toggle("where")}>
              <Group title="Nombre" foot="Solo lo ves tú, para reconocerla en la lista.">
                <Rows>
                  <Row label="Nombre" htmlFor="social-name" stack>
                    <Input
                      id="social-name"
                      value={draft.name}
                      maxLength={80}
                      placeholder="Reel de la colección · Comenta INFO"
                      onChange={(event) => set({ name: event.target.value })}
                    />
                  </Row>
                </Rows>
              </Group>
              <Group title="Cuenta" foot="Instagram y Facebook a la vez, si quieres.">
                {channels.length === 0 ? (
                  <p className="text-muted-foreground px-4 text-sm">Conecta Instagram o Facebook en Canales para empezar.</p>
                ) : (
                  <Rows>
                    {channels.map((channel) => {
                      const checked = draft.channel_ids.includes(channel.id);
                      return (
                        <Row
                          key={channel.id}
                          label={
                            <span className="flex min-w-0 items-center gap-2">
                              <NetworkIcon network={channel.kind === "instagram_dm" ? "instagram" : "facebook"} className="size-4 shrink-0" />
                              <span className="truncate">{channel.name}</span>
                            </span>
                          }
                          hint={channel.comments_subscribed === false ? "Reconecta la cuenta: le falta el permiso de comentarios" : undefined}
                        >
                          <Switch
                            checked={checked}
                            aria-label={`Escuchar en ${channel.name}`}
                            onCheckedChange={(on) =>
                              set({
                                channel_ids: on
                                  ? [...draft.channel_ids, channel.id]
                                  : draft.channel_ids.filter((id) => id !== channel.id),
                              })
                            }
                          />
                        </Row>
                      );
                    })}
                  </Rows>
                )}
              </Group>
              <Group title="Publicaciones">
                <SegmentedControl
                  value={draft.scope}
                  onValueChange={(scope) => set({ scope })}
                  label="Qué publicaciones escucha"
                  items={[
                    { value: "selected", label: "Las que elijas" },
                    { value: "all", label: "Todas" },
                  ]}
                />
                {draft.scope === "selected" && (
                  <MediaPicker
                    channelIds={draft.channel_ids}
                    media={media}
                    selected={draft.media_ids}
                    onChange={(media_ids) => set({ media_ids })}
                  />
                )}
              </Group>
            </FormStep>

            <FormStep {...STEP_LOOK} number={2} title="¿Qué comentan?" summary={summaries.words} state={stepState("words")} open={openStep === "words"} onToggle={() => toggle("words")}>
              <Group
                title="Palabras"
                foot="Sin importar mayúsculas ni tildes, y dentro de una frase: «quiero info!!» también cuenta."
              >
                <Rows>
                  <Row label="La gente comenta" stack>
                    <OptionsInput
                      value={draft.keywords}
                      onChange={(keywords) => set({ keywords })}
                      max={10}
                      maxLength={40}
                      ariaLabel="Nueva palabra"
                    />
                  </Row>
                  <Row label="También en respuestas a otros comentarios" hint="Normalmente no: suelen ser conversaciones entre personas.">
                    <Switch
                      checked={draft.accept_thread_replies}
                      aria-label="Responder también dentro de los hilos"
                      onCheckedChange={(accept_thread_replies) => set({ accept_thread_replies })}
                    />
                  </Row>
                </Rows>
              </Group>
            </FormStep>

            <FormStep {...STEP_LOOK} number={3} title="¿Qué respondes en público?" summary={summaries.public} state={stepState("public")} open={openStep === "public"} onToggle={() => toggle("public")}>
              <Group
                title="Respuesta en el comentario"
                foot="Rotan una por una: repetir la misma frase es lo que Meta marca como spam. {nombre} menciona a la persona."
              >
                <Rows>
                  <Row label="Responder en público">
                    <Switch
                      checked={draft.public_reply_enabled}
                      aria-label="Responder en público"
                      onCheckedChange={(public_reply_enabled) => set({ public_reply_enabled })}
                    />
                  </Row>
                  {draft.public_reply_enabled &&
                    draft.public_reply_variants.map((variant, index) => (
                      <Row key={index} label={`Respuesta ${String(index + 1)}`} stack>
                        <div className="flex items-start gap-2">
                          <Input
                            value={variant}
                            maxLength={300}
                            aria-label={`Respuesta ${String(index + 1)}`}
                            onChange={(event) =>
                              set({
                                public_reply_variants: draft.public_reply_variants.map((v, i) =>
                                  i === index ? event.target.value : v,
                                ),
                              })
                            }
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Quitar la respuesta ${String(index + 1)}`}
                            onClick={() =>
                              set({ public_reply_variants: draft.public_reply_variants.filter((_, i) => i !== index) })
                            }
                          >
                            <Trash2 className="size-4" aria-hidden="true" />
                          </Button>
                        </div>
                      </Row>
                    ))}
                </Rows>
                {draft.public_reply_enabled && draft.public_reply_variants.length < 6 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="self-start rounded-full"
                    onClick={() => set({ public_reply_variants: [...draft.public_reply_variants, ""] })}
                  >
                    <Plus className="size-4" aria-hidden="true" />
                    Otra respuesta
                  </Button>
                )}
              </Group>
            </FormStep>

            <FormStep {...STEP_LOOK} number={4} title="¿Qué le escribes por privado?" summary={summaries.opener} state={stepState("opener")} open={openStep === "opener"} onToggle={() => toggle("opener")}>
              <Group
                title="El primer mensaje"
                foot="Meta deja enviar UN mensaje por comentario hasta que la persona toque el botón. Si no sigue tu cuenta, le llega a solicitudes."
              >
                <Rows>
                  <Row label="Mensaje" htmlFor="social-opener" stack>
                    <Textarea
                      id="social-opener"
                      rows={3}
                      maxLength={640}
                      value={draft.opener.text}
                      placeholder="¡Hola! Tengo lista la guía que pediste. Toca el botón y te la envío."
                      onChange={(event) => set({ opener: { ...draft.opener, text: event.target.value } })}
                    />
                  </Row>
                  <Row label="Botón" htmlFor="social-button" hint="Hasta 20 letras.">
                    <Input
                      id="social-button"
                      className="w-40"
                      maxLength={20}
                      value={draft.opener.button_title}
                      onChange={(event) => set({ opener: { ...draft.opener, button_title: event.target.value } })}
                    />
                  </Row>
                </Rows>
              </Group>
            </FormStep>

            <FormStep {...STEP_LOOK} number={5} title="¿Qué le entregas?" summary={summaries.delivery} state={stepState("delivery")} open={openStep === "delivery"} onToggle={() => toggle("delivery")}>
              <DeliveryEditor blocks={draft.delivery} onChange={(delivery) => set({ delivery })} />
              <Group foot="Al final de la entrega, nunca como condición: Meta no permite exigir que te sigan.">
                <Rows>
                  <Row label="Invitar a seguir la cuenta">
                    <Switch
                      checked={draft.invite_follow}
                      aria-label="Invitar a seguir la cuenta"
                      onCheckedChange={(invite_follow) => set({ invite_follow })}
                    />
                  </Row>
                </Rows>
              </Group>
            </FormStep>

            <FormStep {...STEP_LOOK} number={6} title="¿Y después?" summary={summaries.after} state="done" open={openStep === "after"} onToggle={() => toggle("after")}>
              <Group
                title="Tu agente sigue la conversación"
                foot="Sabe de qué publicación vino, qué comentó y qué recibió. Si lo dejas vacío, resuelve dudas y avanza hacia la venta sin presionar."
              >
                <Rows>
                  <Row label="Qué debe lograr el agente después" htmlFor="social-goal" stack>
                    <Textarea
                      id="social-goal"
                      rows={2}
                      maxLength={300}
                      value={draft.agent_goal ?? ""}
                      placeholder="Ofrecerle una demo para su negocio"
                      onChange={(event) => set({ agent_goal: event.target.value || null })}
                    />
                  </Row>
                </Rows>
              </Group>
              <Group title="Probar antes" foot="Recomendado: con el modo prueba solo responde a las cuentas de tu equipo.">
                <Rows>
                  <Row label="Modo prueba">
                    <Switch
                      checked={draft.test_mode}
                      aria-label="Modo prueba"
                      onCheckedChange={(test_mode) => set({ test_mode })}
                    />
                  </Row>
                  {draft.test_mode && (
                    <Row label="Cuentas de prueba" hint="El id de la persona en Instagram o Facebook (lo ves en su conversación)." stack>
                      <OptionsInput
                        value={draft.test_account_ids}
                        onChange={(test_account_ids) => set({ test_account_ids })}
                        max={10}
                        maxLength={64}
                        ariaLabel="Nueva cuenta de prueba"
                      />
                    </Row>
                  )}
                </Rows>
              </Group>
            </FormStep>
          </div>

          <PhonePreview
            network={network}
            accountName={firstChannel?.username ?? firstChannel?.name ?? "tu_cuenta"}
            keyword={draft.keywords[0] ?? null}
            publicReply={draft.public_reply_enabled ? (draft.public_reply_variants.find((v) => v.trim()) ?? null) : null}
            openerText={draft.opener.text}
            buttonTitle={draft.opener.button_title}
            delivery={draft.delivery}
            inviteFollow={draft.invite_follow}
            className="@[60rem]/ed:sticky @[60rem]/ed:top-4"
          />
        </div>
      </div>

      {canManage && (
        <UnsavedChangesDock
          dirty={dirty || saved === null}
          submitting={saving}
          invalid={false}
          submitLabel={saved === null ? "Guardar borrador" : "Guardar cambios"}
          detail={saved === null ? undefined : (describeGaps(saved.gaps) ?? "Lista para activar")}
          onSave={() => void persist()}
          onDiscard={
            saved === null
              ? () => router.push("/marketing/social")
              : () => setDraft(JSON.parse(initial) as Draft)
          }
        />
      )}
    </div>
  );
}

/** Las publicaciones recientes de cada cuenta elegida, con su miniatura. */
function MediaPicker({
  channelIds,
  media,
  selected,
  onChange,
}: {
  channelIds: string[];
  media: Record<string, SocialMediaDTO[] | "error">;
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  if (channelIds.length === 0) {
    return <p className="text-muted-foreground px-4 text-sm">Elige primero la cuenta.</p>;
  }
  return (
    <div className="flex flex-col gap-3">
      {channelIds.map((channelId) => {
        const items = media[channelId];
        if (items === undefined) {
          return (
            <p key={channelId} className="text-muted-foreground px-4 text-sm" aria-busy="true">
              Cargando tus publicaciones…
            </p>
          );
        }
        if (items === "error") {
          return (
            <p key={channelId} className="text-muted-foreground px-4 text-sm">
              No pudimos leer las publicaciones de esta cuenta. Revisa que esté conectada con el permiso de comentarios.
            </p>
          );
        }
        if (items.length === 0) {
          return (
            <p key={channelId} className="text-muted-foreground px-4 text-sm">
              Esta cuenta aún no tiene publicaciones.
            </p>
          );
        }
        return (
          <ul key={channelId} className="grid grid-cols-3 gap-2 @[36rem]:grid-cols-4" aria-label="Publicaciones">
            {items.map((item) => {
              const on = selected.includes(item.id);
              return (
                <li key={item.id} className="min-w-0">
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => onChange(on ? selected.filter((id) => id !== item.id) : [...selected, item.id])}
                    className={cn(
                      "bg-muted focus-visible:ring-ring relative block aspect-[4/5] w-full overflow-hidden rounded-2xl border-2 focus-visible:ring-2 focus-visible:outline-none",
                      on ? "border-primary" : "border-transparent",
                    )}
                  >
                    {item.thumbnail_url !== null && (
                      // eslint-disable-next-line @next/next/no-img-element -- miniatura del CDN de Meta, URL firmada y efímera
                      <img src={item.thumbnail_url} alt="" className="size-full object-cover" loading="lazy" />
                    )}
                    <span className="bg-background/85 absolute inset-x-1.5 bottom-1.5 line-clamp-2 rounded-lg px-2 py-1 text-left text-[11px]">
                      {item.caption ?? "Sin texto"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        );
      })}
    </div>
  );
}

/** Bloques de la entrega: texto, enlace con botón y archivos (foto, video o PDF). */
function DeliveryEditor({
  blocks,
  onChange,
}: {
  blocks: DeliveryBlock[];
  onChange: (blocks: DeliveryBlock[]) => void;
}) {
  const { showAlert } = useAlert();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const update = (index: number, block: DeliveryBlock) => onChange(blocks.map((b, i) => (i === index ? block : b)));

  async function upload(file: File) {
    setUploading(true);
    try {
      const asset = await uploadSocialAsset(file);
      onChange([
        ...blocks,
        { type: "media", asset_id: asset.id, media_kind: asset.media_kind, filename: asset.filename },
      ]);
    } catch (err) {
      showAlert({ tone: "error", title: "No se subió el archivo", description: errorMessage(err) });
    } finally {
      setUploading(false);
    }
  }
  const move = (index: number, delta: -1 | 1) => {
    const next = [...blocks];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };
  return (
    <Group
      title="La entrega"
      foot="Llega por el chat en cuanto toca el botón, bloque a bloque y en este orden."
    >
      {blocks.length > 0 && (
        <Rows>
          {blocks.map((block, index) => (
            <Row
              key={index}
              stack
              label={
                <span className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate">
                    {block.type === "text"
                      ? "Texto"
                      : block.type === "link"
                        ? "Enlace con botón"
                        : (block.filename ?? "Archivo")}
                  </span>
                  <span className="flex items-center">
                    <Button variant="ghost" size="icon" aria-label="Subir" disabled={index === 0} onClick={() => move(index, -1)}>
                      <ArrowUp className="size-4" aria-hidden="true" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="Bajar" disabled={index === blocks.length - 1} onClick={() => move(index, 1)}>
                      <ArrowDown className="size-4" aria-hidden="true" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="Quitar el bloque" onClick={() => onChange(blocks.filter((_, i) => i !== index))}>
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  </span>
                </span>
              }
            >
              {block.type === "text" && (
                <Textarea
                  rows={3}
                  maxLength={1000}
                  value={block.text}
                  aria-label="Texto del bloque"
                  onChange={(event) => update(index, { ...block, text: event.target.value })}
                />
              )}
              {block.type === "link" && (
                <div className="flex flex-col gap-2">
                  <Input
                    value={block.text}
                    maxLength={1000}
                    placeholder="La guía completa está aquí"
                    aria-label="Texto del enlace"
                    onChange={(event) => update(index, { ...block, text: event.target.value })}
                  />
                  <Input
                    value={block.url}
                    inputMode="url"
                    placeholder="https://"
                    aria-label="Dirección del enlace"
                    onChange={(event) => update(index, { ...block, url: event.target.value })}
                  />
                  <Input
                    value={block.button_title}
                    maxLength={20}
                    aria-label="Texto del botón"
                    onChange={(event) => update(index, { ...block, button_title: event.target.value })}
                  />
                </div>
              )}
              {block.type === "media" && (
                <Input
                  value={block.caption ?? ""}
                  maxLength={1000}
                  placeholder={`${block.filename ?? "Archivo"} · texto opcional debajo`}
                  aria-label="Texto debajo del archivo"
                  onChange={(event) => update(index, { ...block, caption: event.target.value || undefined })}
                />
              )}
            </Row>
          ))}
        </Rows>
      )}
      {blocks.length < 10 && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="rounded-full" onClick={() => onChange([...blocks, { type: "text", text: "" }])}>
            <Plus className="size-4" aria-hidden="true" />
            Texto
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => onChange([...blocks, { type: "link", text: "", url: "https://", button_title: "Ver" }])}
          >
            <Plus className="size-4" aria-hidden="true" />
            Enlace con botón
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            disabled={uploading}
            onClick={() => fileInput.current?.click()}
          >
            <Paperclip className="size-4" aria-hidden="true" />
            {uploading ? "Subiendo…" : "Foto, video o PDF"}
          </Button>
          <input
            ref={fileInput}
            type="file"
            hidden
            accept="image/*,video/*,application/pdf"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file !== undefined) void upload(file);
            }}
          />
        </div>
      )}
    </Group>
  );
}
