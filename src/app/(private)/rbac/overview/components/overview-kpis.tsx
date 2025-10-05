"use client"

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { RbacOverviewSummary } from "../../model";
import { Users2, LayoutDashboard, ShieldUser, Plus, ArrowRight } from "lucide-react";

export function OverviewKpis({ summary }: { summary: RbacOverviewSummary }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <KpiCard label="Roles" value={summary.roles_count} icon={<ShieldUser />} />
      <KpiCard label="Módulos" value={summary.modules_count} icon={<LayoutDashboard />} />
      <KpiCard label="Usuarios" value={summary.users_count} icon={<Users2 />} disabled />
    </div>
  )
}

function KpiCard({ label, value, icon, disabled }: { label: string; value: number; icon: React.ReactNode; disabled?: boolean }) {
  const router = useRouter();

  const handlerCreateClick = () => {
    label.toLowerCase() === "roles" ? router.push(`/rbac/roles/create`) : router.push(`/rbac/modules/create`)
  }

  const handlerViewMoreClick = () => {
    label.toLowerCase() === "roles" ? router.push(`/rbac/roles`) : router.push(`/rbac/modules`)
  }
  
  return (
    <div className="rounded-lg border border-border-soft p-4 bg-background/40">
      <div className="flex items-center gap-2">
        <div className="rounded-lg bg-brand-gradient text-white p-2">
          {icon}
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-2xl font-semibold">{value}</div>
        </div>
      </div>

      <hr className="my-2 border-border-soft" />

      <div className="flex items-center gap-2">
        <Button 
          size="sm"
          variant="default" 
          onClick={handlerCreateClick}
          style={{ borderRadius: "9999px" }}
          disabled={disabled}
        >
          <Plus className="h-4 w-4" />
          Crear {label}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto"
          onClick={handlerViewMoreClick}
        >
          Ver más
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}