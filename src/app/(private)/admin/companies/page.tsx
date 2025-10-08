"use client"

import { Plus } from "lucide-react";
import { CompanyForm } from "./components/form";
import type { CompanyRow } from "./model";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { buildListParams } from "@/shared/query";
import { useEffect, useRef, useState } from "react";
import { CompanyContextMenuItems } from "./components/table/table.actions";
import { DataTable, type DataTableRef } from "@/components/features/data-table";
import { companyColumns, companyData, fetchCompanies } from "./components/table/table.config";
import { FloatingAlert, type FloatingAlertConfig } from "@/components/ui/floating-alert";

export default function CompaniesPage() {
  const pageSize = 3;
  const tableRef = useRef<DataTableRef>(null)
  const [modalOpen, setModalOpen] = useState(false);
  const [searchValue, setSearchValue] = useState<string>("");
  const [rows, setRows] = useState<CompanyRow[]>(companyData);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [total, setTotal] = useState<number | undefined>(undefined);
  const [sortBy, setSortBy] = useState<keyof CompanyRow | undefined>();
  const [searchField, setSearchField] = useState<keyof CompanyRow>("name");

  async function load(
    p?: number,
    by = sortBy,
    dir: "asc" | "desc" = sortDir,
    field = searchField,
    value = searchValue
  ) {
    const current = p ?? tableRef.current?.getCurrentPage() ?? 1
    try {
      const params = buildListParams<keyof CompanyRow & string>({
        page: current,
        pageSize,
        sortBy: by as string | undefined,
        sortDir: dir,
        searchField: field as keyof CompanyRow & string,
        searchValue: value,
        extra: { view: "summary" },
      })
      const { rows, total: totalFromServer } = await fetchCompanies(params);
      setRows(rows);
      setTotal(totalFromServer);
    } catch {
      const local = [...companyData];
      if (by) local.sort((a, b) => String(a[by as keyof CompanyRow] ?? "").localeCompare(String(b[by as keyof CompanyRow] ?? "")) * (dir === "asc" ? 1 : -1));
      const filtered = value && field ? local.filter((r) => String((r as any)[field] ?? "").toLowerCase().includes(String(value).toLowerCase())) : local
      setRows(filtered.slice((current - 1) * pageSize, current * pageSize));
      setTotal((value && field ? filtered.length : companyData.length));
    }
  }

  const handleSortChange = async (by: keyof CompanyRow, dir: "asc" | "desc") => {
    setSortBy(by); setSortDir(dir);
    await load(tableRef.current?.getCurrentPage(), by, dir);
  };

  const handleSearchChange = async ({ field, value }: { field: keyof CompanyRow; value: string }) => {
    setSearchField(field);
    setSearchValue(value);
    await load(1, sortBy, sortDir, field, value);
    tableRef.current?.goToPage(1)
  };

  useEffect(() => { load(1); tableRef.current?.goToPage(1) }, []);

  // useEffect(() => {
  //   let cancelled = false;

  //   async function fetchAndMaybeOpen() {
  //     // Simula un servicio (reemplaza por tu llamada real)
  //     await new Promise((r) => setTimeout(r, 800));
  //     if (!cancelled) {
  //       setModalOpen(true); // abre la modal al terminar
  //     }
  //   }

  //   fetchAndMaybeOpen();
  //   return () => { cancelled = true; };
  // }, []);

  // const [step, setStep] = useState(0);
  // const steps = [
  //   { id: "company-info", title: "Empresa" },
  //   { id: "company-contacts", title: "Usuario" },
  //   { id: "company-users", title: "Agentes" },
  // ];

  // const [progress, setProgress] = useState((step / steps.length) * 100);
  const [alertOpen, setAlertOpen] = useState(false);
  const [formDefaults, setFormDefaults] = useState<any | null>(null);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [alertConfig, setAlertConfig] = useState<FloatingAlertConfig | null>(null);

  const onModalSubmitClick = () => {
    const form = document.getElementById("company-form") as HTMLFormElement | null
    form?.requestSubmit()
  }
  
  const setAlert = (cfg: { variant: "default" | "destructive" | "success"; title: string; description?: string }) => {
    setAlertConfig(cfg)
    setAlertOpen(true)
  }

  useEffect(() => {
    const onDeleteSuccess = async (e: Event) => {
      const detail = (e as CustomEvent).detail as { id: string | number; message?: string }
      setAlert({ variant: "success", title: detail?.message || "Empresa eliminada correctamente" })
      const current = tableRef.current?.getCurrentPage() ?? 1
      await load(current)
    }

    const onError = (e: Event) => {
      const detail = (e as CustomEvent).detail as { message?: string; status?: number }
      setAlert({
        variant: "destructive",
        title: detail?.message || "No se pudo eliminar la empresa",
        description: detail?.status ? `Código: ${detail.status}` : undefined,
      })
    }
    
    window.addEventListener("companies:delete:success", onDeleteSuccess)
    window.addEventListener("companies:error", onError)

    const onEditOpen = (e: Event) => {
      const { defaults } = (e as CustomEvent).detail as { defaults: any }
      setFormMode("edit")
      setFormDefaults(defaults)
      setModalOpen(true)
    }

    window.addEventListener("companies:edit:open", onEditOpen)
    return () => {
      window.removeEventListener("companies:delete:success", onDeleteSuccess)
      window.removeEventListener("companies:error", onError)
      window.removeEventListener("companies:edit:open", onEditOpen);
    }
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Empresas</h1>
        </div>

        <p className="text-sm text-muted-foreground">
          Aquí puedes crear y gestionar las empresas que deseas promocionar.
        </p>
        <Button style={{ borderRadius: "9999px" }} variant="default" onClick={() => { setFormMode("create"); setFormDefaults(null); setModalOpen(true); }}>
          <Plus className="h-4 w-4" />
          Crear empresa
        </Button>
      </div>

      <div className="rounded-xl border border-border-soft glass shadow-sm p-4 md:p-6">
        <DataTable
          data={rows}
          ref={tableRef}
          searchTrigger="submit"
          columns={companyColumns}
          rowContextMenu={({ row }) => (
            <CompanyContextMenuItems
              company={row}
              onDeleteClick={() => window.dispatchEvent(new CustomEvent("companies:delete:open", { detail: { company: row } }))}
              onEditClick={() => window.dispatchEvent(new CustomEvent("companies:edit:open", { detail: { defaults: row } }))}
              onViewClick={() => window.dispatchEvent(new CustomEvent("companies:view:open", { detail: { defaults: row } }))}
            />
          )}
          onSortChange={handleSortChange}
          onPageChange={(p) => { load(p); }}
          onSearchChange={handleSearchChange}
          pagination={{ pageSize, total }}
          search={{ field: searchField, value: searchValue }}
          sorting={{ by: sortBy as keyof CompanyRow, dir: sortDir }}
        />

        <FloatingAlert
          open={alertOpen}
          onOpenChange={setAlertOpen}
          config={{
            variant: alertConfig?.variant ?? "default",
            title: alertConfig?.title ?? "",
            description: alertConfig?.description,
            durationMs: 4000,
          }}
        />
      </div>

      {/* Formulario de Entidad Única (COMPANY-FORM) */}
      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        config={{
          title: formMode === "edit" ? "Editar Empresa" : "Crear perfil de Empresa",
          description: formMode === "edit"
            ? "Actualiza la información de la empresa y guarda los cambios"
            : "Entre más completa sea la información, mejores serán las recomendaciones y el performance de las campañas",
          // trigger: <Button variant="outline">Open Dialog</Button>,
          actions: [
            { label: "Cancelar", variant: "outline", asClose: true, id: "company-cancel" },
            { label: formMode === "edit" ? "Guardar cambios" : "Guardar", variant: "default", asClose: false, onClick: onModalSubmitClick, id: "company-save" },
          ],
        }}
      >
        <CompanyForm
          host={{
            setAlert,
            defaultValues: formDefaults ?? undefined,
            refresh: () => load(tableRef.current?.getCurrentPage()),
            closeModal: () => setModalOpen(false),
          }}
        />
      </Modal>
    </div>
  );
}

        // {/* Progress bar */}
        // <div className="flex flex-col gap-2">
        //   <div className="flex justify-between">
        //     <span className="text-sm font-medium">
        //       Paso {step + 1} de {steps.length}
        //     </span>
        //     <span className="text-sm font-medium">
        //       {Math.round(progress)}%
        //     </span>
        //   </div>
        //   <Progress value={progress} className="h-2" />
        // </div>

        // {/* Step indicators */}
        // <div className="mb-8 flex justify-between">
        //   {steps.map((s, i) => (
        //     <div key={s.id} className="flex flex-col items-center">
        //       <div
        //         className={cn(
        //           'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold',
        //           i < step
        //             ? 'bg-primary text-primary-foreground'
        //             : i === step
        //               ? 'bg-primary text-primary-foreground ring-primary/30 ring-2'
        //               : 'bg-secondary text-secondary-foreground',
        //         )}
        //       >
        //         {i < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
        //       </div>
        //       <span className="mt-1 hidden text-xs sm:block">{s.title}</span>
        //     </div>
        //   ))}
        // </div>