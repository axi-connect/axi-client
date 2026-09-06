"use client";

/**
 * Parámetros declarados (`/platform/billing/parameters`): TRM de cálculo e IPC
 * anual. Cifras que no salen de una factura de proveedor y por eso llevan
 * fecha, fuente y firma. **Una versión se sucede, no se edita**: publicar
 * cierra la vigente y abre otra, igual que una tarifa.
 */
import { useState } from "react";
import { Plus } from "lucide-react";
import { errorMessage } from "@/core/lib/error-messages";
import { formatShortDate } from "@/core/lib/format";
import { useAlert } from "@/core/providers/alert-provider";
import { DetailSheet } from "@/shared/components/features/detail-sheet";
import { TableSkeleton } from "@/shared/components/features/loading";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  PARAMETER_CODES,
  PARAMETER_GROUPS,
  PARAMETER_LABELS,
  formatParameterValue,
  type BillingParameter,
  type ParameterCode,
} from "../../../domain/billing";
import { MarginParametersSections } from "./MarginParametersSections";
import {
  useBillingParametersQuery,
  usePublishParameter,
} from "../../../infrastructure/api/hooks/use-catalog";
import { ProblemAlert } from "../../components/ProblemAlert";

const CODES = PARAMETER_CODES;
const formatValue = formatParameterValue;

export function ParametersView() {
  const parameters = useBillingParametersQuery();
  const [publishing, setPublishing] = useState<ParameterCode | null>(null);

  if (parameters.isPending) return <TableSkeleton rows={4} />;
  if (parameters.isError) {
    return (
      <ProblemAlert
        error={parameters.error}
        onRetry={() => void parameters.refetch()}
        className="mx-auto max-w-xl"
      />
    );
  }
  const rows = parameters.data.data;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-brand text-[10.5px] font-semibold tracking-[0.12em] uppercase">Supuestos declarados</p>
          <h1 className="text-3xl font-semibold tracking-tight">Parámetros</h1>
          <p className="text-muted-foreground max-w-[70ch] text-sm">
            Cifras que no salen de una factura de proveedor y por eso llevan fecha, fuente y firma. Se
            versionan como las tarifas: nunca se edita la vigente.
          </p>
        </div>
        <Button onClick={() => setPublishing("trm_cop_usd")}>
          <Plus aria-hidden="true" />
          Nueva versión
        </Button>
      </header>

      {PARAMETER_GROUPS.map((group) => (
        <div key={group.title} className="space-y-3">
          <div>
            <h2 className="text-[13px] font-semibold tracking-[0.04em] uppercase">{group.title}</h2>
            <p className="text-muted-foreground text-xs">{group.help}</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
        {group.codes.map((code) => {
          const own = rows.filter((row) => row.code === code);
          const meta = PARAMETER_LABELS[code];
          const current = own.find((row) => row.is_current) ?? null;
          return (
            <section key={code} className="border-border-soft bg-card rounded-2xl border p-4 shadow-[var(--shadow-float)]">
              <header className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-[15px] font-semibold">
                    {meta.name}{" "}
                    <span className="text-muted-foreground font-mono text-[11px] font-normal">{code}</span>
                  </h2>
                  <p className="text-muted-foreground mt-0.5 max-w-[56ch] text-xs leading-relaxed">{meta.help}</p>
                </div>
                {current === null ? (
                  <Badge variant="outline" className="text-muted-foreground shrink-0">
                    Sin vigente
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-success/40 bg-success/10 text-success shrink-0 tabular-nums">
                    {formatValue(code, current.value)} vigente
                  </Badge>
                )}
              </header>

              {own.length === 0 ? (
                <p className="text-muted-foreground border-border mt-4 rounded-xl border border-dashed p-3 text-xs">
                  Ningún valor declarado todavía.
                </p>
              ) : (
                <ol className="mt-4 flex flex-col">
                  {own.map((row, index) => (
                    <VersionItem key={row.id} row={row} last={index === own.length - 1} />
                  ))}
                </ol>
              )}

              <div className="mt-4 flex justify-end">
                <Button variant="outline" size="sm" onClick={() => setPublishing(code)}>
                  Nueva versión de {meta.name}
                </Button>
              </div>
            </section>
          );
        })}
          </div>
        </div>
      ))}

      <div className="space-y-3">
        <div>
          <h2 className="text-[13px] font-semibold tracking-[0.04em] uppercase">Consola de margen</h2>
          <p className="text-muted-foreground text-xs">Comisión de pasarela, costos fijos por capacidad y CAC declarado (Tanda C).</p>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <MarginParametersSections />
        </div>
      </div>

      <ParameterSheet
        open={publishing !== null}
        onOpenChange={(open) => !open && setPublishing(null)}
        initialCode={publishing ?? "trm_cop_usd"}
        key={publishing ?? "closed"}
      />
    </div>
  );
}

