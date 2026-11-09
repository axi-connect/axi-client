"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Plus } from "lucide-react";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { useAuth } from "@/shared/auth/auth.hooks";
import { BentoLink, BentoTile } from "@/shared/components/features/bento";
import { EmptyState } from "@/shared/components/features/empty-state";
import { TableSkeleton } from "@/shared/components/features/loading";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Switch } from "@/shared/components/ui/switch";
import { MarketingHeader } from "@/modules/marketing/public";
import { LoadError } from "@/modules/marketing/ui/components/premium";
import {
  describeGaps,
  sumFunnels,
  type SocialAutomationDTO,
  type SocialChannelDTO,
} from "@/modules/social/domain/social";
import {
  activateSocialAutomation,
  deleteSocialAutomation,
  listSocialAutomations,
  listSocialChannels,
  pauseSocialAutomation,
} from "@/modules/social/infrastructure/services/social-service.adapter";
import { ActivitySheet } from "./components/ActivitySheet";
import { FunnelStrip } from "./components/FunnelStrip";
import { AutomationStatus, NetworkIcon } from "./components/SocialPieces";

/**
 * Marketing › Redes. La primera automatización es «Comenta y recibe»: alguien
 * comenta la palabra en una publicación, recibe un mensaje privado con
 * «Envíamelo» y, al tocarlo, lo prometido. El agente sigue la conversación.
 */
