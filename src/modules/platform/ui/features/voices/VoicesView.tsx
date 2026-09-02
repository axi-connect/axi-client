"use client";

/**
 * Curaduría del catálogo de voces (§10.5, /platform/voices — primitivo Table,
 * el catálogo es corto por diseño). El orden de la tabla ES el orden del
 * selector de todos los tenants: las flechas reordenan en local y «Guardar
 * orden» hace el replace-set (sin drag — decisión del dueño). Retirar =
 * is_active=false (la fila persiste; el tenant la ve «ya no disponible»).
 */
import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CircleSlash,
  Mic,
  MoreVertical,
  PencilLine,
  Plus,
  Play,
} from "lucide-react";
import { cn } from "@/core/lib/utils";
import { useAlert } from "@/core/providers/alert-provider";
import { errorMessage } from "@/core/lib/error-messages";
import { Button } from "@/shared/components/ui/button";
import { Modal } from "@/shared/components/ui/modal";
import { TableSkeleton } from "@/shared/components/features/loading";
import { SamplePlayButton, useAudioSample } from "@/shared/components/features/audio-sample";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  moveVoice,
  voiceGenderLabel,
  voicePreviewStale,
  type PlatformVoice,
} from "../../../domain/voices";
import {
  useGeneratePreview,
  useReorderVoices,
  useSetVoiceActive,
  useVoicesQuery,
} from "../../../infrastructure/api/hooks/use-voices";
import { EmptyState } from "../../components/EmptyState";
import { ProblemAlert } from "../../components/ProblemAlert";
import { StatusBadge } from "../../components/StatusBadge";
import { VoiceFormSheet } from "./VoiceFormSheet";

