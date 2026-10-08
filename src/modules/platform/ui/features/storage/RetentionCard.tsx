"use client";

/**
 * Retención automática del tenant (D6): la configura platform, nace apagada y
 * la aplica el barrido de las 03:30 con el mismo motor de la depuración.
 * Cada cambio guarda el set completo.
 */
import { useState } from "react";
import { Clock, Plus, Trash2, WandSparkles } from "lucide-react";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { BentoTile, StatePill } from "@/shared/components/features/bento";
import { Button } from "@/shared/components/ui/button";
import { Switch } from "@/shared/components/ui/switch";
import {
  formatBytes,
  retentionAgeLabel,
  retentionRuleLabel,
  type RetentionRule,
} from "../../../domain/storage";
import { useReplaceRetention, useRetentionPolicies } from "../../../infrastructure/api/hooks/use-storage";
import { Provenance, TileFailure, TileLoading } from "./parts";

type Rule = RetentionRule & { enabled: boolean };

const NEW_RULES: { label: string; rule: RetentionRule }[] = [
  { label: "Videos de clientes · 6 meses", rule: { kind: "conversation_media", filter: { origin: "customer", mime_classes: ["video"] }, max_age_days: 180 } },
  { label: "Audios de clientes · 6 meses", rule: { kind: "conversation_media", filter: { origin: "customer", mime_classes: ["audio"] }, max_age_days: 180 } },
  { label: "Toda la media · 1 año", rule: { kind: "conversation_media", filter: {}, max_age_days: 365 } },
  { label: "Grabaciones · 90 días", rule: { kind: "call_recordings", filter: {}, max_age_days: 90 } },
  { label: "Importaciones · 30 días", rule: { kind: "imports", filter: {}, max_age_days: 30 } },
];

export function RetentionCard({ tenantId, recoverableBytes }: { tenantId: string; recoverableBytes: number | null }) {
  const { showAlert } = useAlert();
  const query = useRetentionPolicies(tenantId);
  const replace = useReplaceRetention(tenantId);
  const [adding, setAdding] = useState(false);

  if (query.isPending) return <TileLoading />;
  if (query.isError) return <TileFailure label="Retención automática" onRetry={() => void query.refetch()} />;

  const rules: Rule[] = query.data.data.map(({ kind, filter, max_age_days, enabled }) => ({ kind, filter, max_age_days, enabled }));
  const active = rules.some((rule) => rule.enabled);

  async function save(next: Rule[], message: string) {
    try {
      await replace.mutateAsync(next);
      showAlert({ tone: "success", title: message, autoCloseMs: 4000 });
    } catch (error) {
      showAlert({ tone: "error", title: "No se pudo guardar la retención", description: errorMessage(error) });
    }
  }

  return (
    <BentoTile
      label="Retención automática"
      aside={<StatePill tone={active ? "success" : "neutral"}>{active ? "Activa" : "Apagada"}</StatePill>}
    >
      {rules.length === 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-[60ch] text-sm text-pretty text-muted-foreground">
            Nada se borra solo.{" "}
            {recoverableBytes !== null && recoverableBytes > 0 ? (
              <>
                Con la plantilla recomendada liberaría hasta <span className="font-medium text-foreground">{formatBytes(recoverableBytes)}</span> esta noche.
              </>
            ) : (
              "La plantilla recomendada borra cada noche la media vieja de los chats, las grabaciones y las importaciones."
            )}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            disabled={replace.isPending}
            onClick={() => void save(query.data.recommended.map((rule) => ({ ...rule, enabled: true })), "Retención recomendada activada")}
          >
            <WandSparkles className="size-4" aria-hidden="true" />
            Usar la recomendada
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col" aria-label="Reglas de retención">
          {rules.map((rule, index) => (
            <li key={`${rule.kind}-${String(index)}`} className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-3 border-t border-border/60 py-3 first:border-t-0 first:pt-0">
              <span className="min-w-0">
                <span className="block text-sm font-medium">{retentionRuleLabel(rule)}</span>
                <span className="block text-xs text-muted-foreground">
                  {rule.kind === "conversation_media" ? "Media de chats" : rule.kind === "call_recordings" ? "Sistema" : "Catálogo y contactos"}
                </span>
              </span>
              <span className="text-sm whitespace-nowrap text-muted-foreground tabular-nums">{retentionAgeLabel(rule.max_age_days)}</span>
              <Switch
                checked={rule.enabled}
                aria-label={`${rule.enabled ? "Apagar" : "Encender"} ${retentionRuleLabel(rule)}`}
                disabled={replace.isPending}
                onCheckedChange={(checked) =>
                  void save(
                    rules.map((item, at) => (at === index ? { ...item, enabled: checked } : item)),
                    checked ? "Regla encendida" : "Regla apagada",
                  )
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 rounded-full text-muted-foreground"
                aria-label={`Quitar ${retentionRuleLabel(rule)}`}
                disabled={replace.isPending}
                onClick={() => void save(rules.filter((_, at) => at !== index), "Regla quitada")}
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Provenance icon={Clock}>Se aplica cada noche a las 03:30 · las facturas emitidas y los comprobantes de pago nunca se borran</Provenance>
        <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => setAdding((current) => !current)} aria-expanded={adding}>
          <Plus className="size-4" aria-hidden="true" />
          Agregar regla
        </Button>
      </div>
      {adding ? (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Regla nueva">
          {NEW_RULES.map((option) => (
            <button
              key={option.label}
              type="button"
              className="h-8 rounded-full border border-border px-3 text-[13px] font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
              onClick={() => {
                setAdding(false);
                void save([...rules, { ...option.rule, enabled: true }], "Regla agregada y encendida");
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </BentoTile>
  );
}
