"use client";

/**
 * Cambiar la cuota de un tenant (lienzo P2e, D2: ampliar es solo de platform):
 * la del plan o una ampliada, con atajos de GB, margen y motivo. Al guardar,
 * las subidas del equipo se reanudan al instante.
 */
import { useState } from "react";
import { cn } from "@/core/lib/utils";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { DetailSheet } from "@/shared/components/features/detail-sheet";
import { Island } from "@/shared/components/features/island";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { formatBytes, GIB, humanDays, type TenantStorage } from "../../../domain/storage";
import { useSetStorageQuota } from "../../../infrastructure/api/hooks/use-storage";

const STEPS_GB = [5, 10, 25] as const;
const GRACE = [0, 5, 10] as const;

function parseGb(text: string): number | null | undefined {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  const value = Number(trimmed.replace(",", "."));
  return Number.isFinite(value) && value >= 0 && value <= 100 * 1024 ? value : undefined;
}

export function QuotaSheet({
  open,
  onOpenChange,
  storage,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storage: TenantStorage;
}) {
  const { showAlert } = useAlert();
  const mutation = useSetStorageQuota(storage.company_id);
  const currentGb = storage.quota_bytes === null ? null : Math.round((storage.quota_bytes / GIB) * 10) / 10;
  const [mode, setMode] = useState<"plan" | "override">(storage.quota_source === "override" ? "override" : "plan");
  const [text, setText] = useState(currentGb === null ? "" : String(currentGb).replace(".", ","));
  const [grace, setGrace] = useState(storage.grace_pct);
  const [reason, setReason] = useState("");
  const gb = parseGb(text);
  const nextBytes = gb === null || gb === undefined ? null : Math.round(gb * GIB);
  const perMonth = storage.growth.per_month_bytes;
  const left = nextBytes === null ? null : nextBytes - storage.used_bytes;
  const valid = reason.trim().length >= 3 && (mode === "plan" || gb !== undefined);

  async function save() {
    try {
      await mutation.mutateAsync(
        mode === "plan"
          ? { mode: "plan", grace_pct: 0, reason: reason.trim() }
          : {
              mode: "override",
              quota_bytes: nextBytes,
              grace_pct: grace,
              reason: reason.trim(),
            },
      );
      showAlert({
        tone: "success",
        title: "Cuota guardada",
        description: "Las subidas del equipo siguen la nueva cuota desde ya.",
        autoCloseMs: 5000,
      });
      onOpenChange(false);
    } catch (error) {
      showAlert({
        tone: "error",
        title: "No se pudo guardar la cuota",
        description: errorMessage(error),
      });
    }
  }

  return (
    <DetailSheet
      open={open}
      onOpenChange={onOpenChange}
      title={`Cuota de ${storage.name}`}
      subtitle={`Hoy usa ${formatBytes(storage.used_bytes)}${storage.quota_bytes === null ? "" : ` de ${formatBytes(storage.quota_bytes)}`}`}
      size="md"
      renderFooter={() => (
        <Island
          as="footer"
          material="ink"
          glow="none"
          className="m-3 flex flex-wrap items-center justify-between gap-3 rounded-3xl p-3 pl-5"
        >
          <div className="min-w-0 text-sm">
            <p className="font-semibold">
              {mode === "plan"
                ? "Vuelve a la cuota del plan"
                : `${currentGb === null ? "Sin tope" : `${String(currentGb).replace(".", ",")} GB`} → ${nextBytes === null ? "sin tope" : formatBytes(nextBytes)}`}
            </p>
            <p className="text-xs opacity-75">Las subidas del equipo se reanudan al guardar.</p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="glass"
              size="sm"
              className="rounded-full"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              className="rounded-full"
              disabled={!valid || mutation.isPending}
              onClick={() => void save()}
            >
              {mutation.isPending ? "Guardando…" : "Guardar cuota"}
            </Button>
          </div>
        </Island>
      )}
    >
      <div className="flex flex-col gap-5 p-5">
        <div
          role="radiogroup"
          aria-label="Origen de la cuota"
          className="grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1"
        >
          {(
            [
              ["plan", "La del plan", storage.plan_name ?? "Sin plan"],
              ["override", "Ampliada", "Solo para este tenant"],
            ] as const
          ).map(([value, title, hint]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={mode === value}
              onClick={() => setMode(value)}
              className={cn(
                "flex h-14 flex-col justify-center rounded-xl px-3 text-left text-sm",
                mode === value ? "bg-background font-medium shadow-[var(--shadow-float)]" : "text-muted-foreground",
              )}
            >
              {title}
              <span className="text-xs font-normal text-muted-foreground">{hint}</span>
            </button>
          ))}
        </div>

        {mode === "override" ? (
          <>
            <div className="flex flex-col gap-2">
              <Label htmlFor="quota-gb">Espacio</Label>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-36">
                  <Input
                    id="quota-gb"
                    inputMode="decimal"
                    value={text}
                    placeholder="Sin tope"
                    onChange={(event) => setText(event.target.value)}
                    className="pr-10 font-medium tabular-nums"
                    aria-invalid={gb === undefined || undefined}
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                    GB
                  </span>
                </div>
                {STEPS_GB.map((step) => (
                  <button
                    key={step}
                    type="button"
                    onClick={() => setText(String((currentGb ?? 0) + step).replace(".", ","))}
                    className="h-8 rounded-full px-3 text-[13px] font-medium text-muted-foreground tabular-nums hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    +{step} GB
                  </button>
                ))}
              </div>
              <p className={cn("text-xs", gb === undefined ? "text-destructive" : "text-muted-foreground")}>
                {gb === undefined
                  ? "Escribe los GB con números, o déjalo vacío para no poner tope."
                  : left === null
                    ? "Sin tope: nada se pausa por espacio."
                    : left <= 0
                      ? "Con esta cuota sigue lleno."
                      : `Le quedan ${formatBytes(left)}${perMonth !== null && perMonth > 0 ? `: ${humanDays((left / perMonth) * 30)} a su ritmo de ${formatBytes(perMonth)} al mes` : ""}.`}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Margen antes de pausar</span>
              <div className="flex gap-1" role="group" aria-label="Margen">
                {GRACE.map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={grace === value}
                    onClick={() => setGrace(value)}
                    className={cn(
                      "h-8 rounded-full px-3 text-[13px] font-medium",
                      grace === value ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {value === 0 ? "Sin margen" : `+${String(value)} %`}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Un margen deja subir un poco más allá de la cuota mientras se resuelve.
              </p>
            </div>
          </>
        ) : (
          <p className="rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
            Se borra la ampliación y vuelve a regir{" "}
            {storage.plan_name === null ? "la cuota de su plan" : `la cuota del plan ${storage.plan_name}`}.
          </p>
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor="quota-reason">Motivo</Label>
          <Textarea
            id="quota-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Ej.: paquete +10 GB acordado el 8 oct, se factura en noviembre."
            rows={3}
          />
          <p className="text-xs text-muted-foreground">Queda en la auditoría del tenant.</p>
        </div>
      </div>
    </DetailSheet>
  );
}