function VoiceActions({
  voice,
  generating,
  onEdit,
  onGeneratePreview,
  onToggleActive,
}: {
  voice: PlatformVoice;
  generating: boolean;
  onEdit: (voice: PlatformVoice) => void;
  onGeneratePreview: (voice: PlatformVoice) => void;
  onToggleActive: (voice: PlatformVoice) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Acciones de ${voice.name}`}
          className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          <MoreVertical aria-hidden="true" className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem className="flex items-center gap-2" onClick={() => onEdit(voice)}>
          <PencilLine aria-hidden="true" className="size-4" />
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem
          className={cn("flex items-center gap-2", generating && "pointer-events-none opacity-50")}
          onClick={() => {
            if (!generating) onGeneratePreview(voice);
          }}
        >
          <Mic aria-hidden="true" className="size-4" />
          {generating
            ? "Generando…"
            : voice.preview_url === null && voice.preview_generated_at === null
              ? "Generar muestra"
              : "Regenerar muestra"}
        </DropdownMenuItem>
        <DropdownMenuItem
          className={cn("flex items-center gap-2", voice.is_active && "text-destructive")}
          onClick={() => onToggleActive(voice)}
        >
          {voice.is_active ? (
            <CircleSlash aria-hidden="true" className="size-4" />
          ) : (
            <Play aria-hidden="true" className="size-4" />
          )}
          {voice.is_active ? "Retirar del selector" : "Reactivar"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function VoicesView() {
  const { showAlert } = useAlert();
  const { data, isPending, isError, error, refetch } = useVoicesQuery();
  const setActive = useSetVoiceActive();
  const reorder = useReorderVoices();
  const generatePreview = useGeneratePreview();
  const sample = useAudioSample();

  // Drawer: undefined = cerrado · null = crear · voz = editar.
  const [sheetVoice, setSheetVoice] = useState<PlatformVoice | null | undefined>(undefined);
  const [retiring, setRetiring] = useState<PlatformVoice | null>(null);
  /** Orden local mientras se edita con las flechas; null = el del servidor. */
  const [draftOrder, setDraftOrder] = useState<string[] | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const voices = useMemo(() => {
    const list = data?.data ?? [];
    if (draftOrder === null) return list;
    const byId = new Map(list.map((voice) => [voice.id, voice]));
    // Voces creadas/borradas tras armar el draft quedan al final, sin perderse
    const ordered = draftOrder.map((id) => byId.get(id)).filter((voice) => voice !== undefined);
    const missing = list.filter((voice) => !draftOrder.includes(voice.id));
    return [...ordered, ...missing];
  }, [data, draftOrder]);

  const orderDirty =
    draftOrder !== null &&
    data !== undefined &&
    voices.map((voice) => voice.id).join("|") !== data.data.map((voice) => voice.id).join("|");

  function move(index: number, direction: "up" | "down") {
    const ids = voices.map((voice) => voice.id);
    setDraftOrder(moveVoice(ids, index, direction));
  }

  async function saveOrder() {
    try {
      await reorder.mutateAsync(voices.map((voice) => voice.id));
      setDraftOrder(null);
      showAlert({
        tone: "success",
        title: "Orden del selector guardado",
        description: "Todos los tenants ven el catálogo en este orden.",
        autoCloseMs: 5000,
      });
    } catch (mutationError) {
      showAlert({
        tone: "error",
        title: "No se pudo guardar el orden",
        description: errorMessage(mutationError),
      });
    }
  }

  async function generateFor(voice: PlatformVoice) {
    setGeneratingId(voice.id);
    try {
      // Sin text: el backend usa la frase guardada de la voz (o la de marca)
      await generatePreview.mutateAsync({ id: voice.id });
      showAlert({
        tone: "success",
        title: `Muestra de ${voice.name} lista`,
        description: "Generada con la cuenta de axi.",
        autoCloseMs: 5000,
      });
    } catch (mutationError) {
      showAlert({
        tone: "error",
        title: "No se pudo generar la muestra",
        description: errorMessage(mutationError),
      });
    } finally {
      setGeneratingId(null);
    }
  }

  async function confirmRetire() {
    if (retiring === null) return;
    const target = retiring;
    try {
      await setActive.mutateAsync({ id: target.id, is_active: false });
      setRetiring(null);
      showAlert({
        tone: "success",
        title: `«${target.name}» retirada del selector`,
        autoCloseMs: 5000,
      });
    } catch (mutationError) {
      showAlert({
        tone: "error",
        title: "No se pudo retirar la voz",
        description: errorMessage(mutationError),
      });
    }
  }

  async function reactivate(voice: PlatformVoice) {
    try {
      await setActive.mutateAsync({ id: voice.id, is_active: true });
      showAlert({
        tone: "success",
        title: `«${voice.name}» vuelve al selector de todos los tenants`,
        autoCloseMs: 5000,
      });
    } catch (mutationError) {
      showAlert({
        tone: "error",
        title: "No se pudo reactivar la voz",
        description: errorMessage(mutationError),
      });
    }
  }

  if (isPending) return <TableSkeleton rows={6} />;
  if (isError) return <ProblemAlert error={error} onRetry={() => void refetch()} className="mx-auto max-w-xl" />;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Voces IA</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            El catálogo curado que ven todos los tenants en el selector de voz de sus characters.
            El orden de esta tabla es el orden del selector.
          </p>
        </div>
        <Button onClick={() => setSheetVoice(null)}>
          <Plus aria-hidden="true" className="size-4" />
          Añadir voz
        </Button>
      </header>

      {orderDirty && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-3 rounded-2xl border border-accent-violet/30 bg-accent-violet/5 px-4 py-3 text-sm"
        >
          <ArrowUpDown aria-hidden="true" className="size-4 text-accent-violet" />
          <span className="flex-1">
            Cambiaste el orden del selector. Se aplica a todos los tenants al guardar.
          </span>
          <Button variant="outline" size="sm" onClick={() => setDraftOrder(null)} disabled={reorder.isPending}>
            Descartar
          </Button>
          <Button size="sm" onClick={() => void saveOrder()} disabled={reorder.isPending}>
            {reorder.isPending ? "Guardando…" : "Guardar orden"}
          </Button>
        </div>
      )}

      {voices.length === 0 ? (
        <EmptyState
          glyph="ai"
          title="Aún no hay voces en el catálogo"
          description="Añade la primera con su voice_id de ElevenLabs; los tenants la verán en el selector al instante."
          action={<Button variant="outline" onClick={() => setSheetVoice(null)}>Añadir la primera voz</Button>}
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-background">
          <Table className="[&_th]:h-11 [&_th]:px-4 [&_td]:px-4 [&_td]:py-3">
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Orden</TableHead>
                <TableHead className="w-20">Muestra</TableHead>
                <TableHead>Voz</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead className="text-right">Characters</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {voices.map((voice, index) => {
                const stale = voicePreviewStale(voice);
                return (
                  <TableRow key={voice.id} className={cn(!voice.is_active && "opacity-60")}>
                    <TableCell>
                      <span className="flex items-center gap-2">
                        <span className="w-5 text-xs tabular-nums text-muted-foreground">
                          {index + 1}
                        </span>
                        <span className="flex flex-col">
                          <button
                            type="button"
                            aria-label={`Subir ${voice.name}`}
                            disabled={index === 0}
                            onClick={() => move(index, "up")}
                            className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                          >
                            <ArrowUp aria-hidden="true" className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Bajar ${voice.name}`}
                            disabled={index === voices.length - 1}
                            onClick={() => move(index, "down")}
                            className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                          >
                            <ArrowDown aria-hidden="true" className="size-3.5" />
                          </button>
                        </span>
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="relative inline-flex">
                        <SamplePlayButton
                          name={voice.name}
                          url={voice.preview_url}
                          playing={sample.playingId === voice.id}
                          loading={sample.loading && sample.playingId === voice.id}
                          onToggle={() => sample.toggle(voice.id, voice.preview_url)}
                          pendingHint="Muestra pendiente — genérala desde ⋮"
                        />
                        {stale && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span
                                aria-label="Muestra desactualizada"
                                className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-background bg-warning"
                              />
                            </TooltipTrigger>
                            <TooltipContent>
                              La voz se editó después de generar la muestra — regenérala.
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </span>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium">{voice.name}</p>
                      {voice.description !== null && (
                        <p className="max-w-64 truncate text-xs text-muted-foreground">
                          {voice.description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {[voiceGenderLabel(voice.gender), voice.accent].filter(Boolean).join(" · ") || "—"}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-muted-foreground">
                        {voice.default_model_id}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {voice.characters_count === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        voice.characters_count
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={voice.is_active ? "active" : "inactive"} />
                    </TableCell>
                    <TableCell>
                      <VoiceActions
                        voice={voice}
                        generating={generatingId === voice.id}
                        onEdit={(target) => setSheetVoice(target)}
                        onGeneratePreview={(target) => void generateFor(target)}
                        onToggleActive={(target) =>
                          target.is_active ? setRetiring(target) : void reactivate(target)
                        }
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Retirar una voz la oculta del selector sin romper los characters que ya la usan (la ven como
        «ya no disponible»). El punto ámbar en la muestra indica que la voz se editó después de
        generarla.
      </p>

      <VoiceFormSheet
        open={sheetVoice !== undefined}
        onOpenChange={(open) => {
          if (!open) setSheetVoice(undefined);
        }}
        voice={sheetVoice ?? null}
        key={sheetVoice === undefined ? "closed" : (sheetVoice?.id ?? "create")}
      />

      <Modal
        open={retiring !== null}
        onOpenChange={(open) => {
          if (!open) setRetiring(null);
        }}
        config={{
          title: `Retirar «${retiring?.name ?? ""}»`,
          description:
            retiring !== null && retiring.characters_count > 0
              ? `${String(retiring.characters_count)} character${retiring.characters_count === 1 ? "" : "s"} la usa${retiring.characters_count === 1 ? "" : "n"} hoy: seguirán funcionando y sus dueños la verán como «ya no disponible» hasta elegir otra. Puedes reactivarla cuando quieras.`
              : "Ningún character la usa — retiro sin impacto. Puedes reactivarla cuando quieras.",
          actions: [
            { label: "Cancelar", variant: "outline", asClose: true },
            {
              label: setActive.isPending ? "Retirando…" : "Retirar voz",
              variant: "destructive",
              onClick: () => void confirmRetire(),
            },
          ],
        }}
      />
    </div>
  );
}
