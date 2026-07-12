"use client";

import Link from "next/link";
import { ArrowRight, Inbox, MailQuestion, UserCheck } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { DashboardCard } from "@/modules/dashboard/ui/components/MetricTile";
import type { Section } from "@/modules/dashboard/infrastructure/stores/dashboard.store";
import type { InboxCountsDTO } from "@/modules/dashboard/domain/dashboard";

function Row({
  icon,
  label,
  value,
  alert,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  alert?: boolean;
}) {
  return (
    <li className="flex items-center gap-3 py-2">
      <span
        className={cn(
          "flex size-8 items-center justify-center rounded-lg",
          alert ? "bg-warning/15 text-warning" : "bg-secondary text-muted-foreground",
        )}
      >
        {icon}
      </span>
      <span className="flex-1 text-sm">{label}</span>
      <span className="text-lg font-semibold tabular-nums">{value}</span>
    </li>
  );
}

/** ¿Qué requiere mi atención ahora? — GET /inbox/counts. */
export function AttentionPanel({ section }: { section: Section<InboxCountsDTO> }) {
  const action = (
    <Link
      href="/workspace/inbox"
      className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
    >
      Ir al inbox <ArrowRight aria-hidden className="size-3.5" />
    </Link>
  );

  if (section.status === "loading" || section.status === "idle") {
    return (
      <DashboardCard title="Requiere tu atención">
        <div className="h-32 animate-pulse rounded-xl bg-secondary" role="status" aria-label="Cargando" />
      </DashboardCard>
    );
  }
  if (section.status === "error" || section.data === null) {
    return (
      <DashboardCard title="Requiere tu atención">
        <p className="text-sm text-muted-foreground">
          {section.error ?? "No se pudo cargar el inbox."}
        </p>
      </DashboardCard>
    );
  }

  const counts = section.data;
  return (
    <DashboardCard title="Requiere tu atención" action={action}>
      <ul className="divide-y divide-border">
        <Row
          icon={<MailQuestion aria-hidden className="size-4" />}
          label="En cola esperando"
          value={counts.queued}
          alert={counts.queued > 0}
        />
        <Row icon={<UserCheck aria-hidden className="size-4" />} label="Asignadas a ti" value={counts.mine} />
        <Row icon={<Inbox aria-hidden className="size-4" />} label="Sin leer" value={counts.unread_total} />
      </ul>
    </DashboardCard>
  );
}