export function SocialView() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("marketing:manage");
  const { showAlert, showModal, closeModal } = useAlert();
  const router = useRouter();

  const [automations, setAutomations] = useState<SocialAutomationDTO[] | null>(null);
  const [channels, setChannels] = useState<SocialChannelDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<SocialAutomationDTO | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rows, accounts] = await Promise.all([
        listSocialAutomations(),
        listSocialChannels().catch(() => [] as SocialChannelDTO[]),
      ]);
      setAutomations(rows);
      setChannels(accounts);
      setError(null);
    } catch (err) {
      setError(errorMessage(err, "No pudimos cargar tus automatizaciones"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = useMemo(() => sumFunnels(automations ?? []), [automations]);
  const channelById = useMemo(() => new Map(channels.map((c) => [c.id, c])), [channels]);
  /** Las cuentas que no pueden responder comentarios: lo primero que hay que arreglar. */
  const unhealthy = channels.filter((channel) => channel.comments_subscribed === false);

  function replace(saved: SocialAutomationDTO) {
    setAutomations((prev) => (prev ?? []).map((row) => (row.id === saved.id ? saved : row)));
  }

  async function toggle(automation: SocialAutomationDTO) {
    try {
      const saved =
        automation.status === "active"
          ? await pauseSocialAutomation(automation.id)
          : await activateSocialAutomation(automation.id);
      replace(saved);
      showAlert({
        tone: "success",
        title: saved.status === "active" ? "Automatización activa" : "Automatización pausada",
        description:
          saved.status === "active"
            ? "Desde ahora responde a cada comentario con la palabra."
            : "Los comentarios nuevos ya no reciben nada hasta que la actives.",
      });
    } catch (err) {
      showAlert({ tone: "error", title: "No se pudo cambiar", description: errorMessage(err) });
    }
  }

  function confirmDelete(automation: SocialAutomationDTO) {
    showModal({
      title: `¿Eliminar «${automation.name}»?`,
      description:
        "Deja de responder comentarios. Lo que ya pasó se conserva en las conversaciones de cada persona.",
      actions: [
        { label: "Cancelar", variant: "outline", asClose: true },
        {
          label: "Eliminar",
          variant: "destructive",
          onClick: async () => {
            try {
              await deleteSocialAutomation(automation.id);
              setAutomations((prev) => (prev ?? []).filter((row) => row.id !== automation.id));
              closeModal();
            } catch (err) {
              showAlert({ tone: "error", title: "No se pudo eliminar", description: errorMessage(err) });
            }
          },
        },
      ],
    });
  }

  const isEmpty = automations !== null && automations.length === 0;

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <MarketingHeader
        title="Comenta y recibe"
        description="Alguien comenta la palabra en tu publicación, le escribes por privado al instante y recibe lo que prometiste. Tu agente sigue la conversación."
        actions={
          canManage &&
          !isEmpty && (
            <Button asChild className="rounded-full">
              <Link href="/marketing/social/new">
                <Plus className="size-4" aria-hidden="true" />
                Nueva automatización
              </Link>
            </Button>
          )
        }
      />

      {unhealthy.map((channel) => (
        <p key={channel.id} role="status" className="flex gap-2.5 text-sm text-pretty">
          <span aria-hidden="true" className="bg-warning mt-[0.45em] size-2 shrink-0 rounded-full" />
          <span>
            <b className="font-semibold">{channel.name} todavía no puede responder comentarios.</b>{" "}
            <span className="text-muted-foreground">
              Reconecta la cuenta para darle el permiso que falta.{" "}
              <Link href="/settings/channels" className="text-foreground font-medium underline underline-offset-4">
                Ir a canales
              </Link>
            </span>
          </span>
        </p>
      ))}

      {loading && automations === null ? (
        <TableSkeleton rows={3} />
      ) : error !== null ? (
        <LoadError message={error} onRetry={() => void load()} />
      ) : isEmpty ? (
        <EmptyState
          glyph="conversation"
          title="Convierte comentarios en ventas"
          description={
            channels.length === 0
              ? "Conecta tu Instagram o tu página de Facebook y crea la primera: «Comenta INFO y te lo envío»."
              : "Elige una publicación y la palabra. A quien la comente le llega por privado lo que prometiste, y tu agente sigue la conversación."
          }
          action={
            canManage &&
            (channels.length === 0 ? (
              <Button asChild className="rounded-full">
                <Link href="/settings/channels">Conectar Instagram o Facebook</Link>
              </Button>
            ) : (
              <Button asChild className="rounded-full">
                <Link href="/marketing/social/new">Crear la primera</Link>
              </Button>
            ))
          }
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_21rem] xl:items-start [&>*]:min-w-0">
          <ul className="flex min-w-0 flex-col gap-3" aria-label="Automatizaciones">
            {(automations ?? []).map((automation) => {
              const networks = automation.channel_ids
                .map((id) => channelById.get(id)?.kind)
                .filter((kind) => kind !== undefined);
              const gaps = describeGaps(automation.gaps);
              return (
                <li
                  key={automation.id}
                  className="border-border bg-card @container flex min-w-0 flex-col gap-4 rounded-3xl border p-5"
                >
                  <div className="flex min-w-0 flex-wrap items-start gap-3">
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <h2 className="font-heading truncate text-lg leading-tight font-bold tracking-tight" title={automation.name}>
                          {automation.name}
                        </h2>
                        <AutomationStatus status={automation.status} />
                      </div>
                      <p className="text-muted-foreground flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                        {[...new Set(networks)].map((kind) => (
                          <NetworkIcon key={kind} network={kind === "instagram_dm" ? "instagram" : "facebook"} className="size-4" />
                        ))}
                        <span>
                          {automation.keywords.length === 0
                            ? "Sin palabra todavía"
                            : `Comentan ${automation.keywords.map((keyword) => `«${keyword}»`).join(", ")}`}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {automation.scope === "all"
                            ? "Todas las publicaciones"
                            : `${String(automation.media_ids.length)} ${automation.media_ids.length === 1 ? "publicación" : "publicaciones"}`}
                        </span>
                      </p>
                      {gaps !== null && automation.status !== "active" && (
                        <p className="text-muted-foreground text-sm text-pretty">{gaps}</p>
                      )}
                    </div>
                    {canManage && (
                      <div className="flex shrink-0 items-center gap-1">
                        <Switch
                          checked={automation.status === "active"}
                          disabled={automation.status !== "active" && automation.gaps.length > 0}
                          onCheckedChange={() => void toggle(automation)}
                          aria-label={automation.status === "active" ? "Pausar" : "Activar"}
                        />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label={`Más acciones de ${automation.name}`}>
                              <MoreHorizontal className="size-4" aria-hidden="true" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/marketing/social/${automation.id}`)}>
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDetail(automation)}>Ver actividad</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => confirmDelete(automation)}>
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    className="focus-visible:ring-ring min-w-0 rounded-2xl text-left focus-visible:ring-2 focus-visible:outline-none"
                    onClick={() => setDetail(automation)}
                    aria-label={`Ver la actividad de ${automation.name}`}
                  >
                    <FunnelStrip funnel={automation.funnel} />
                  </button>
                </li>
              );
            })}
          </ul>

          <aside className="grid gap-4 md:grid-cols-2 xl:grid-cols-1" aria-label="Resumen de Redes">
            <BentoTile label="De comentario a conversación">
              <dl className="divide-border divide-y text-sm">
                {(
                  [
                    ["Comentarios", totals.comments],
                    ["Les escribimos", totals.contacted],
                    ["Tocaron «Envíamelo»", totals.opened],
                    ["Recibieron la entrega", totals.delivered],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label} className="flex items-baseline justify-between gap-3 py-2.5 first:pt-0">
                    <dt>{label}</dt>
                    <dd className="font-semibold tabular-nums">{value.toLocaleString("es-CO")}</dd>
                  </div>
                ))}
              </dl>
              <p className="text-muted-foreground text-xs text-pretty">
                Cada persona recibe la entrega una sola vez por automatización. Quien pidió no recibir mensajes no recibe nada.
              </p>
            </BentoTile>
            <BentoTile label="Cuidamos tu cuenta" aside={<BentoLink href="/settings/channels">Canales</BentoLink>}>
              <ul className="divide-border divide-y text-sm">
                {[
                  <>Un solo mensaje privado <b className="font-semibold">por comentario</b>, como exige Meta</>,
                  <>Las respuestas públicas <b className="font-semibold">rotan</b> y tienen tope por hora</>,
                  <>Si es viral, <b className="font-semibold">esperan su turno</b> sin saturar tu cuenta</>,
                  <>Seguirte es una <b className="font-semibold">invitación</b>, nunca una condición</>,
                ].map((line, index) => (
                  <li key={index} className="flex gap-2.5 py-2.5 text-pretty first:pt-0 last:pb-0">
                    <span aria-hidden="true" className="bg-foreground mt-[0.5em] size-1.5 shrink-0 rounded-full" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </BentoTile>
          </aside>
        </div>
      )}

      <ActivitySheet automation={detail} onOpenChange={(open) => !open && setDetail(null)} />
    </div>
  );
}
