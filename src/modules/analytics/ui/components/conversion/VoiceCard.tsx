"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { AudioLines, DollarSign, Mic, Type } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { CardEmpty, DashboardCard, MetricTile } from "@/modules/dashboard/ui/components/MetricTile";
import { CHART_COLORS } from "@/modules/dashboard/ui/components/charts/chart-theme";
import { ChartSkeleton } from "@/modules/analytics/ui/AnalyticsSkeletons";
import { SectionError, sectionRefetching } from "./section-states";
import type { Section } from "@/modules/analytics/infrastructure/stores/analytics.store";
import type { VoiceUsageView } from "@/modules/analytics/domain/analytics";

// Recharts solo en cliente: fuera del bundle inicial y sin SSR.
const AreaTrend = dynamic(
  () => import("@/modules/dashboard/ui/components/charts/AreaTrend").then((m) => m.AreaTrend),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

function formatDay(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
}

/**
 * Card "Voz" (§10.5 F5): adopción y costo del canal de voz. Ámbito = CICLO de
 * facturación (cuota y costo se gobiernan por ciclo), a diferencia del resto
 * del tab — el encabezado lo hace explícito. Violeta = acento IA (§2.4).
 */
export function VoiceCard({
  section,
  onRetry,
}: {
  section: Section<VoiceUsageView>;
  onRetry: () => void;
}) {
  const data = section.data;
  const noUsage = data !== null && data.used === 0 && data.notes_sent === 0;

  return (
    <DashboardCard
      title="Voz"
      action={
        <span className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="border-accent-violet/40 bg-accent-violet/10 text-accent-violet"
          >
            <Mic className="size-3" aria-hidden /> notas de voz
          </Badge>
          <span className="text-xs text-muted-foreground">Ciclo actual</span>
        </span>
      }
    >
      {section.status === "error" && data === null ? (
        <SectionError message={section.error} onRetry={onRetry} />
      ) : data === null ? (
        <ChartSkeleton />
      ) : noUsage ? (
        <CardEmpty
          icon={<Mic aria-hidden className="size-6" />}
          message="Sin consumo de voz este ciclo."
        />
      ) : (
        <div className={sectionRefetching(section)}>
          <p className="mb-4 text-xs text-muted-foreground">
            El agente responde con voz solo cuando el cliente le habla con audio (espejo).
          </p>
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <MetricTile
              label="Notas de voz enviadas"
              value={data.notes_sent.toLocaleString("es-CO")}
              icon={<AudioLines aria-hidden className="size-5" />}
              hint={
                data.notes_sent > 0
                  ? `≈ ${Math.round(data.used / data.notes_sent).toLocaleString("es-CO")} caracteres por nota`
                  : undefined
              }
            />
            <MetricTile
              label="Caracteres del ciclo"
              value={data.used.toLocaleString("es-CO")}
              icon={<Type aria-hidden className="size-5" />}
              hint={
                data.limit !== null
                  ? `${String(Math.round(data.limit.pct_used))}% del límite (${data.limit.value.toLocaleString("es-CO")})`
                  : "sin límite propio"
              }
              alert={data.limit !== null && data.limit.pct_used >= 80}
            />
            <MetricTile
              label="Costo de voz del ciclo"
              value={`US$ ${data.cost_usd.toFixed(2)}`}
              icon={<DollarSign aria-hidden className="size-5" />}
              hint="incluido en el costo total de IA"
            />
          </div>
          {data.series.length > 0 && (
            <AreaTrend
              data={data.series.map((point) => ({
                bucket: point.period_start,
                Caracteres: point.quantity,
              }))}
              xKey="bucket"
              series={[{ key: "Caracteres", label: "Caracteres", color: CHART_COLORS.violet }]}
              formatX={formatDay}
              height={160}
            />
          )}
        </div>
      )}
      {noUsage && (
        <p className="pb-2 text-center text-xs text-muted-foreground">
          Activa las notas de voz en{" "}
          <Link href="/settings/voice" className="font-medium text-brand underline-offset-2 hover:underline">
            Configuración → Voz
          </Link>{" "}
          y elige la voz de tu character.
        </p>
      )}
    </DashboardCard>
  );
}