function VersionItem({ row, last }: { row: BillingParameter; last: boolean }) {
  return (
    <li className="relative grid grid-cols-[12px_1fr] gap-x-4">
      {!last ? <span aria-hidden="true" className="bg-border absolute top-4 bottom-0 left-[5px] w-[1.5px]" /> : null}
      <span
        aria-hidden="true"
        className={
          row.is_current
            ? "bg-primary ring-primary/20 mt-[5px] size-[11px] rounded-full ring-4"
            : "bg-border mt-[5px] size-[11px] rounded-full"
        }
      />
      <div className={last ? "flex flex-col gap-1" : "flex flex-col gap-1 pb-5"}>
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-lg font-semibold tracking-tight tabular-nums">{formatValue(row.code, row.value)}</span>
          <Badge
            variant="outline"
            className={row.is_current ? "border-success/40 bg-success/10 text-success" : "text-muted-foreground"}
          >
            {row.is_current ? "Vigente" : row.effective_to === null ? "Programada" : "Cerrada"}
          </Badge>
          <span className="text-muted-foreground text-xs tabular-nums">
            desde {formatShortDate(row.effective_from)}
            {row.effective_to === null ? "" : ` hasta ${formatShortDate(row.effective_to)}`}
          </span>
        </div>
        {row.source ? <span className="text-muted-foreground text-xs">Fuente: {row.source}</span> : null}
        {row.note ? <span className="text-muted-foreground text-xs">{row.note}</span> : null}
      </div>
    </li>
  );
}

function ParameterSheet({
  open,
  onOpenChange,
  initialCode,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCode: ParameterCode;
}) {
  const { showAlert } = useAlert();
  const publish = usePublishParameter();
  const [code, setCode] = useState<ParameterCode>(initialCode);
  const [value, setValue] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10));
  const [source, setSource] = useState("");
  const [note, setNote] = useState("");

  const numeric = Number(value.replace(/\./g, "").replace(",", "."));
  // La regla por código vive en el servidor: aquí solo lo evidente (TRM > 0; el
  // IPC admite cero y deflación; los bps y el mix admiten cero).
  const ready =
    Number.isFinite(numeric) &&
    (code === "trm_cop_usd" ? numeric > 0 : code.startsWith("ipc") || numeric >= 0) &&
    source.trim().length >= 3 &&
    effectiveFrom !== "";

  async function submit() {
    try {
      await publish.mutateAsync({
        code,
        value: numeric,
        effective_from: new Date(`${effectiveFrom}T00:00:00Z`).toISOString(),
        source: source.trim(),
        note: note.trim() === "" ? null : note.trim(),
      });
      showAlert({
        tone: "success",
        title: "Versión publicada",
        description: `${PARAMETER_LABELS[code].name} pasa a ${formatValue(code, numeric)} desde el ${effectiveFrom}. La anterior queda cerrada.`,
        autoCloseMs: 7000,
      });
      onOpenChange(false);
    } catch (error) {
      showAlert({ tone: "error", title: "No se pudo publicar", description: errorMessage(error), autoCloseMs: 9000 });
    }
  }

  return (
    <DetailSheet
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      title="Nueva versión de parámetro"
      subtitle="Cierra la vigente y abre otra. La anterior sigue explicando las verjas que ya se corrieron."
    >
      <div className="flex flex-col gap-4 p-5">
        <div>
          <Label htmlFor="param-code">Parámetro</Label>
          <Select value={code} onValueChange={(next) => setCode(next as ParameterCode)}>
            <SelectTrigger id="param-code" className="mt-1.5 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CODES.map((option) => (
                <SelectItem key={option} value={option}>
                  {PARAMETER_LABELS[option].name} · {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="param-value">Valor ({PARAMETER_LABELS[code].unit}) *</Label>
            <Input
              id="param-value"
              className="mt-1.5 tabular-nums"
              inputMode="decimal"
              placeholder={code === "trm_cop_usd" ? "4.150,00" : code.endsWith("_bps") ? "7000" : "5,20"}
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="param-from">Vigente desde *</Label>
            <Input
              id="param-from"
              type="date"
              className="mt-1.5 tabular-nums"
              value={effectiveFrom}
              onChange={(event) => setEffectiveFrom(event.target.value)}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="param-source">Fuente *</Label>
          <Input
            id="param-source"
            className="mt-1.5"
            placeholder="BanRep 3.140,55 + colchón de divisa +32 %"
            value={source}
            onChange={(event) => setSource(event.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="param-note">Nota</Label>
          <Input id="param-note" className="mt-1.5" placeholder="Por qué cambia" value={note} onChange={(event) => setNote(event.target.value)} />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={!ready || publish.isPending} onClick={() => void submit()}>
            Publicar versión
          </Button>
        </div>
      </div>
    </DetailSheet>
  );
}
