"use client";

import { useCallback, useEffect, useState } from "react";
import { MapPin, Plus } from "lucide-react";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { EmptyState } from "@/shared/components/features/empty-state";
import { sortBranches, type BranchDTO } from "@/modules/companies/domain/branch";
import { useMyCompany } from "@/modules/companies/infrastructure/hooks/use-my-company";
import {
  deleteBranch,
  listBranches,
} from "@/modules/companies/infrastructure/services/branches-service.adapter";
import {
  branchFromCompanyAddress,
  branchToFormValues,
  defaultBranchValues,
  type BranchFormValues,
} from "@/modules/companies/ui/forms/config/branch.config";
import { BranchCard } from "./BranchCard";
import { BranchFormSheet } from "./BranchFormSheet";

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; branches: BranchDTO[] }
  | { kind: "error"; message: string };

/**
 * Pestaña «Sucursales» de Mi empresa (`/companies/me/branches`). Autosuficiente
 * y con estado local (§9). Con cero sedes la IA usa la dirección general; el
 * vacío ofrece crear la principal desde esa dirección.
 */
export function BranchesTab() {
  const { company } = useMyCompany();
  const { showAlert, showModal, closeModal } = useAlert();
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [sheet, setSheet] = useState<{ branch: BranchDTO | null; values: BranchFormValues } | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await listBranches();
      setState({ kind: "ready", branches: sortBranches(data) });
    } catch (error) {
      setState({ kind: "error", message: errorMessage(error, "No se pudieron cargar las sucursales") });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const count = state.kind === "ready" ? state.branches.length : 0;
  const openCreate = () => setSheet({ branch: null, values: defaultBranchValues(count === 0) });
  const openFromCompany = () =>
    setSheet({ branch: null, values: branchFromCompanyAddress(company ?? { address: null, city: null }) });
  const openEdit = (branch: BranchDTO) => setSheet({ branch, values: branchToFormValues(branch) });

  const handleDelete = (branch: BranchDTO) => {
    showModal({
      title: "Eliminar sucursal",
      description: `“${branch.name}” dejará de existir para la IA y para el cliente. Su horario propio se borra con ella.`,
      actions: [
        { label: "Cancelar", variant: "outline", asClose: true, id: "branch-del-cancel" },
        {
          label: "Eliminar",
          variant: "destructive",
          asClose: false,
          id: "branch-del-confirm",
          onClick: () => {
            deleteBranch(branch.id)
              .then(() => {
                setState((prev) =>
                  prev.kind === "ready" ? { kind: "ready", branches: prev.branches.filter((b) => b.id !== branch.id) } : prev,
                );
                showAlert({ tone: "success", title: "Sucursal eliminada", open: true });
              })
              .catch((error: unknown) =>
                showAlert({ tone: "error", title: errorMessage(error, "No se pudo eliminar"), open: true }),
              )
              .finally(() => closeModal());
          },
        },
      ],
      className: "sm:max-w-md",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Sucursales</h2>
          <p className="text-sm text-muted-foreground">
            Direcciones, indicaciones y horario de cada sede. La IA responde «dónde están» y «cómo llego» con esto.
          </p>
        </div>
        <Button type="button" className="rounded-full" onClick={openCreate}>
          <Plus className="size-4" aria-hidden />
          Agregar sucursal
        </Button>
      </div>

      {state.kind === "loading" ? (
        <div className="space-y-3" role="status" aria-busy="true" aria-label="Cargando sucursales">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      ) : state.kind === "error" ? (
        <p role="alert" className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          {state.message}
        </p>
      ) : state.branches.length === 0 ? (
        <EmptyState
          icon={MapPin}
          accent="violet"
          title="Aún no hay sucursales"
          description="Hoy la IA usa la dirección general de la empresa. Crea la primera sede para darle indicaciones, horario propio y un pin de mapa que puede enviar por WhatsApp."
          action={
            company?.address ? (
              <Button type="button" variant="outline" className="rounded-full" onClick={openFromCompany}>
                Crear sede principal desde la dirección de la empresa
              </Button>
            ) : (
              <Button type="button" variant="outline" className="rounded-full" onClick={openCreate}>
                Agregar sucursal
              </Button>
            )
          }
        />
      ) : (
        <div className="grid gap-3">
          {state.branches.map((branch) => (
            <BranchCard key={branch.id} branch={branch} onEdit={openEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {sheet ? (
        <BranchFormSheet
          key={sheet.branch?.id ?? "new"}
          open
          branch={sheet.branch}
          initialValues={sheet.values}
          countryCode={company?.country_code ?? "CO"}
          onOpenChange={(open) => {
            if (!open) setSheet(null);
          }}
          onSaved={() => void load()}
        />
      ) : null}
    </div>
  );
}
